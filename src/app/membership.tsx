/**
 * Membership screen.
 *
 * Two jobs: sell the plans to non-members, and surface renewal to members.
 * The renewal copy is explicit that renewing while active extends from the
 * current expiry — that is a real user-friendly behaviour and it is worth
 * saying clearly.
 */

import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  Disclosure,
  PressableScale,
  Row,
  ScreenHeader,
  Screen,
  Spacer,
  Tag,
  Txt,
} from '../components/ui';
import { CheckIcon, SparkIcon } from '../components/icons';

import { useT, useLang, formatUsd, formatLongDate, formatDaysLeft, formatDopHint } from '../lib/i18n';
import { useStore } from '../lib/store';

import { MEMBER_PERKS, MEMBERSHIP_PLANS } from '../data/official';
import { color, palette, radius, shadow, space } from '../theme/tokens';

export default function MembershipScreen() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { membership, isMember } = useStore();

  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'annual'>('annual');

  const countdown = membership ? formatDaysLeft(membership.until, lang) : null;

  // Per-month equivalent for the annual plan (49/12 ≈ 4.08)
  const annualPerMonth = (49 / 12).toFixed(2);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t({ es: 'Membresía', en: 'Membership' })}
        onBack={() => router.back()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingBottom: space.huge,
          gap: space.xl,
        }}
      >

        {/* ── Existing membership card ── */}
        {isMember && membership ? (
          <View
            style={{
              borderRadius: radius.lg,
              backgroundColor: '#0D2B45',
              padding: space.xl,
              gap: space.md,
              ...shadow.lifted,
            }}
          >
            <Row gap={space.sm} align="center">
              <SparkIcon size={18} c={palette.gold} />
              <Txt variant="label" c={palette.gold} style={{ letterSpacing: 0.8 }}>
                {t({ es: 'MIEMBRO ACTIVO', en: 'ACTIVE MEMBER' })}
              </Txt>
            </Row>
            <Txt variant="h2" c={palette.white}>
              {t(
                MEMBERSHIP_PLANS.find((p) => p.id === membership.plan)?.label ?? {
                  es: 'Membresía',
                  en: 'Membership',
                },
              )}
            </Txt>
            <View style={{ gap: 4 }}>
              <Txt variant="caption" c="rgba(255,255,255,0.6)">
                {t({ es: 'Vence el', en: 'Expires' })}
              </Txt>
              <Txt variant="bodyStrong" c={palette.white}>
                {formatLongDate(membership.until, lang)}
              </Txt>
            </View>
            {countdown ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: radius.pill,
                }}
              >
                <Txt variant="label" c={palette.teal}>
                  {countdown.text}
                </Txt>
              </View>
            ) : null}

            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.12)',
                marginVertical: space.sm,
              }}
            />

            {/* Renewal notice */}
            <Txt variant="caption" c="rgba(255,255,255,0.55)" style={{ lineHeight: 18 }}>
              {t({
                es: 'Renovar ahora extiende desde tu fecha actual de vencimiento, no desde hoy. Nunca pierdes días que ya pagaste.',
                en: 'Renewing now extends from your current expiry date, not from today. You never lose days you already paid for.',
              })}
            </Txt>
          </View>
        ) : null}

        {/* ── Perks ── */}
        <View>
          <Txt variant="h3" style={{ marginBottom: space.md }}>
            {t({ es: 'Beneficios', en: 'Perks' })}
          </Txt>
          <Card padded>
            {MEMBER_PERKS.map((perk, i) => (
              <View key={i}>
                <Row gap={space.md} align="flex-start" style={{ paddingVertical: space.md }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: palette.tealLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckIcon size={16} c={palette.teal} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt variant="bodyStrong">{t(perk.title)}</Txt>
                    <Txt variant="caption" style={{ lineHeight: 18 }}>
                      {t(perk.body)}
                    </Txt>
                  </View>
                </Row>
                {i < MEMBER_PERKS.length - 1 ? (
                  <View
                    style={{ height: 1, backgroundColor: color.border }}
                  />
                ) : null}
              </View>
            ))}
          </Card>
        </View>

        {/* ── Plans ── */}
        <View>
          <Txt variant="h3" style={{ marginBottom: space.md }}>
            {t({ es: 'Elige tu plan', en: 'Choose your plan' })}
          </Txt>
          <View style={{ gap: space.md }}>
            {MEMBERSHIP_PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <PressableScale
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  style={[
                    {
                      borderRadius: radius.lg,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? color.accent : color.border,
                      backgroundColor: isSelected ? palette.tealLight : color.surface,
                      padding: space.base,
                      gap: space.sm,
                    },
                    shadow.card,
                  ]}
                >
                  <Row justify="space-between" align="flex-start">
                    <View style={{ gap: 4 }}>
                      <Row gap={space.sm} align="center">
                        <Txt variant="h3">{t(plan.label)}</Txt>
                        {plan.note ? (
                          <Tag label={t(plan.note)} tone="accent" />
                        ) : null}
                      </Row>
                      <Txt variant="caption">
                        {plan.days}{' '}
                        {t({ es: 'días', en: 'days' })}
                      </Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Txt variant="h2" c={isSelected ? color.accent : color.textPrimary}>
                        {formatUsd(plan.priceUsd)}
                      </Txt>
                      {plan.id === 'annual' ? (
                        <Txt variant="caption" c={color.textTertiary}>
                          {t({
                            es: `≈ US$${annualPerMonth}/mes`,
                            en: `≈ US$${annualPerMonth}/mo`,
                          })}
                          {' · '}
                          {t({ es: 'aprox.', en: 'approx.' })}
                        </Txt>
                      ) : null}
                    </View>
                  </Row>
                  {isSelected ? (
                    <Row gap={space.xs} align="center">
                      <CheckIcon size={14} c={color.accent} />
                      <Txt variant="micro" c={color.accent} style={{ letterSpacing: 0.3 }}>
                        {t({ es: 'SELECCIONADO', en: 'SELECTED' })}
                      </Txt>
                    </Row>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* ── No auto-renew notice ── */}
        <View
          style={{
            backgroundColor: palette.sand1,
            borderRadius: radius.md,
            padding: space.base,
            borderWidth: 1,
            borderColor: palette.sand2,
            gap: space.xs,
          }}
        >
          <Txt variant="label" c={color.textPrimary}>
            {t({ es: 'Sin cobros automáticos', en: 'No auto-renewals' })}
          </Txt>
          <Txt variant="caption" style={{ lineHeight: 18 }}>
            {t({
              es: 'La membresía tiene fecha de vencimiento y no se renueva sola. Nunca se te cobra sin que tú lo confirmes.',
              en: 'Membership has an expiry and never renews automatically. You are never charged without confirming it yourself.',
            })}
          </Txt>
        </View>

        {/* ── USD notice ── */}
        <Txt variant="caption" style={{ textAlign: 'center' }}>
          {t({
            es: `Precios en USD · ${formatDopHint(MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId)?.priceUsd ?? 7, lang)} indicativo`,
            en: `Prices in USD · ${formatDopHint(MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId)?.priceUsd ?? 7, lang)} indicative`,
          })}
        </Txt>

        {/* ── CTA ── */}
        <Button
          label={
            isMember
              ? t({ es: 'Renovar membresía', en: 'Renew membership' })
              : t({ es: 'Continuar', en: 'Continue' })
          }
          onPress={() =>
            router.push(`/checkout?type=membership&id=${selectedPlanId}`)
          }
        />

        <Disclosure
          text={t({
            es: 'Nómada Language Social Club, fundado en Punta Cana en febrero de 2026 por Jennifer Ventura. Los descuentos de aliados son ilustrativos hasta que existan acuerdos firmados.',
            en: 'Nómada Language Social Club, founded in Punta Cana in February 2026 by Jennifer Ventura. Partner discounts are illustrative until real agreements are signed.',
          })}
        />
      </ScrollView>
    </Screen>
  );
}
