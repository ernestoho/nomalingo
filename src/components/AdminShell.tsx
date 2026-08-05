/**
 * AdminShell — shared chrome for all admin screens.
 *
 * Responsibilities:
 *   - Auth guard: skeletons while loading, calm access-denied state if not admin.
 *   - Responsive layout: narrow phone column, 900px-capped centre on wide screens.
 *   - Navigation: segmented nav across five sections + back-to-app link.
 *   - Error / offline states.
 */

import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  EmptyState,
  PressableScale,
  Row,
  Skeleton,
  Spacer,
  Txt,
} from './ui';
import { HomeIcon } from './icons';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { color, font, radius, shadow, space } from '../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type AdminSection = 'index' | 'venues' | 'meetups' | 'events' | 'users';

type Props = {
  children: React.ReactNode;
  active: AdminSection;
};

/* ------------------------------------------------------------------ */
/*  Nav config                                                          */
/* ------------------------------------------------------------------ */

const NAV: { key: AdminSection; es: string; en: string; route: string }[] = [
  { key: 'index',   es: 'Resumen',   en: 'Overview', route: '/(admin)/' },
  { key: 'venues',  es: 'Lugares',   en: 'Venues',   route: '/(admin)/venues' },
  { key: 'meetups', es: 'Encuentros',en: 'Meetups',  route: '/(admin)/meetups' },
  { key: 'events',  es: 'Eventos',   en: 'Events',   route: '/(admin)/events' },
  { key: 'users',   es: 'Miembros',  en: 'Members',  route: '/(admin)/users' },
];

/* ------------------------------------------------------------------ */
/*  Loading state — skeletons shaped like the header + nav              */
/* ------------------------------------------------------------------ */

function AdminLoadingSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Skeleton width={120} height={22} radius={8} />
        <Skeleton width={80} height={32} radius={radius.pill} />
      </View>
      <View style={{ paddingHorizontal: space.base }}>
        <Skeleton width="100%" height={46} radius={radius.md} />
        <Spacer h={space.lg} />
        <Skeleton width="100%" height={88} radius={radius.md} />
        <Spacer h={space.md} />
        <Skeleton width="100%" height={88} radius={radius.md} />
        <Spacer h={space.md} />
        <Skeleton width="100%" height={88} radius={radius.md} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Access-denied state                                                 */
/* ------------------------------------------------------------------ */

function AdminAccessDenied() {
  const t = useT();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <EmptyState
        emoji="🔒"
        title={t({ es: 'Sin acceso', en: 'No access' })}
        body={t({
          es: 'No tienes acceso al panel de administración.',
          en: 'You do not have access to the admin panel.',
        })}
        actionLabel={t({ es: 'Volver a la app', en: 'Back to app' })}
        onAction={() => router.replace('/(tabs)')}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav item                                                            */
/* ------------------------------------------------------------------ */

function NavItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.navItem,
        active && styles.navItemActive,
      ]}
      scaleTo={0.97}
    >
      <Txt
        variant="label"
        style={[
          styles.navLabel,
          active && styles.navLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Txt>
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ */
/*  Main shell                                                          */
/* ------------------------------------------------------------------ */

export default function AdminShell({ children, active }: Props) {
  const { ready, user, isAdmin } = useAuth();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isWide = width >= 720;
  const maxWidth = 900;

  /* --- loading --- */
  if (!ready) return <AdminLoadingSkeleton />;

  /* --- access guard --- */
  if (!user || !isAdmin) return <AdminAccessDenied />;

  /* --- authorised --- */
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {/* Top header */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: insets.top + space.sm },
        ]}
      >
        <View style={[styles.headerInner, isWide && { maxWidth, alignSelf: 'center', width: '100%' }]}>
          <Row gap={space.sm} align="center">
            <Txt variant="h3" style={{ color: color.accent }}>
              {t({ es: 'Admin', en: 'Admin' })}
            </Txt>
            <Txt variant="caption" style={{ color: color.textTertiary }}>
              {'NómadaLingo'}
            </Txt>
          </Row>
          <PressableScale
            onPress={() => router.replace('/(tabs)')}
            style={styles.backToApp}
            hitSlop={8}
          >
            <HomeIcon size={16} c={color.textSecondary} />
            <Txt variant="caption" c={color.textSecondary}>
              {t({ es: 'App', en: 'App' })}
            </Txt>
          </PressableScale>
        </View>
      </View>

      {/* Segmented nav */}
      <View
        style={[
          styles.navBar,
          { paddingHorizontal: isWide ? 0 : space.base },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.navScroll,
            isWide && { maxWidth, alignSelf: 'center' },
          ]}
        >
          {NAV.map((item) => (
            <NavItem
              key={item.key}
              label={t({ es: item.es, en: item.en })}
              active={active === item.key}
              onPress={() => {
                if (active !== item.key) {
                  router.push(item.route as Parameters<typeof router.push>[0]);
                }
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {isWide ? (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth }}>{children}</View>
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared error / offline banners (exported for screens)              */
/* ------------------------------------------------------------------ */

export function OfflineBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.banner}>
      <Txt variant="caption" c={color.onAccent} style={{ flex: 1 }}>
        {message}
      </Txt>
      <PressableScale onPress={onRetry} hitSlop={8}>
        <Txt variant="label" c={color.onAccent}>
          {t({ es: 'Reintentar', en: 'Retry' })}
        </Txt>
      </PressableScale>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[styles.banner, { backgroundColor: color.highlight }]}>
      <Txt variant="caption" c="#fff">
        {message}
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    paddingBottom: space.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#14304F',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
  },
  backToApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  navBar: {
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    paddingBottom: space.sm,
    paddingTop: space.xs,
  },
  navScroll: {
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.xs,
  },
  navItem: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: color.accentSoft,
  },
  navLabel: {
    color: color.textTertiary,
    fontFamily: font.medium,
    fontSize: 13,
  },
  navLabelActive: {
    color: color.accent,
    fontFamily: font.bold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.base,
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.textSecondary,
  },
});
