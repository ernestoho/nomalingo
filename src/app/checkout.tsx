/**
 * Checkout modal.
 *
 * Reads `type` ('ticket' | 'membership') and `id` from search params.
 * Payments are not connected in this build; a calm Disclosure says so.
 * Confirming grants the entitlement locally so the full wallet flow is testable.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Disclosure,
  Divider,
  Row,
  ScreenHeader,
  Screen,
  Spacer,
  Txt,
} from '../components/ui';
import { TicketIcon, SparkIcon } from '../components/icons';

import { useT, useLang, formatUsd, formatDopHint } from '../lib/i18n';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { useSync } from '../lib/content-sync';
import * as haptics from '../lib/haptics';

import { OFFICIAL_EVENT, planById } from '../data/official';
import { venueById } from '../data/venues';
import { color, palette, radius, space } from '../theme/tokens';

type CheckoutType = 'ticket' | 'membership';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: CheckoutType; id?: string; eventId?: string }>();
  const { type, id } = params;
  const t = useT();
  const { lang } = useLang();
  const { activateMembership, issueTicket } = useStore();
  const { refresh: refreshContent } = useSync();
  const [orderError, setOrderError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Resolve the line item
  const isTicket = type === 'ticket';
  const isMembership = type === 'membership';

  /**
   * Accept the legacy `?eventId=` shape as well as `?type=ticket&id=`.
   * Two call sites disagreed about the parameter name and the mismatch
   * dead-ended the purchase with "algo salió mal". Being liberal in what this
   * screen accepts costs one line and cannot regress.
   */
  const eventIdParam = (params.eventId as string | undefined) ?? undefined;
  const resolvedTicketId = isTicket ? id : eventIdParam;
  const wantsTicket = isTicket || Boolean(eventIdParam);

  const ticketEvent =
    wantsTicket && resolvedTicketId === OFFICIAL_EVENT.id ? OFFICIAL_EVENT : null;
  const membershipPlan = isMembership && id ? planById(id as 'monthly' | 'annual') : null;

  const venue = ticketEvent ? venueById(ticketEvent.venueId) : null;

  const lineItemLabel = ticketEvent
    ? t(ticketEvent.title)
    : membershipPlan
    ? `NómadaLingo ${t(membershipPlan.label)}`
    : t({ es: 'Artículo desconocido', en: 'Unknown item' });

  const lineItemSub = ticketEvent
    ? `${t(ticketEvent.when)} · ${venue?.name ?? ''}`
    : membershipPlan
    ? `${membershipPlan.days} ${t({ es: 'días de membresía', en: 'days of membership' })}`
    : '';

  const totalUsd = ticketEvent
    ? ticketEvent.priceUsd
    : membershipPlan
    ? membershipPlan.priceUsd
    : 0;

  // Guard: if params are malformed, show a calm error
  const valid = (isTicket && ticketEvent) || (isMembership && membershipPlan);

  /**
   * Ask the server to open an order, then hand off to approval.
   *
   * The amount is deliberately NOT sent — the server resolves the price from
   * its own records, so a client cannot buy a US$12 ticket for zero. Members
   * getting in free is also decided server-side for the same reason.
   */
  const handleConfirm = async () => {
    if (submitting || !valid) return;
    setSubmitting(true);
    setOrderError(null);

    const kind = isMembership ? 'membership' : 'ticket';
    const targetId = isMembership ? membershipPlan!.id : ticketEvent!.id;

    const res = await api.post<{ orderId: string; amountUsd: number; approveUrl: string }>(
      '/api/checkout/create-order',
      { kind, targetId },
    );

    if (!res.ok) {
      // Already owns it — that is a success from the user's point of view.
      if (res.kind === 'http' && res.code === 'already_owned') {
        haptics.success();
        router.replace('/wallet');
        return;
      }
      setOrderError(res.message);
      setSubmitting(false);
      haptics.error();
      return;
    }

    void refreshContent();
    haptics.impact();
    router.replace(`/mock-pay?order=${res.data.orderId}`);
  };

  const insets = useSafeAreaInsets();

  if (!valid) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title={t({ es: 'Pago', en: 'Checkout' })}
          onBack={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <Txt variant="h3" style={{ textAlign: 'center', marginBottom: space.md }}>
            {t({ es: 'Algo salió mal', en: 'Something went wrong' })}
          </Txt>
          <Txt variant="body" style={{ textAlign: 'center' }}>
            {t({ es: 'No pudimos encontrar lo que querías comprar. Inténtalo de nuevo.', en: "We couldn't find what you wanted to buy. Please try again." })}
          </Txt>
          <Spacer h={space.xl} />
          <Button
            label={t({ es: 'Cerrar', en: 'Close' })}
            onPress={() => router.back()}
            variant="secondary"
            full={false}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t({ es: 'Confirmar pago', en: 'Confirm payment' })}
        onBack={() => router.back()}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: space.base,
          gap: space.xl,
          paddingTop: space.md,
        }}
      >
        {/* ── Line item ── */}
        <Card padded>
          <Row gap={space.md} align="flex-start" style={{ marginBottom: space.base }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isTicket ? palette.coralLight : palette.tealLight,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isTicket ? (
                <TicketIcon size={18} c={palette.coral} />
              ) : (
                <SparkIcon size={18} c={palette.teal} />
              )}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="bodyStrong">{lineItemLabel}</Txt>
              <Txt variant="caption">{lineItemSub}</Txt>
            </View>
            <Txt variant="h3">{formatUsd(totalUsd)}</Txt>
          </Row>

          <Divider />

          {/* Total */}
          <Row justify="space-between" style={{ paddingTop: space.base }}>
            <Txt variant="bodyStrong">{t({ es: 'Total', en: 'Total' })}</Txt>
            <Txt variant="h2" c={color.textPrimary}>
              {formatUsd(totalUsd)}
            </Txt>
          </Row>

          {/* DOP hint */}
          <Txt variant="caption" style={{ textAlign: 'right', marginTop: 4 }}>
            {formatDopHint(totalUsd, lang)}{' '}
            {t({ es: '· indicativo · los cobros son en USD', en: '· indicative · charges settle in USD' })}
          </Txt>
        </Card>

        {/* ── Calm payment notice ── */}
        <View
          style={{
            backgroundColor: '#FFF8EC',
            borderRadius: radius.md,
            padding: space.base,
            borderWidth: 1,
            borderColor: palette.sand2,
            gap: space.xs,
          }}
        >
          <Txt variant="label" c={palette.goldDark}>
            {t({ es: 'Pagos no conectados en esta versión', en: 'Payments not connected in this build' })}
          </Txt>
          <Txt variant="caption" style={{ lineHeight: 18 }}>
            {t({
              es: 'La orden se registra de verdad en el servidor y el precio lo decide el servidor, no la app. Lo único simulado es el cobro con tarjeta.',
              en: 'The order is genuinely recorded on the server and the price is decided by the server, not the app. The only simulated part is the card charge.',
            })}
          </Txt>
        </View>

        <Spacer h={0} />

        {orderError ? (
          <Txt variant="caption" c={color.highlight} style={{ textAlign: 'center' }}>
            {orderError}
          </Txt>
        ) : null}

        {/* ── Actions ── */}
        <View style={{ gap: space.md, paddingBottom: insets.bottom + space.md }}>
          <Button
            label={t({ es: 'Confirmar', en: 'Confirm' })}
            onPress={handleConfirm}
            disabled={submitting}
            loading={submitting}
          />
          <Button
            label={t({ es: 'Cancelar', en: 'Cancel' })}
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </View>
    </Screen>
  );
}
