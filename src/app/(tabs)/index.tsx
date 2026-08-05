/**
 * Home / Inicio
 *
 * Layout order (as specified):
 *   a) Greeting header
 *   b) Official event hero (most visually dominant element)
 *   c) "Tu semana" activity card
 *   d) Filter chips — filter the ranked list
 *   e) Ranked partner cards (top 4, filtered)
 *   f) Upcoming meetups horizontal rail
 *   g) Partner-venue offer card
 *   h) Credit line
 */

import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import {
  Button,
  Card,
  Chip,
  Disclosure,
  PartnerSkeleton,
  PressableScale,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  Stat,
  Tag,
  Txt,
} from '../../components/ui';
import { BellIcon, PinIcon, UsersIcon } from '../../components/icons';
import { Wordmark } from '../../components/Logo';
import PartnerCard from '../../components/PartnerCard';

import { categoryTint, color, palette, radius, shadow, space } from '../../theme/tokens';
import { formatUsd, useLang, useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { areaDistanceKm, rankPartners } from '../../lib/match';

import { PARTNERS } from '../../data/partners';
import { SPONSOR_VENUES, venueById } from '../../data/venues';
import { OFFICIAL_EVENT } from '../../data/official';
import { venuePhoto } from '../../data/photos';
import { categoryEmoji } from '../../data/reference';
import type { AreaName } from '../../data/types';

/* ─── types ────────────────────────────────────────────────────────────────── */

type FilterChip = 'all' | 'local' | 'visitor' | 'near' | 'free';

/* ─── helpers ───────────────────────────────────────────────────────────────── */

function firstName(name: string): string {
  return name.trim().split(' ')[0] || '';
}

/** Pick a venue from SPONSOR_VENUES deterministically by day-of-month. */
function pickSponsorVenue() {
  const day = new Date().getDate();
  return SPONSOR_VENUES[day % SPONSOR_VENUES.length];
}

/* ─── sub-components ────────────────────────────────────────────────────────── */

function MeetupRailCard({ meetup, onPress }: { meetup: any; onPress: () => void }) {
  const t = useT();
  const venue = venueById(meetup.venueId);
  const tint = categoryTint[meetup.category as string] ?? palette.sand1;

  return (
    <PressableScale
      onPress={onPress}
      style={[
        {
          width: 230,
          borderRadius: radius.lg,
          backgroundColor: tint,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.border,
          padding: space.base,
          marginRight: space.md,
        },
        shadow.card,
      ]}
    >
      <Txt style={{ fontSize: 26, marginBottom: space.xs }}>
        {categoryEmoji(meetup.category)}
      </Txt>
      <Txt variant="bodyStrong" numberOfLines={2} style={{ marginBottom: 4 }}>
        {t({ es: meetup.title.es, en: meetup.title.en })}
      </Txt>
      {venue ? (
        <Row gap={4} align="center" style={{ marginBottom: 4 }}>
          <PinIcon size={11} c={color.textTertiary} />
          <Txt variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {venue.name}
          </Txt>
        </Row>
      ) : null}
      <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.xs }}>
        {t({ es: meetup.when.es, en: meetup.when.en })}
      </Txt>
      <Row gap={4} align="center">
        <UsersIcon size={12} c={color.textTertiary} />
        <Txt variant="micro">
          {meetup.going}/{meetup.capacity}
        </Txt>
      </Row>
    </PressableScale>
  );
}

/* ─── main screen ───────────────────────────────────────────────────────────── */

