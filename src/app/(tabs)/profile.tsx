/**
 * Profile screen — the current user's own card.
 *
 * Shows real data from the store, not a persona. Editing routes to /edit-profile;
 * settings row routes to /settings.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import {
  Screen,
  Row,
  Spacer,
  Divider,
  Txt,
  PressableScale,
  Button,
  Card,
  Chip,
  Tag,
  Avatar,
  LevelDots,
  Stat,
} from '../../components/ui';
import {
  PinIcon,
  VerifiedIcon,
  ShareIcon,
  SlidersIcon,
  ChevronRight,
} from '../../components/icons';
import { color, palette, radius, space, type, font, shadow } from '../../theme/tokens';
import { useT, useLang, formatLongDate, formatNumber } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { shareText } from '../../lib/device';
import {
  langLabel,
  langFlag,
  levelDots,
  levelLabel,
  interestLabel,
  interestEmoji,
  availLabel,
  MEET_PREFS,
} from '../../data/reference';
import { HERO_PHOTO } from '../../data/photos';

const COVER_HEIGHT = 120;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NL';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function profileIsComplete(profile: ReturnType<typeof useStore>['profile']): boolean {
  return (
    profile.name.trim().length > 0 &&
    (profile.learning ?? []).length > 0 &&
    (profile.interests ?? []).length >= 2
  );
}

export default function ProfileScreen() {
  const t = useT();
  const { lang } = useLang();
  const { profile, rsvps, phrases, chatPartnerIds } = useStore();

  const hasName = profile.name.trim().length > 0;

  const verified = profileIsComplete(profile);

  const avatarInitials = hasName ? initials(profile.name) : 'NL';
  const avatarTint = palette.teal;

  const meetPrefLabel = MEET_PREFS.find((m) => m.key === profile.meetPref)?.label ?? { es: '', en: '' };

  function handleShare() {
    const name = profile.name || t({ es: 'un miembro', en: 'a member' });
    shareText(
      t({
        es: `¡Mira el perfil de ${name} en NómadaLingo! Dos idiomas. Un coro. Descarga la app y conecta con hablantes en Punta Cana.`,
        en: `Check out ${name}'s profile on NómadaLingo! Dos idiomas. Un coro. Download the app and connect with speakers in Punta Cana.`,
      }),
      'NómadaLingo',
    );
  }

  if (!hasName) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={{ padding: space.base, paddingBottom: space.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <Spacer h={space.xl} />
          <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <Avatar seed="NL" tint={avatarTint} size={80} />
            <Spacer h={space.base} />
            <Txt variant="h2" style={{ textAlign: 'center' }}>
              {t({ es: '¡Cuéntanos quién eres!', en: "Let's set up your profile!" })}
            </Txt>
            <Spacer h={space.sm} />
            <Txt variant="body" style={{ textAlign: 'center', maxWidth: 280 }}>
              {t({
                es: 'Completa tu perfil pa que la gente sepa qué idiomas manejas y cuándo estás disponible.',
                en: "Complete your profile so people know what languages you speak and when you're free.",
              })}
            </Txt>
            <Spacer h={space.xl} />
            <Button
              label={t({ es: 'Completar perfil', en: 'Complete profile' })}
              onPress={() => router.push('/edit-profile')}
              full={false}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} style={{ backgroundColor: color.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.xxl + 32 }}
      >
        {/* ── Cover ── */}
        <View style={{ height: COVER_HEIGHT, backgroundColor: '#14304F', overflow: 'hidden' }}>
          <Image
            source={HERO_PHOTO}
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
            contentFit="cover"
            transition={220}
          />
          {/* scrim */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(20,48,79,0.52)' },
            ]}
          />
          {/* settings link top right */}
          <PressableScale
            onPress={() => router.push('/settings')}
            style={{
              position: 'absolute',
              top: space.base,
              right: space.base,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersIcon size={18} c="#fff" />
          </PressableScale>
        </View>

        {/* ── Avatar overlap + header info ── */}
        <View style={{ paddingHorizontal: space.base }}>
          {/* avatar sits half out of the cover */}
          <View style={{ marginTop: -(80 / 2), marginBottom: space.md }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 3,
                borderColor: color.bg,
                ...shadow.lifted,
              }}
            >
              <Avatar
                seed={avatarInitials}
                tint={avatarTint}
                size={80}
                photo={profile.photo ?? undefined}
                flag={profile.flag || undefined}
              />
            </View>
          </View>

          {/* Name + verified badge */}
          <Row gap={space.sm} align="center">
            <Txt variant="h1">{profile.name}</Txt>
            {verified && (
              <VerifiedIcon size={20} c={color.accent} />
            )}
          </Row>
          {verified && (
            <Txt variant="caption" c={color.accent} style={{ marginTop: 2 }}>
              {t({ es: 'Perfil completo', en: 'Complete profile' })}
            </Txt>
          )}

          <Spacer h={space.sm} />

          {/* Age, nationality, area */}
          <Row gap={space.base} wrap>
            {profile.age ? (
              <Txt variant="body" c={color.textTertiary}>{profile.age}</Txt>
            ) : null}
            {profile.flag && profile.nationality ? (
              <Txt variant="body" c={color.textTertiary}>
                {profile.flag} {profile.nationality}
              </Txt>
            ) : profile.flag ? (
              <Txt variant="body" c={color.textTertiary}>{profile.flag}</Txt>
            ) : null}
            {profile.area ? (
              <Row gap={4} align="center">
                <PinIcon size={13} c={color.textTertiary} />
                <Txt variant="body" c={color.textTertiary}>{profile.area}</Txt>
              </Row>
            ) : null}
          </Row>

          {/* Visiting until */}
          {profile.kind === 'visitor' && profile.until ? (
            <>
              <Spacer h={space.xs} />
              <Txt variant="caption" c={color.textTertiary}>
                {t({
                  es: `En Punta Cana hasta el ${formatLongDate(profile.until, 'es')}`,
                  en: `In Punta Cana until ${formatLongDate(profile.until, 'en')}`,
                })}
              </Txt>
            </>
          ) : null}
        </View>

        <Spacer h={space.base} />

        {/* ── Stats row ── */}
        <Card style={{ marginHorizontal: space.base }}>
          <Row justify="space-around">
            <Stat
              value={formatNumber(rsvps.length, lang)}
              label={t({ es: 'Encuentros', en: 'Meetups' })}
            />
            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: color.border }} />
            <Stat
              value={formatNumber(phrases.length, lang)}
              label={t({ es: 'Frases', en: 'Phrases' })}
            />
            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: color.border }} />
            <Stat
              value={formatNumber(chatPartnerIds.length, lang)}
              label={t({ es: 'Conversaciones', en: 'Chats' })}
            />
          </Row>
        </Card>

        <Spacer h={space.lg} />

        {/* ── I teach ── */}
        <View style={{ paddingHorizontal: space.base }}>
          <Txt variant="h3" style={{ marginBottom: space.md }}>
            {t({ es: 'Enseño', en: 'I teach' })}
          </Txt>

          {/* Native language */}
          <LangRow
            flag={langFlag(profile.native)}
            name={langLabel(profile.native, lang)}
            levelDotsFilled={5}
            levelText={t({ es: 'Nativo', en: 'Native' })}
          />

          {/* Extra languages */}
          {(profile.extra ?? []).map((ls, i) => (
            <LangRow
              key={ls.code + i}
              flag={langFlag(ls.code)}
              name={langLabel(ls.code, lang)}
              levelDotsFilled={levelDots(ls.level)}
              levelText={levelLabel(ls.level, lang)}
            />
          ))}

          <Spacer h={space.lg} />

          {/* ── I'm learning ── */}
          <Txt variant="h3" style={{ marginBottom: space.md }}>
            {t({ es: 'Aprendo', en: "I'm learning" })}
          </Txt>

          {(profile.learning ?? []).length === 0 ? (
            <Txt variant="body" c={color.textTertiary}>
              {t({ es: 'Sin idiomas aún', en: 'No languages yet' })}
            </Txt>
          ) : (
            (profile.learning ?? []).map((ls, i) => (
              <LangRow
                key={ls.code + i}
                flag={langFlag(ls.code)}
                name={langLabel(ls.code, lang)}
                levelDotsFilled={levelDots(ls.level)}
                levelText={levelLabel(ls.level, lang)}
              />
            ))
          )}
        </View>

        <Spacer h={space.lg} />

        {/* ── Interests ── */}
        {(profile.interests ?? []).length > 0 && (
          <View style={{ paddingHorizontal: space.base }}>
            <Txt variant="h3" style={{ marginBottom: space.md }}>
              {t({ es: 'Intereses', en: 'Interests' })}
            </Txt>
            <Row wrap gap={space.sm}>
              {(profile.interests ?? []).map((key) => (
                <Chip
                  key={key}
                  label={interestLabel(key, lang)}
                  emoji={interestEmoji(key)}
                />
              ))}
            </Row>
          </View>
        )}

        <Spacer h={space.lg} />

        {/* ── Availability ── */}
        {(profile.availability ?? []).length > 0 && (
          <View style={{ paddingHorizontal: space.base }}>
            <Txt variant="h3" style={{ marginBottom: space.md }}>
              {t({ es: 'Disponibilidad', en: 'Availability' })}
            </Txt>
            <Row wrap gap={space.sm}>
              {(profile.availability ?? []).map((key) => (
                <Tag key={key} label={availLabel(key, lang)} />
              ))}
            </Row>
          </View>
        )}

        {/* Meet pref */}
        {profile.meetPref && (
          <View style={{ paddingHorizontal: space.base, marginTop: space.sm }}>
            <Tag label={t(meetPrefLabel)} tone="accent" />
          </View>
        )}

        <Spacer h={space.lg} />

        {/* ── Bio ── */}
        {profile.bio ? (
          <View style={{ paddingHorizontal: space.base }}>
            <Txt variant="h3" style={{ marginBottom: space.md }}>
              {t({ es: 'Bio', en: 'Bio' })}
            </Txt>
            <Txt variant="body">{profile.bio}</Txt>
            <Spacer h={space.lg} />
          </View>
        ) : null}

        {/* ── Actions ── */}
        <View style={{ paddingHorizontal: space.base, gap: space.md }}>
          <Button
            label={t({ es: 'Editar perfil', en: 'Edit profile' })}
            onPress={() => router.push('/edit-profile')}
            variant="primary"
          />
          <Button
            label={t({ es: 'Compartir', en: 'Share' })}
            onPress={handleShare}
            variant="secondary"
            icon={<ShareIcon size={18} c={color.textPrimary} />}
          />
        </View>

        <Spacer h={space.lg} />

        {/* ── Settings link ── */}
        <PressableScale
          onPress={() => router.push('/settings')}
          style={{
            marginHorizontal: space.base,
            backgroundColor: color.surface,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: color.border,
            ...shadow.card,
          }}
        >
          <Row
            justify="space-between"
            style={{ paddingHorizontal: space.base, paddingVertical: space.md }}
          >
            <Txt variant="bodyStrong">
              {t({ es: 'Configuración y seguridad', en: 'Settings & safety' })}
            </Txt>
            <ChevronRight size={18} c={color.textTertiary} />
          </Row>
        </PressableScale>
      </ScrollView>
    </Screen>
  );
}

function LangRow({
  flag,
  name,
  levelDotsFilled,
  levelText,
}: {
  flag: string;
  name: string;
  levelDotsFilled: number;
  levelText: string;
}) {
  return (
    <Row style={{ marginBottom: space.sm }} justify="space-between">
      <Row gap={space.sm}>
        <Txt style={{ fontSize: 20 }}>{flag}</Txt>
        <Txt variant="bodyStrong">{name}</Txt>
      </Row>
      <Row gap={space.sm} align="center">
        <LevelDots filled={levelDotsFilled} />
        <Txt variant="caption" c={color.textTertiary}>{levelText}</Txt>
      </Row>
    </Row>
  );
}

