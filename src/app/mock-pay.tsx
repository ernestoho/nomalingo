/**
 * Mock payment approval.
 *
 * This screen stands exactly where PayPal's hosted approval page will stand.
 * The app creates an order server-side, the user approves it here, and the app
 * asks the server to capture. Swapping in real PayPal means opening their
 * approve URL with `WebBrowser.openAuthSessionAsync` instead of pushing this
 * route — the surrounding flow, and every security property, is unchanged.
 *
 * It is labelled as a test throughout. Nobody should be able to mistake this
 * for a real payment page, and the amount shown comes from the server's order
 * record rather than from anything the client passed in.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Button,
  Card,
  Disclosure,
  Divider,
  PressableScale,
  Row,
  ScreenHeader,
  Screen,
  Skeleton,
  Spacer,
  Tag,
  Txt,
} from '../components/ui';
import { CheckIcon, TicketIcon } from '../components/icons';
import { color, font, palette, radius, space } from '../theme/tokens';
import { formatDopHint, formatUsd, useLang, useT } from '../lib/i18n';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { useSync } from '../lib/content-sync';
import * as haptics from '../lib/haptics';
import { Monogram } from '../components/Logo';

type Order = {
  id: string;
  kind: 'ticket' | 'membership';
  targetId: string;
  amountUsd: number;
  status: 'created' | 'approved' | 'captured' | 'cancelled';
};

export default function MockPay() {
  const t = useT();
  const { lang } = useLang();
  const { order: orderId } = useLocalSearchParams<{ order?: string }>();
  const { refreshMe } = useStore();
  const { refresh: refreshContent } = useSync();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setError(t({ es: 'Falta la orden.', en: 'Missing order.' }));
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await api.get<{ order: Order }>(`/api/checkout/order?id=${orderId}`);
    if (res.ok) {
      setOrder(res.data.order);
      setError(null);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, [orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    if (!order || paying) return;
    setPaying(true);
    setError(null);

    const res = await api.post<{ ok: boolean }>('/api/checkout/capture', { orderId: order.id });
    if (!res.ok) {
      setError(res.message);
      setPaying(false);
      haptics.error();
      return;
    }

    haptics.success();

    // Pull the entitlement down before navigating. The capture happened on the
    // server; without this the wallet renders its empty state for a beat and
    // the user thinks the purchase failed.
    await Promise.all([refreshMe(), refreshContent()]);

    router.replace('/wallet');
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={t({ es: 'Pago de prueba', en: 'Test payment' })}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ padding: space.base, paddingBottom: space.xxl }}>
        {/* A deliberately distinct, obviously-not-PayPal panel. */}
        <Card style={styles.panel} padded={false}>
          <View style={styles.panelHead}>
            <Row gap={space.md}>
              <Monogram size={38} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3" c={palette.white}>
                  {t({ es: 'Pasarela simulada', en: 'Simulated gateway' })}
                </Txt>
                <Txt variant="caption" c="rgba(255,255,255,0.72)">
                  {t({ es: 'Ningún cargo real', en: 'No real charge' })}
                </Txt>
              </View>
              <Tag label={t({ es: 'PRUEBA', en: 'TEST' })} tone="warm" />
            </Row>
          </View>

          <View style={{ padding: space.base }}>
            {loading ? (
              <View style={{ gap: space.md }}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={26} />
                <Skeleton height={52} radius={radius.md} />
              </View>
            ) : order ? (
              <>
                <Row gap={space.md} align="flex-start">
                  <View style={styles.iconTile}>
                    <TicketIcon size={20} c={color.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">
                      {order.kind === 'membership'
                        ? t({ es: 'Membresía NómadaLingo', en: 'NómadaLingo membership' })
                        : t({ es: 'Boleto de evento oficial', en: 'Official event ticket' })}
                    </Txt>
                    <Txt variant="caption" style={{ marginTop: 2 }}>
                      {t({ es: 'Orden', en: 'Order' })} {order.id}
                    </Txt>
                  </View>
                </Row>

                <Spacer h={space.base} />
                <Divider />
                <Spacer h={space.base} />

                <Row justify="space-between">
                  <Txt variant="bodyStrong">{t({ es: 'Total', en: 'Total' })}</Txt>
                  <Txt variant="h2">{formatUsd(order.amountUsd)}</Txt>
                </Row>
                <Txt variant="caption" style={{ textAlign: 'right', marginTop: 2 }}>
                  {formatDopHint(order.amountUsd, lang)} ·{' '}
                  {t({ es: 'indicativo', en: 'indicative' })}
                </Txt>

                {order.status === 'captured' ? (
                  <>
                    <Spacer h={space.lg} />
                    <Row gap={space.sm} justify="center">
                      <CheckIcon size={18} />
                      <Txt variant="bodyStrong" c={color.accent}>
                        {t({ es: 'Esta orden ya fue pagada', en: 'This order is already paid' })}
                      </Txt>
                    </Row>
                    <Spacer h={space.base} />
                    <Button
                      label={t({ es: 'Ver en la cartera', en: 'View in wallet' })}
                      onPress={() => router.replace('/wallet')}
                    />
                  </>
                ) : (
                  <>
                    <Spacer h={space.lg} />
                    <Button
                      label={
                        order.amountUsd === 0
                          ? t({ es: 'Confirmar · gratis', en: 'Confirm · free' })
                          : t({
                              es: `Aprobar pago de ${formatUsd(order.amountUsd)}`,
                              en: `Approve ${formatUsd(order.amountUsd)} payment`,
                            })
                      }
                      onPress={approve}
                      loading={paying}
                    />
                    <Spacer h={space.sm} />
                    <PressableScale
                      onPress={() => router.back()}
                      style={{ paddingVertical: space.md, alignItems: 'center' }}
                      quiet
                    >
                      <Txt variant="label" c={color.textTertiary}>
                        {t({ es: 'Cancelar', en: 'Cancel' })}
                      </Txt>
                    </PressableScale>
                  </>
                )}
              </>
            ) : (
              <>
                <Txt variant="bodyStrong" c={color.highlight}>
                  {error ?? t({ es: 'No se pudo cargar la orden.', en: 'Could not load the order.' })}
                </Txt>
                <Spacer h={space.base} />
                <Button
                  label={t({ es: 'Reintentar', en: 'Retry' })}
                  variant="secondary"
                  onPress={load}
                />
              </>
            )}

            {error && order ? (
              <>
                <Spacer h={space.md} />
                <Txt variant="caption" c={color.highlight}>
                  {error}
                </Txt>
              </>
            ) : null}
          </View>
        </Card>

        <Spacer h={space.base} />

        <Disclosure
          text={t({
            es: 'Esta pantalla sustituye temporalmente a la de PayPal. El precio lo decide el servidor, no la app, y la orden se registra igual que en producción — lo único que no ocurre es el cobro. Cuando conectemos PayPal, este paso se reemplaza sin tocar el resto del flujo.',
            en: 'This screen temporarily stands in for PayPal. The price is decided by the server, not the app, and the order is recorded exactly as it would be in production — the only thing that does not happen is the charge. When PayPal is connected, this step is replaced without touching the rest of the flow.',
          })}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
  },
  panelHead: {
    backgroundColor: palette.ink,
    padding: space.base,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: palette.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