export default function HomeScreen() {
  const t = useT();
  const { lang } = useLang();
  const store = useStore();
  const {
    ready,
    profile,
    isMember,
    hasTicketFor,
    meetups,
    rsvps,
    phrases,
  } = store;

  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');

  /* ── ranked partners ── */
  const ranked = useMemo(
    () => (ready ? rankPartners(PARTNERS, profile, lang) : []),
    [ready, profile, lang],
  );

  /* ── filter ── */
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return ranked;
    return ranked.filter(({ partner }) => {
      if (activeFilter === 'local') return partner.kind === 'local';
      if (activeFilter === 'visitor')
        return partner.kind === 'visitor' || partner.kind === 'expat';
      if (activeFilter === 'near')
        return areaDistanceKm(partner.area, profile.area as AreaName) <= 9;
      if (activeFilter === 'free') return partner.online;
      return true;
    });
  }, [ranked, activeFilter, profile.area]);

  const topFour = filtered.slice(0, 4);

  /* ── upcoming meetups (next 5 by startsAt) ── */
  const upcomingMeetups = useMemo(
    () =>
      [...meetups]
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
        .slice(0, 5),
    [meetups],
  );

  /* ── official event ── */
  const eventVenue = venueById(OFFICIAL_EVENT.venueId);
  const sold = OFFICIAL_EVENT.sold;
  const capacity = OFFICIAL_EVENT.capacity;
  const soldFraction = sold / capacity;
  const almostFull = soldFraction > 0.8;
  const hasTicket = hasTicketFor(OFFICIAL_EVENT.id);

  /* ── sponsor venue ── */
  const sponsorVenue = pickSponsorVenue();

  /* ── activity stats from real data ── */
  const confirmedRsvps = rsvps.length;
  const savedPhrases = phrases.length;
  const newMatches = ranked.filter((r) => r.score >= 40).length;

  /* ── greeting ── */
  const name = firstName(profile.name);
  const greeting = name
    ? t({ es: `Hola, ${name}`, en: `Hey, ${name}` })
    : t({ es: '¡Hola, bienvenido/a!', en: 'Welcome back!' });

  /* ── filter chips ── */
  const chips: { key: FilterChip; label: string }[] = [
    { key: 'all', label: t({ es: 'Todos', en: 'All' }) },
    { key: 'local', label: t({ es: 'Locales', en: 'Locals' }) },
    { key: 'visitor', label: t({ es: 'Visitantes', en: 'Visitors' }) },
    { key: 'near', label: t({ es: 'Cerca de mí', en: 'Near me' }) },
    { key: 'free', label: t({ es: 'Libres ahora', en: 'Free now' }) },
  ];

  return (
    <Screen edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space.huge + space.xl }}
      >
        {/* ── a) Greeting header ── */}
        <Row
          justify="space-between"
          align="center"
          style={{
            paddingHorizontal: space.base,
            paddingTop: space.lg,
            paddingBottom: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Txt variant="h1">{greeting}</Txt>
            <Row gap={4} align="center" style={{ marginTop: 4 }}>
              <PinIcon size={13} c={color.textTertiary} />
              <Txt variant="caption" c={color.textTertiary}>
                {profile.area}
              </Txt>
            </Row>
          </View>
          <Row gap={space.md} align="center">
            <Wordmark size={18} />
            <PressableScale onPress={() => router.push('/settings')} hitSlop={8}>
              <BellIcon size={22} c={color.textSecondary} />
            </PressableScale>
          </Row>
        </Row>

        {/* ── b) Official Event Hero ── */}
        <View style={{ paddingHorizontal: space.base, marginBottom: space.xl }}>
          <PressableScale
            quiet
            onPress={() => router.push(`/official/${OFFICIAL_EVENT.id}`)}
            style={[
              {
                backgroundColor: palette.ink,
                borderRadius: radius.lg,
                padding: space.xl,
                overflow: 'hidden',
              },
              shadow.lifted,
            ]}
          >
            {/* Decorative teal top accent bar */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                backgroundColor: palette.teal,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
              }}
            />

            {/* Event title */}
            <Row justify="space-between" align="flex-start" style={{ marginBottom: space.md }}>
              <View style={{ flex: 1, marginRight: space.md }}>
                <Txt
                  variant="h2"
                  style={{ color: palette.white, marginBottom: 6 }}
                >
                  {t({ es: OFFICIAL_EVENT.title.es, en: OFFICIAL_EVENT.title.en })}
                </Txt>
                {almostFull ? (
                  <Tag label={t({ es: 'Quedan pocos', en: 'Few left' })} tone="coral" />
                ) : null}
              </View>
              <View
                style={{
                  backgroundColor: palette.gold,
                  borderRadius: radius.sm,
                  paddingHorizontal: space.sm,
                  paddingVertical: 4,
                }}
              >
                <Txt
                  variant="micro"
                  style={{ color: palette.ink, letterSpacing: 0.5 }}
                >
                  OFICIAL
                </Txt>
              </View>
            </Row>

            {/* Venue + when */}
            <Row gap={4} align="center" style={{ marginBottom: 6 }}>
              <PinIcon size={13} c={palette.teal} />
              <Txt variant="caption" style={{ color: palette.tealLight }}>
                {eventVenue?.name ?? OFFICIAL_EVENT.venueId} · {OFFICIAL_EVENT.area}
              </Txt>
            </Row>
            <Txt
              variant="bodyStrong"
              style={{ color: palette.white, marginBottom: space.md }}
            >
              {t({ es: OFFICIAL_EVENT.when.es, en: OFFICIAL_EVENT.when.en })}
            </Txt>

            {/* Price */}
            <Txt variant="caption" style={{ color: palette.sand2, marginBottom: space.md }}>
              {t({
                es: `${formatUsd(OFFICIAL_EVENT.priceUsd)} general · GRATIS para miembros`,
                en: `${formatUsd(OFFICIAL_EVENT.priceUsd)} general · FREE for members`,
              })}
            </Txt>

            {/* Capacity progress */}
            <View style={{ marginBottom: space.base }}>
              <Row justify="space-between" style={{ marginBottom: 6 }}>
                <Txt variant="caption" style={{ color: palette.sand2 }}>
                  {t({
                    es: `${sold} de ${capacity} vendidos`,
                    en: `${sold} of ${capacity} sold`,
                  })}
                </Txt>
                <Txt variant="caption" style={{ color: palette.tealLight }}>
                  {Math.round(soldFraction * 100)}%
                </Txt>
              </Row>
              <ProgressBar value={soldFraction} height={5} />
            </View>

            {/* CTA logic */}
            {hasTicket ? (
              /* Already has ticket */
              <View>
                <Row
                  gap={space.sm}
                  align="center"
                  style={{
                    backgroundColor: 'rgba(42,157,143,0.25)',
                    borderRadius: radius.md,
                    paddingVertical: space.md,
                    paddingHorizontal: space.base,
                    marginBottom: space.sm,
                  }}
                >
                  <Txt style={{ fontSize: 16 }}>✓</Txt>
                  <Txt variant="bodyStrong" style={{ color: palette.tealLight }}>
                    {t({ es: 'Ya tienes tu boleto', en: "You're in" })}
                  </Txt>
                </Row>
                <PressableScale
                  onPress={() => router.push('/wallet')}
                  style={{ alignItems: 'center', paddingTop: 4 }}
                >
                  <Txt variant="caption" style={{ color: palette.teal }}>
                    {t({ es: 'Ver boleto en Billetera', en: 'View ticket in Wallet' })}
                  </Txt>
                </PressableScale>
              </View>
            ) : isMember ? (
              /* Member: reserve free */
              <Button
                label={t({
                  es: 'Reservar mi lugar · gratis',
                  en: 'Reserve my spot · free',
                })}
                onPress={() => router.push(`/checkout?type=ticket&id=${OFFICIAL_EVENT.id}`)}
                variant="primary"
                style={{ backgroundColor: palette.teal }}
              />
            ) : (
              /* Non-member */
              <View>
                <Button
                  label={t({
                    es: `Comprar boleto · ${formatUsd(OFFICIAL_EVENT.priceUsd)}`,
                    en: `Buy ticket · ${formatUsd(OFFICIAL_EVENT.priceUsd)}`,
                  })}
                  onPress={() => router.push(`/checkout?type=ticket&id=${OFFICIAL_EVENT.id}`)}
                  variant="primary"
                  style={{ backgroundColor: palette.teal, marginBottom: space.md }}
                />
                <PressableScale
                  onPress={() => router.push('/membership')}
                  style={{ alignItems: 'center' }}
                >
                  <Txt variant="caption" style={{ color: palette.gold }}>
                    {t({
                      es: 'Hazte miembro y entra gratis',
                      en: 'Become a member and get in free',
                    })}
                  </Txt>
                </PressableScale>
              </View>
            )}
          </PressableScale>
        </View>

        {/* ── c) Tu semana activity card ── */}
        <View style={{ paddingHorizontal: space.base, marginBottom: space.xl }}>
          <Card padded>
            <Txt variant="h3" style={{ marginBottom: space.base }}>
              {t({ es: 'Tu semana', en: 'Your week' })}
            </Txt>
            <Row justify="space-around">
              <Stat
                value={String(confirmedRsvps)}
                label={t({ es: 'Encuentros', en: 'Meetups' })}
              />
              <View
                style={{
                  width: StyleSheet.hairlineWidth,
                  backgroundColor: color.border,
                  alignSelf: 'stretch',
                }}
              />
              <Stat
                value={String(savedPhrases)}
                label={t({ es: 'Frases guardadas', en: 'Phrases saved' })}
              />
              <View
                style={{
                  width: StyleSheet.hairlineWidth,
                  backgroundColor: color.border,
                  alignSelf: 'stretch',
                }}
              />
              <Stat
                value={String(newMatches)}
                label={t({ es: 'Coincidencias', en: 'Matches' })}
              />
            </Row>
          </Card>
        </View>

        {/* ── d) Filter chips ── */}
        <View style={{ marginBottom: space.base }}>
          <ScrollView
            horizontal
            style={{ flexGrow: 0, flexShrink: 0 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space.base, gap: space.sm }}
          >
            {chips.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                selected={activeFilter === chip.key}
                onPress={() => setActiveFilter(chip.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── e) Ranked partner cards ── */}
        <View style={{ paddingHorizontal: space.base, marginBottom: space.xl }}>
          <SectionHeader
            title={t({ es: 'Para ti', en: 'For you' })}
            action={t({ es: 'Ver todos', en: 'See all' })}
            onAction={() => router.push('/(tabs)/discover')}
          />

          {!ready ? (
            <>
              <PartnerSkeleton />
              <PartnerSkeleton />
              <PartnerSkeleton />
            </>
          ) : topFour.length === 0 ? (
            <Card padded>
              <Txt variant="body" c={color.textTertiary} style={{ textAlign: 'center' }}>
                {t({
                  es: 'Ningún coro coincide con ese filtro. Prueba con otro.',
                  en: 'Nobody matches that filter. Try a different one.',
                })}
              </Txt>
            </Card>
          ) : (
            topFour.map((result) => (
              <PartnerCard
                key={result.partner.id}
                result={result}
                onPress={() => router.push(`/chat/${result.partner.id}`)}
              />
            ))
          )}
        </View>

        {/* ── f) Upcoming meetups horizontal rail ── */}
        <View style={{ marginBottom: space.xl }}>
          <SectionHeader
            title={t({ es: 'Próximos encuentros', en: 'Upcoming meetups' })}
            action={t({ es: 'Ver todos', en: 'See all' })}
            onAction={() => router.push('/(tabs)/meetups')}
            style={{ paddingHorizontal: space.base }}
          />
          <ScrollView
            horizontal
            style={{ flexGrow: 0, flexShrink: 0 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space.base }}
          >
            {upcomingMeetups.map((m) => (
              <MeetupRailCard
                key={m.id}
                meetup={m}
                onPress={() => router.push(`/event/${m.id}`)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── g) Partner-venue offer card ── */}
        {sponsorVenue ? (
          <View style={{ paddingHorizontal: space.base, marginBottom: space.lg }}>
            <SectionHeader
              title={t({ es: 'Lugar de la semana', en: 'Venue of the week' })}
            />
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {/* Venue photo */}
              <Image
                source={venuePhoto(sponsorVenue.photoSeed)}
                style={{
                  width: '100%',
                  height: 140,
                }}
                contentFit="cover"
                transition={220}
              />
              <View style={{ padding: space.base }}>
                <Row justify="space-between" align="flex-start" style={{ marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong" numberOfLines={1}>
                      {sponsorVenue.name}
                    </Txt>
                    <Row gap={4} align="center" style={{ marginTop: 3 }}>
                      <PinIcon size={12} c={color.textTertiary} />
                      <Txt variant="caption" c={color.textTertiary}>
                        {sponsorVenue.area}
                      </Txt>
                    </Row>
                  </View>
                </Row>

                {/* Deal */}
                {isMember ? (
                  <View
                    style={{
                      backgroundColor: palette.tealLight,
                      borderRadius: radius.sm,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.md,
                      marginTop: space.sm,
                    }}
                  >
                    <Txt variant="caption" style={{ color: palette.tealDarker }}>
                      🎁{' '}
                      {t({
                        es: sponsorVenue.sponsorDeal?.es ?? '',
                        en: sponsorVenue.sponsorDeal?.en ?? '',
                      })}
                    </Txt>
                  </View>
                ) : (
                  /* Non-member: lock treatment */
                  <PressableScale
                    onPress={() => router.push('/membership')}
                    style={{
                      backgroundColor: palette.sand1,
                      borderRadius: radius.sm,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.md,
                      marginTop: space.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                    }}
                  >
                    <Txt style={{ fontSize: 14 }}>🔒</Txt>
                    <Txt variant="caption" c={color.textTertiary} style={{ flex: 1 }}>
                      {t({
                        es: 'Hazte miembro para ver el beneficio',
                        en: 'Become a member to see the deal',
                      })}
                    </Txt>
                  </PressableScale>
                )}

                <Spacer h={space.md} />
                <Disclosure
                  text={t({
                    es: 'Los lugares son establecimientos reales de acceso público mostrados como anfitriones ilustrativos. Los beneficios son ilustrativos hasta que existan acuerdos reales.',
                    en: 'Venues are real, publicly listed places shown as illustrative hosts. Deals are illustrative until real agreements exist.',
                  })}
                />
              </View>
            </Card>
          </View>
        ) : null}

        {/* ── h) Credit line ── */}
        <View style={{ paddingHorizontal: space.base, marginBottom: space.xl }}>
          <Disclosure
            text={t({
              es: 'Inspirado por el Nómada Language Social Club, fundado en Punta Cana en febrero de 2026 por Jennifer Ventura.',
              en: 'Inspired by the Nómada Language Social Club, founded in Punta Cana in February 2026 by Jennifer Ventura.',
            })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
