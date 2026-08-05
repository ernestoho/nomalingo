/**
 * Boot gate.
 *
 * Four states, in priority order:
 *   1. Still restoring   → render nothing (the splash is still up)
 *   2. No account        → welcome
 *   3. Account, no profile → finish the six onboarding steps
 *   4. Otherwise         → the app
 *
 * Rendering nothing rather than a spinner while restoring is deliberate: the
 * native splash is still on screen, so a spinner would appear for one frame
 * between splash and content and read as a flicker.
 */

import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';
import { color } from '../theme/tokens';

export default function Boot() {
  const { ready: storeReady, onboarded } = useStore();
  const { ready: authReady, user } = useAuth();
  const { ready: langReady } = useLang();

  if (!storeReady || !authReady || !langReady) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  if (!user) return <Redirect href="/(onboarding)/welcome" />;

  /**
   * Either source counts.
   *
   * The account record is authoritative for a returning user, and local state
   * is authoritative for someone who just finished the steps but whose profile
   * write is still in the outbox. Trusting only the local flag sent a fully
   * onboarded member back through all six steps when local state had not
   * rehydrated yet — which, having already answered them once, reads as the
   * app having forgotten them.
   */
  const isOnboarded = onboarded || user.onboarded;
  if (!isOnboarded) return <Redirect href="/(onboarding)/steps" />;

  return <Redirect href="/(tabs)" />;
}
