/**
 * Haptics that cannot break the web build.
 *
 * Every call is guarded and degrades to a no-op. Web has no haptic engine and
 * neither do simulators, so this is genuinely only felt on a real device.
 *
 * The rule that matters more than the API: haptics confirm state changes and
 * decisions. Not navigation, not scrolling, not every tap. Over-triggering
 * reads as noise and gets the whole feature switched off at the OS level.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function guard(fn: () => Promise<void> | void) {
  if (!enabled) return;
  try {
    void fn();
  } catch {
    /* feedback must never throw into a user flow */
  }
}

/** Light tick when the user picks something from a set. */
export const selection = () => guard(() => Haptics.selectionAsync());

/** A small physical event — a chip snapping into place. */
export const light = () =>
  guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** A decision landed — a toggle flipped, an RSVP confirmed. */
export const impact = () =>
  guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Weighty and deliberate — confirming a purchase, deleting something. */
export const heavy = () =>
  guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

export const success = () =>
  guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warning = () =>
  guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const error = () =>
  guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
