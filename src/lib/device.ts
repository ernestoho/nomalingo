/**
 * Native capability wrappers.
 *
 * Every one of these is guarded so the web build keeps working and so a denied
 * permission is an outcome the caller handles, never a crash.
 *
 * Permission philosophy applied throughout: nothing here is called on mount.
 * A cold denial on iOS costs the feature permanently, so the UI always earns
 * the prompt with an explicit tap first.
 */

import { Platform, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { nearestArea } from './match';
import type { AreaName } from '../data/types';

export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

/* ---------------- photos ---------------- */

export type PickResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'denied' | 'cancelled' | 'error' };

/**
 * Pick an avatar and normalise it: square crop, 320px, JPEG q0.8.
 * Downscaling here rather than at render time keeps stored profiles small —
 * an unprocessed modern phone photo is several megabytes.
 */
export async function pickAvatar(): Promise<PickResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (res.canceled || !res.assets?.length) return { ok: false, reason: 'cancelled' };

    const src = res.assets[0].uri;
    const ctx = ImageManipulator.ImageManipulator.manipulate(src).resize({ width: 320 });
    const image = await ctx.renderAsync();
    const out = await image.saveAsync({
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { ok: true, uri: out.uri };
  } catch (e) {
    console.warn('[device] pickAvatar failed', e);
    return { ok: false, reason: 'error' };
  }
}

/* ---------------- location ---------------- */

export type AreaResult =
  | { ok: true; area: AreaName; km: number }
  | { ok: false; reason: 'denied' | 'unavailable' };

/** Single foreground fix, mapped to the nearest known Punta Cana zone. */
export async function detectArea(): Promise<AreaResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { area, km } = nearestArea(pos.coords.latitude, pos.coords.longitude);
    return { ok: true, area, km };
  } catch (e) {
    console.warn('[device] detectArea failed', e);
    return { ok: false, reason: 'unavailable' };
  }
}

/* ---------------- notifications ---------------- */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type ReminderResult =
  | { ok: true; id: string; at: Date }
  | { ok: false; reason: 'denied' | 'past' | 'unsupported' | 'error' };

/**
 * Local reminder two hours before a meetup. Two hours is the window where a
 * reminder is still actionable in Punta Cana traffic — thirty minutes is a
 * notification about something you are already late for.
 */
export async function scheduleMeetupReminder(
  title: string,
  body: string,
  startsAtIso: string,
): Promise<ReminderResult> {
  if (!isNative) return { ok: false, reason: 'unsupported' };
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const at = new Date(new Date(startsAtIso).getTime() - 2 * 60 * 60 * 1000);
    if (at.getTime() <= Date.now() + 60_000) return { ok: false, reason: 'past' };

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    });
    return { ok: true, id, at };
  } catch (e) {
    console.warn('[device] scheduleMeetupReminder failed', e);
    return { ok: false, reason: 'error' };
  }
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* already gone */
  }
}

/* ---------------- share ---------------- */

export async function shareText(message: string, title?: string): Promise<boolean> {
  try {
    if (isWeb) {
      const nav = globalThis.navigator as Navigator & {
        share?: (d: { text: string; title?: string }) => Promise<void>;
      };
      if (nav?.share) {
        await nav.share({ text: message, title });
        return true;
      }
      await globalThis.navigator?.clipboard?.writeText(message);
      return true;
    }
    await Share.share({ message, title });
    return true;
  } catch {
    return false;
  }
}

export async function canShareFiles(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}
