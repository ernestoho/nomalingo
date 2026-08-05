/**
 * Bottom tabs.
 *
 * Five destinations, each a noun the user already has a word for. Meetups and
 * venues share a tab because "where can I go this week" is one question, not
 * two — splitting them would make the tab bar wider and the answer harder.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarIcon,
  ChatIcon,
  CompassIcon,
  HomeIcon,
  UserIcon,
} from '../../components/icons';
import { useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { color, font, palette } from '../../theme/tokens';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: -4,
        right: -9,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 4,
        backgroundColor: color.highlight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: font.heavy, fontSize: 10, color: '#fff' }}>
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { chatPartnerIds, isUnread } = useStore();
  const unread = chatPartnerIds.filter(isUnread).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textTertiary,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: color.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: font.medium,
          fontSize: 10.5,
          lineHeight: 13,
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t({ es: 'Inicio', en: 'Home' }),
          tabBarIcon: ({ color: c, focused }) => <HomeIcon c={c as string} filled={focused} size={23} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t({ es: 'Descubrir', en: 'Discover' }),
          tabBarIcon: ({ color: c, focused }) => <CompassIcon c={c as string} filled={focused} size={23} />,
        }}
      />
      <Tabs.Screen
        name="meetups"
        options={{
          title: t({ es: 'Encuentros', en: 'Meetups' }),
          tabBarIcon: ({ color: c, focused }) => <CalendarIcon c={c as string} filled={focused} size={23} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t({ es: 'Bandeja', en: 'Inbox' }),
          tabBarIcon: ({ color: c, focused }) => (
            <View>
              <ChatIcon c={c as string} filled={focused} size={23} />
              <Badge count={unread} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t({ es: 'Perfil', en: 'Profile' }),
          tabBarIcon: ({ color: c, focused }) => <UserIcon c={c as string} filled={focused} size={23} />,
        }}
      />
    </Tabs>
  );
}
