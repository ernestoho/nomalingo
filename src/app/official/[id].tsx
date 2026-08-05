/**
 * Official event detail screen.
 *
 * This is the premium face of NómadaLingo — gold, navy, real hierarchy.
 * The UX arc is: discover → feel the event → understand the value → commit.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  Button,
  Card,
  Disclosure,
  Divider,
  PressableScale,
  ProgressBar,
  Row,
  Spacer,
  Tag,
  Txt,
} from '../../components/ui';
import {
  CheckIcon,
  ClockIcon,
  PinIcon,
  ShareIcon,
  TicketIcon,
  UsersIcon,
} from '../../components/icons';
import MapCard from '../../components/MapCard';

import { useT, useLang, formatUsd, formatDopHint } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import * as haptics from '../../lib/haptics';
import { shareText } from '../../lib/device';

import { OFFICIAL_EVENT } from '../../data/official';
import { venueById } from '../../data/venues';
import { AREAS } from '../../data/reference';
import { venuePhoto } from '../../data/photos';
import { color, palette, radius, shadow, space } from '../../theme/tokens';

const HERO_HEIGHT = 260;
const BOTTOM_BAR_HEIGHT = 88;

export default function OfficialEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { isMember, hasTicketFor, issueTicket } = useStore();

  // Match the event — one official event for now; calm not-found if id doesn't match.
  const event = id === OFFICIAL_EVENT.id ? OFFICIAL_EVENT : null;

  const venue = event ? venueById(event.venueId) : null;
  const area = event ? AREAS.find((a) => a.name === event.area) : null;

  const photo = venue ? venuePhoto(venue.photoSeed) : null;

  const alreadyHasTicket = event ? hasTicketFor(event.id) : false;
  const fillRatio = event ? event.sold / event.capacity : 0;
  const lowStock = fillRatio > 0.8;

  const shareMessage = event
    ? t({
        es: `¡Únete a ${event.title.es}! ${event.when.es} · ${venue?.name ?? ''} · NómadaLingo`,
        en: `Join ${event.title.en}! ${event.when.en} · ${venue?.name ?? ''} · NómadaLingo`,
      })
    : '';

  const insets = useSafeAreaInsets();

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <Txt variant="h2" style={{ textAlign: 'center', marginBottom: space.md }}>
          {t({ es: 'Evento no encontrado', en: 'Event not found' })}
        </Txt>
        <Txt variant="body" style={{ textAlign: 'center' }}>
          {t({ es: 'Este evento ya no está disponible o el enlace es incorrecto.', en: 'This event is no longer available or the link is incorrect.' })}
        </Txt>
        <Spacer h={space.xl} />
        <Button
          label={t({ es: 'Volver', en: 'Go back' })}
          onPress={() => router.back()}
          full={false}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + space.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={{ height: HERO_HEIGHT }}>
          {photo ? (
            <Image
              source={photo}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              contentFit="cover"
            transition={220}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.ink }]} />
          )}
          {/* Dark scrim */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(20,48,79,0.52)' },
            ]}
          />

          {/* Back + Share overlay */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + space.sm,
              left: space.base,
              right: space.base,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <BackButton onPress={() => router.back()} tint="#fff" />
            <PressableScale
              onPress={() => shareText(shareMessage, event.title[lang])}
              hitSlop={12}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.22)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShareIcon size={18} c="#fff" />
            </PressableScale>
          </View>

          {/* Title block over photo */}
          <View
            style={{
              position: 'absolute',
              bottom: space.xl,
              left: space.base,
              right: space.base,
              gap: space.sm,
            }}
          >
            <View style={{ alignSelf: 'flex-start' }}>
              <Tag
                label={t({ es: 'EVENTO OFICIAL', en: 'OFFICIAL EVENT' })}
                tone="warm"
              />
            </View>
            <Txt
              variant="h1"
              style={{ color: palette.white, lineHeight: 32 }}
            >
              {t(event.title)}
            </Txt>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={{ paddingHorizontal: space.base, paddingTop: space.xl, gap: space.xl }}>

          {/* When / Where */}
          <Card padded>
            <Row gap={space.md} align="flex-start" style={{ marginBottom: space.md }}>
              <ClockIcon size={18} c={color.accent} />
              <Txt variant="bodyStrong" style={{ flex: 1 }}>{t(event.when)}</Txt>
            </Row>
            <Divider style={{ marginBottom: space.md }} />
            <Row gap={space.md} align="flex-start" style={{ marginBottom: venue ? space.base : 0 }}>
              <PinIcon size={18} c={color.accent} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{venue?.name ?? event.venueId}</Txt>
                <Txt variant="caption">{event.area}</Txt>
              </View>
            </Row>
            {area ? (
              <MapCard
                lat={area.lat}
                lng={area.lng}
                label={venue?.name ?? event.area}
                height={160}
              />
            ) : null}
          </Card>

          {/* What's included */}
          <View>
            <Txt variant="h3" style={{ marginBottom: space.md }}>
              {t({ es: 'Qué incluye', en: "What's included" })}
            </Txt>
            <Card padded>
              {event.includes.map((item, i) => (
                <View key={i}>
                  <Row gap={space.md} style={{ paddingVertical: space.sm }}>
                    <CheckIcon size={18} c={color.accent} />
                    <Txt variant="body" style={{ flex: 1, color: color.textPrimary }}>
                      {t(item)}
                    </Txt>
                  </Row>
                  {i < event.includes.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          </View>

          {/* Blurb */}
          <Txt variant="body" style={{ lineHeight: 24 }}>
            {t(event.blurb)}
          </Txt>

          {/* Price + Capacity */}
          <Card padded>
            <Row justify="space-between" align="flex-start" style={{ marginBottom: space.base }}>
              <View style={{ gap: 4 }}>
                <Txt variant="h3">
                  {formatUsd(event.priceUsd)}{' '}
                  <Txt variant="body" style={{ color: color.textTertiary }}>
                    {t({ es: 'general', en: 'general' })}
                  </Txt>
                </Txt>
                <Txt variant="label" c={color.accent}>
                  {t({ es: 'GRATIS para miembros', en: 'FREE for members' })}
                </Txt>
              </View>
              {lowStock ? (
                <Tag label={t({ es: 'Quedan pocos', en: 'Almost full' })} tone="coral" />
              ) : null}
            </Row>

            {/* DOP hint */}
            <Txt variant="caption" style={{ marginBottom: space.base }}>
              {formatDopHint(event.priceUsd, lang)}{' '}
              {t({ es: '· indicativo, los cobros son en USD', en: '· indicative, charges settle in USD' })}
            </Txt>

            {/* Capacity bar */}
            <Row gap={space.sm} align="center" style={{ marginBottom: space.sm }}>
              <UsersIcon size={15} c={color.textTertiary} />
              <Txt variant="caption">
                {t({
                  es: `${event.sold} de ${event.capacity} vendidos`,
                  en: `${event.sold} of ${event.capacity} sold`,
                })}
              </Txt>
            </Row>
            <ProgressBar value={fillRatio} height={6} />
          </Card>

          <Disclosure
            text={t({
              es: 'Noche NómadaLingo es un evento original inspirado en el Nómada Language Social Club, fundado en Punta Cana en febrero de 2026 por Jennifer Ventura.',
              en: 'NómadaLingo Night is an original event inspired by the Nómada Language Social Club, founded in Punta Cana in February 2026 by Jennifer Ventura.',
            })}
          />
        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom + space.md,
            paddingTop: space.base,
            paddingHorizontal: space.base,
            backgroundColor: color.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: color.border,
            gap: space.sm,
          },
          shadow.lifted,
        ]}
      >
        {alreadyHasTicket ? (
          <>
            <Row gap={space.sm} justify="center" style={{ marginBottom: 4 }}>
              <CheckIcon size={16} c={color.accent} />
              <Txt variant="label" c={color.accent}>
                {t({ es: 'Ya tienes tu boleto', en: "You're in" })}
              </Txt>
            </Row>
            <Button
              label={t({ es: 'Ver en la cartera', en: 'View in wallet' })}
              onPress={() => router.push('/wallet')}
              variant="secondary"
              icon={<TicketIcon size={16} c={color.textPrimary} />}
            />
          </>
        ) : isMember ? (
          <Button
            label={t({ es: 'Reservar mi lugar · gratis', en: 'Reserve my spot · free' })}
            onPress={() => {
              issueTicket(event.id, 'member-rsvp', 0);
              haptics.success();
              router.push('/wallet');
            }}
            icon={<CheckIcon size={16} c={palette.white} />}
          />
        ) : (
          <>
            <Button
              label={`${t({ es: 'Comprar boleto', en: 'Buy ticket' })} · ${formatUsd(event.priceUsd)}`}
              onPress={() =>
                router.push(`/checkout?type=ticket&id=${event.id}`)
              }
              icon={<TicketIcon size={16} c={palette.white} />}
            />
            <PressableScale
              onPress={() => router.push('/membership')}
              style={{ alignItems: 'center', paddingVertical: space.xs }}
            >
              <Txt variant="caption" c={color.accent}>
                {t({
                  es: 'Hazte miembro y entra gratis',
                  en: 'Become a member and get in free',
                })}
              </Txt>
            </PressableScale>
          </>
        )}
      </View>
    </View>
  );
}
