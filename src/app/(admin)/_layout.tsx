/**
 * (admin) route group layout.
 *
 * Expo Router wraps every screen in this group with this layout component.
 * The actual chrome (header, nav, guard) is in AdminShell, which each screen
 * composes individually so it can pass its own `active` key.
 *
 * The layout itself is minimal: it suppresses the default stack header
 * (admin screens render their own) and passes through.
 */

import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
  );
}
