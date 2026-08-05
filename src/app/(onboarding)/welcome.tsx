/**
 * Welcome screen — the first thing anyone sees.
 *
 * Full-bleed Punta Cana hero photo with a layered dark scrim (three stacked
 * translucent Views that read as a gradient from top to bottom), the NómadaLingo
 * wordmark, headline copy, stats strip, and the two entry points.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Wordmark } from '../../components/Logo';
import { Button, PressableScale, Row, Spacer } from '../../components/ui';
import { font, palette, radius, space } from '../../theme/tokens';
import { formatNumber, useLang, useT } from '../../lib/i18n';
import { HERO_PHOTO } from '../../data/photos';

export default function WelcomeScreen() {
  const router = useRouter();
  const t = useT();
  const { lang, toggle } = useLang();
  const insets = useSafeAreaInsets();

  const membersFormatted = formatNumber(1480, lang);

  return (
    <View style={styles.container}>
      {/* Full-bleed hero photo */}
      {/*
       * expo-image rather than RN's Image: on web, an absolutely-positioned RN
       * Image renders at its intrinsic pixel size instead of stretching, so a
       * 1080x1920 hero showed only its top third — all sky, subject off-screen.
       * expo-image honours contentFit correctly on every platform and fades in
       * instead of popping.
       */}
      <Image
        source={HERO_PHOTO}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover"
        contentPosition="center"
        transition={280}
      />

      {/*
       * Scrim — a real vertical gradient rather than stacked translucent
       * blocks. Stacked blocks leave a visible hard edge exactly where the
       * photo's subject sits, which flattens the picture into grey mush; a
       * gradient keeps the beach readable while still guaranteeing contrast
       * for the headline and buttons below.
       */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(10,26,44,0.42)',
          'rgba(10,26,44,0.10)',
          'rgba(8,22,40,0.55)',
          'rgba(5,16,32,0.94)',
        ]}
        locations={[0, 0.34, 0.62, 0.9]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content layer */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + space.base,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
      >
        {/* Top row: wordmark + language toggle */}
        <Row justify="space-between" align="center">
          <Wordmark size={34} tint={palette.white} pinFill={palette.tealLight} pinEye="rgba(5,16,32,0.6)" />
          <LangToggle lang={lang} onToggle={toggle} />
        </Row>

        {/* Spacer pushes copy to lower half */}
        <View style={{ flex: 1 }} />

        {/* Headline */}
        <Text style={styles.headline}>
          {t({
            es: 'Practica un idioma con gente real en Punta Cana.',
            en: 'Practise a language with real people in Punta Cana.',
          })}
        </Text>

        <Spacer h={space.md} />

        {/* Brand line */}
        <Text style={styles.brandLine}>
          {t({ es: 'Dos idiomas. Un coro.', en: 'Two languages. One crew.' })}
        </Text>

        <Spacer h={space.xl} />

        {/* Stats strip */}
        <Row gap={0} justify="flex-start" align="center" style={styles.statsRow}>
          <StatCell value={membersFormatted} label={t({ es: 'miembros', en: 'members' })} />
          <View style={styles.statDot} />
          <StatCell value="9" label={t({ es: 'zonas', en: 'zones' })} />
          <View style={styles.statDot} />
          <StatCell value="12" label={t({ es: 'encuentros/sem', en: 'meetups/wk' })} />
        </Row>

        <Spacer h={space.xxl} />

        {/* Primary CTA */}
        <Button
          label={t({ es: 'Crear cuenta', en: 'Create account' })}
          onPress={() => router.push('/(onboarding)/auth?mode=signup')}
          variant="primary"
          size="lg"
        />

        <Spacer h={space.md} />

        {/* Ghost CTA — translucent white treatment for legibility over photo */}
        <PressableScale
          onPress={() => router.push('/(onboarding)/auth?mode=login')}
          accessibilityRole="button"
          style={styles.ghostButton}
          quiet
        >
          <Text style={styles.ghostButtonText}>
            {t({ es: 'Ya tengo cuenta', en: 'I already have an account' })}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

function LangToggle({ lang, onToggle }: { lang: 'es' | 'en'; onToggle: () => void }) {
  return (
    <PressableScale
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel="Toggle language"
      quiet
    >
      <View style={styles.langPill}>
        <Text style={[styles.langCode, lang === 'es' && styles.langCodeActive]}>ES</Text>
        <View style={styles.langDivider} />
        <Text style={[styles.langCode, lang === 'en' && styles.langCodeActive]}>EN</Text>
      </View>
    </PressableScale>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    flex: 1,
    paddingHorizontal: space.base,
  },
  headline: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: palette.white,
  },
  brandLine: {
    fontFamily: font.medium,
    fontSize: 15,
    color: '#D4B896',
    letterSpacing: 0.15,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    alignItems: 'center',
    paddingHorizontal: space.base,
  },
  statValue: {
    fontFamily: font.heavy,
    fontSize: 18,
    color: palette.white,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: font.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 1,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  ghostButton: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontFamily: font.bold,
    fontSize: 15.5,
    color: palette.white,
    letterSpacing: 0.1,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    gap: 4,
  },
  langCode: {
    fontFamily: font.bold,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.5,
  },
  langCodeActive: {
    color: palette.white,
  },
  langDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
});
