/**
 * Wallet screen.
 *
 * Three sections: tickets (real QR codes), membership card, partner discounts.
 * This screen has to feel like money changed hands — deep navy, gold, real hierarchy.
 */

import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import {
  Button,
  Card,
  Disclosure,
  Divider,
  EmptyState,
  PressableScale,
  Row,
  ScreenHeader,
  Screen,
  SectionHeader,
  Spacer,
  Tag,
  Txt,
} from '../components/ui';
import { CheckIcon, ShareIcon, SparkIcon, TicketIcon, ChevronRight } from '../components/icons';

import { useT, useLang, formatUsd, formatLongDate, formatDaysLeft } from '../lib/i18n';
import { useStore } from '../lib/store';
import { shareText } from '../lib/device';

import { OFFICIAL_EVENT, MEMBERSHIP_PLANS } from '../data/official';
import { venueById, SPONSOR_VENUES } from '../data/venues';
import { color, palette, radius, shadow, space } from '../theme/tokens';

/** Deterministic discount code from venue id: 'NL-' + first 4 chars uppercased */
function discountCode(venueId: string): string {
  return 'NL-' + venueId.slice(0, 4).toUpperCase();
}

export default function WalletScreen() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { tickets, membership, isMember, profile } = useStore();

  const countdown = membership ? formatDaysLeft(membership.until, lang) : null;
  const nearExpiry = countdown ? countdown.days < 7 : false;

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t({ es: 'Mi cartera', en: 'My wallet' })}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingBottom: space.huge,
          gap: space.xxl,
        }}
      >

        {/* ══════════ SECTION A — Tickets ══════════ */}
        <View>
          <SectionHeader
            title={t({ es: 'Mis boletos', en: 'My tickets' })}
          />

          {tickets.length === 0 ? (
            <EmptyState
              emoji="🎟"
              title={t({ es: 'Aún no tienes boletos', en: 'No tickets yet' })}
              body={t({
                es: 'Compra un boleto o reserva tu lugar en la Noche NómadaLingo y aparecerá aquí.',
                en: 'Buy a ticket or reserve your spot at NómadaLingo Night and it will appear here.',
              })}
              actionLabel={t({ es: 'Ver evento oficial', en: 'See official event' })}
              onAction={() => router.push(`/official/${OFFICIAL_EVENT.id}`)}
            />
          ) : (
            <View style={{ gap: space.base }}>
              {tickets.map((ticket) => {
                const event =
                  ticket.eventId === OFFICIAL_EVENT.id ? OFFICIAL_EVENT : null;
                const venue = event ? venueById(event.venueId) : null;
                const shortRef = ticket.id.slice(-6).toUpperCase();
                const kindLabel =
                  ticket.kind === 'member-rsvp'
                    ? t({ es: 'Entrada de miembro', en: 'Member entry' })
                    : t({ es: 'Boleto general', en: 'General ticket' });

                return (
                  <View
                    key={ticket.id}
                    style={[
                      {
                        borderRadius: radius.lg,
                        backgroundColor: '#0D2B45',
                        overflow: 'hidden',
                      },
                      shadow.lifted,
                    ]}
                  >
                    {/* Top half: event info */}
                    <View style={{ padding: space.xl, gap: space.sm }}>
                      <Row gap={space.sm} align="center">
                        <TicketIcon size={16} c={palette.gold} />
                        <Tag label={kindLabel} tone="warm" />
                      </Row>
                      <Txt variant="h2" c={palette.white} style={{ lineHeight: 28 }}>
                        {event ? t(event.title) : ticket.eventId}
                      </Txt>
                      {event ? (
                        <Txt variant="caption" c="rgba(255,255,255,0.6)">
                          {t(event.when)}
                        </Txt>
                      ) : null}
                      {venue ? (
                        <Txt variant="caption" c="rgba(255,255,255,0.6)">
                          {venue.name}
                        </Txt>
                      ) : null}
                    </View>

                    {/* Dashed divider mimicking a ticket stub line */}
                    <View
                      style={{
                        height: 1,
                        marginHorizontal: space.base,
                        borderStyle: 'dashed',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                      }}
                    />

                    {/* Bottom half: QR */}
                    <View
                      style={{
                        alignItems: 'center',
                        padding: space.xl,
                        gap: space.md,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: '#fff',
                          borderRadius: radius.md,
                          padding: space.md,
                        }}
                      >
                        <QRCode
                          value={ticket.qrPayload}
                          size={168}
                          color={palette.ink}
                          backgroundColor="#fff"
                        />
                      </View>
                      <Txt variant="label" c="rgba(255,255,255,0.7)" style={{ letterSpacing: 3 }}>
                        {shortRef}
                      </Txt>
                      <Txt variant="caption" c="rgba(255,255,255,0.4)" style={{ textAlign: 'center' }}>
                        {t({ es: 'El código se verifica en la puerta', en: 'Code is verified at the door' })}
                      </Txt>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ══════════ SECTION B — Membership ══════════ */}
        <View>
          <SectionHeader
            title={t({ es: 'Membresía', en: 'Membership' })}
          />

          {isMember && membership ? (
            <View
              style={[
                {
                  borderRadius: radius.lg,
                  backgroundColor: '#0D2B45',
                  padding: space.xl,
                  gap: space.md,
                },
                shadow.lifted,
              ]}
            >
              <Row gap={space.sm} align="center" justify="space-between">
                <Row gap={space.sm} align="center">
                  <SparkIcon size={18} c={palette.gold} />
                  <Txt variant="label" c={palette.gold} style={{ letterSpacing: 0.8 }}>
                    {t({ es: 'MIEMBRO', en: 'MEMBER' })}
                  </Txt>
                </Row>
                <Tag
                  label={
                    MEMBERSHIP_PLANS.find((p) => p.id === membership.plan)
                      ? t(MEMBERSHIP_PLANS.find((p) => p.id === membership.plan)!.label)
                      : membership.plan
                  }
                  tone="warm"
                />
              </Row>

              {/* Holder name */}
              {profile.name ? (
                <Txt variant="h2" c={palette.white}>
                  {profile.name}
                </Txt>
              ) : null}

              {/* Expiry */}
              <View style={{ gap: 4 }}>
                <Txt variant="caption" c="rgba(255,255,255,0.5)">
                  {t({ es: 'Vence el', en: 'Expires' })}
                </Txt>
                <Txt variant="bodyStrong" c={palette.white}>
                  {formatLongDate(membership.until, lang)}
                </Txt>
              </View>

              {/* Countdown */}
              {countdown ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: nearExpiry ? palette.coralLight : 'rgba(255,255,255,0.10)',
                    paddingHorizontal: space.md,
                    paddingVertical: space.xs,
                    borderRadius: radius.pill,
                  }}
                >
                  <Txt
                    variant="label"
                    c={nearExpiry ? palette.coral : palette.teal}
                  >
                    {countdown.text}
                  </Txt>
                </View>
              ) : null}

              {/* Renew CTA */}
              <PressableScale
                onPress={() => router.push('/membership')}
                style={{
                  marginTop: space.sm,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  borderRadius: radius.md,
                  paddingVertical: space.md,
                  paddingHorizontal: space.base,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Txt variant="label" c="rgba(255,255,255,0.7)">
                  {t({ es: 'Renovar membresía', en: 'Renew membership' })}
                </Txt>
                <ChevronRight size={16} c="rgba(255,255,255,0.4)" />
              </PressableScale>
            </View>
          ) : (
            /* Non-member upsell */
            <Card padded>
              <Row gap={space.md} align="flex-start">
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    backgroundColor: palette.tealLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <SparkIcon size={20} c={palette.teal} />
                </View>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Txt variant="bodyStrong">
                    {t({ es: 'Hazte miembro', en: 'Become a member' })}
                  </Txt>
                  <Txt variant="caption" style={{ lineHeight: 18 }}>
                    {t({
                      es: 'Eventos gratis, descuentos de aliados y más. Desde US$7/mes.',
                      en: 'Free events, partner discounts and more. From US$7/month.',
                    })}
                  </Txt>
                </View>
              </Row>
              <Spacer h={space.base} />
              <Button
                label={t({ es: 'Ver planes', en: 'See plans' })}
                onPress={() => router.push('/membership')}
                variant="secondary"
                size="md"
              />
            </Card>
          )}
        </View>

        {/* ══════════ SECTION C — Partner Discounts ══════════ */}
        <View>
          <SectionHeader
            title={t({ es: 'Descuentos de aliados', en: 'Partner discounts' })}
          />

          {isMember ? (
            <View style={{ gap: space.md }}>
              {SPONSOR_VENUES.map((venue) => {
                const code = discountCode(venue.id);
                const deal = venue.sponsorDeal ? t(venue.sponsorDeal) : '';
                const shareMsg = t({
                  es: `¡Descuento de miembro NómadaLingo en ${venue.name}! Código: ${code} · ${deal}`,
                  en: `NómadaLingo member discount at ${venue.name}! Code: ${code} · ${deal}`,
                });

                return (
                  <Card key={venue.id} padded>
                    <Row justify="space-between" align="flex-start" gap={space.md}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Txt variant="bodyStrong">{venue.name}</Txt>
                        <Txt variant="caption">{venue.area}</Txt>
                        {deal ? (
                          <Tag label={deal} tone="accent" />
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: space.sm }}>
                        <View
                          style={{
                            backgroundColor: palette.sand1,
                            borderRadius: 8,
                            paddingHorizontal: space.md,
                            paddingVertical: space.xs,
                            borderWidth: 1,
                            borderColor: palette.sand2,
                          }}
                        >
                          <Txt variant="label" style={{ letterSpacing: 1.5 }}>
                            {code}
                          </Txt>
                        </View>
                        <PressableScale
                          onPress={() => shareText(shareMsg, venue.name)}
                          style={{ padding: 4 }}
                        >
                          <ShareIcon size={16} c={color.accent} />
                        </PressableScale>
                      </View>
                    </Row>
                  </Card>
                );
              })}

              <Disclosure
                text={t({
                  es: 'Los descuentos de aliados son ilustrativos hasta que existan acuerdos firmados. Verifica con cada lugar antes de usarlos.',
                  en: 'Partner discounts are illustrative until real agreements are signed. Verify with each venue before using them.',
                })}
              />
            </View>
          ) : (
            /* Locked state — single CTA, not one lock icon per row */
            <Card padded>
              <View style={{ gap: space.base }}>
                {SPONSOR_VENUES.map((venue, i) => (
                  <View key={venue.id}>
                    <Row gap={space.md} align="center">
                      <View style={{ flex: 1 }}>
                        <Txt
                          variant="bodyStrong"
                          style={{ opacity: 0.35 }}
                          numberOfLines={1}
                        >
                          {venue.name}
                        </Txt>
                        <Txt variant="caption" style={{ opacity: 0.35 }}>
                          {venue.area}
                        </Txt>
                      </View>
                      <View
                        style={{
                          width: 60,
                          height: 24,
                          borderRadius: 6,
                          backgroundColor: palette.sand2,
                          opacity: 0.4,
                        }}
                      />
                    </Row>
                    {i < SPONSOR_VENUES.length - 1 ? (
                      <Divider style={{ marginTop: space.md }} />
                    ) : null}
                  </View>
                ))}

                <Spacer h={space.sm} />

                <Button
                  label={t({ es: 'Hazte miembro para ver los códigos', en: 'Become a member to unlock codes' })}
                  onPress={() => router.push('/membership')}
                  size="md"
                />
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
