/**
 * Root layout: fonts, providers, and the splash hold.
 *
 * The splash is held until the brand faces are actually loaded. NómadaLingo is
 * a Spanish-first product whose logo depends on a well-drawn ó — flashing the
 * system fallback for even one frame is the most visible possible way to get
 * the brand wrong.
 */

import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  BricolageGrotesque_700Bold,
  useFonts as useBricolage,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts as useJakarta,
} from '@expo-google-fonts/plus-jakarta-sans';

import { LangProvider } from '../lib/i18n';
import { StoreProvider } from '../lib/store';
import { AuthProvider } from '../lib/auth';
import { ContentSyncProvider } from '../lib/content-sync';
import { color } from '../theme/tokens';
import { SyncBar } from '../components/SyncBar';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [bricolageLoaded] = useBricolage({ BricolageGrotesque_700Bold });
  const [jakartaLoaded] = useJakarta({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const ready = bricolageLoaded && jakartaLoaded;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <LangProvider>
            {/*
              Order is load-bearing: AuthProvider owns the session token,
              ContentSyncProvider fetches with it, and StoreProvider reads from
              both. Nesting them the other way around would leave the store
              reading a session that does not exist yet.
            */}
            <AuthProvider>
            <ContentSyncProvider>
            <StoreProvider>
              <View style={{ flex: 1, backgroundColor: color.bg }}>
                <StatusBar style="dark" />
                {/* Only renders when offline or when writes are queued. */}
                <SyncBar />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: color.bg },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(onboarding)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="create-meetup"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen
                    name="checkout"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen
                    name="scan"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen
                    name="mock-pay"
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="(admin)" />
                </Stack>
              </View>
            </StoreProvider>
            </ContentSyncProvider>
            </AuthProvider>
          </LangProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
