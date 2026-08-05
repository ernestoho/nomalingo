/**
 * Session token storage.
 *
 * On a phone the token goes in the OS keychain via expo-secure-store, which is
 * the only place on the device that is actually protected. SecureStore does
 * not exist on web, so there it falls back to localStorage — worse, but the
 * honest ceiling for a browser, and the token is opaque and server-revocable
 * either way.
 *
 * This module is the only place that knows where the token lives.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'nomadalingo.session';
const isWeb = Platform.OS === 'web';

/** In-memory mirror so hot paths don't hit storage on every request. */
let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    if (isWeb) {
      cached = globalThis.localStorage?.getItem(KEY) ?? null;
    } else {
      cached = await SecureStore.getItemAsync(KEY);
    }
  } catch {
    cached = null;
  }
  return cached;
}

export async function setToken(token: string | null): Promise<void> {
  cached = token;
  try {
    if (isWeb) {
      if (token) globalThis.localStorage?.setItem(KEY, token);
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (token) {
      await SecureStore.setItemAsync(KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch (e) {
    console.warn('[session] token persist failed', e);
  }
}

/** Called on sign-out and on a 401, so a dead token cannot linger. */
export async function clearToken(): Promise<void> {
  await setToken(null);
}
