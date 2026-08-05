/**
 * PartnerCard — shared ranked-partner card used by Home and Discover.
 *
 * Full version: avatar, name, age, role, area, teach/learn tags, ScoreRing,
 * and the "Por qué" reasons line — which is the whole point of the feature.
 *
 * Compact version: tighter single row — avatar, name, one-line reason,
 * score as NN% text. Used in Discover's FlatList.
 */

import React from 'react';
import { View } from 'react-native';
import {
  Avatar,
  Card,
  Row,
  ScoreRing,
  Tag,
  Txt,
} from './ui';
import { PinIcon } from './icons';
import { color, palette, radius, space } from '../theme/tokens';
import { useT, useLang } from '../lib/i18n';
import { langLabel } from '../data/reference';
import type { MatchResult } from '../data/types';
import { avatarTint } from '../data/partners';

type PartnerCardProps = {
  result: MatchResult;
  onPress: () => void;
  compact?: boolean;
};

export default function PartnerCard({ result, onPress, compact = false }: PartnerCardProps) {
  const t = useT();
  const { lang } = useLang();
  const { partner, score, reasons } = result;

  const tint = avatarTint(partner.id);
  const reasonLine = reasons.join(' · ');

  if (compact) {
    return (
      <Card onPress={onPress} style={{ marginBottom: space.sm }}>
        <Row gap={space.md} align="center">
          <Avatar
            seed={partner.avatarSeed}
            tint={tint}
            size={44}
            online={partner.online}
            flag={partner.flag}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Row gap={space.xs} align="center">
              <Txt variant="bodyStrong" numberOfLines={1}>
                {partner.name}
              </Txt>
              <Txt variant="caption" c={color.textTertiary}>
                {partner.age}
              </Txt>
            </Row>
            {reasonLine ? (
              <Txt variant="caption" numberOfLines={1} c={color.textSecondary}>
                {reasonLine}
              </Txt>
            ) : (
              <Txt variant="caption" numberOfLines={1} c={color.textTertiary}>
                {t({ es: partner.role.es, en: partner.role.en })}
              </Txt>
            )}
          </View>
          <Txt
            variant="numeric"
            c={color.accent}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {score}%
          </Txt>
        </Row>
      </Card>
    );
  }

  // Full card
  return (
    <Card onPress={onPress} style={{ marginBottom: space.md }}>
      {/* Header row: avatar + identity + score ring */}
      <Row gap={space.md} align="flex-start">
        <Avatar
          seed={partner.avatarSeed}
          tint={tint}
          size={52}
          online={partner.online}
          flag={partner.flag}
        />

        <View style={{ flex: 1, gap: 3 }}>
          {/* Name + age */}
          <Row gap={space.xs} align="center">
            <Txt variant="bodyStrong">{partner.name}</Txt>
            <Txt variant="caption" c={color.textTertiary}>
              {partner.age}
            </Txt>
          </Row>

          {/* Role (bilingual) */}
          <Txt variant="caption" c={color.textSecondary} numberOfLines={1}>
            {t({ es: partner.role.es, en: partner.role.en })}
          </Txt>

          {/* Area with pin */}
          <Row gap={4} align="center">
            <PinIcon size={12} c={color.textTertiary} />
            <Txt variant="caption" c={color.textTertiary} numberOfLines={1}>
              {partner.area}
            </Txt>
          </Row>
        </View>

        <ScoreRing score={score} size={44} />
      </Row>

      {/* Language tags */}
      <Row gap={space.xs} wrap style={{ marginTop: space.md }}>
        {partner.teaches.map((ls) => (
          <Tag
            key={`teach-${ls.code}`}
            label={t({
              es: `Enseña ${langLabel(ls.code, 'es')}`,
              en: `Teaches ${langLabel(ls.code, 'en')}`,
            })}
            tone="accent"
          />
        ))}
        {partner.learning.map((ls) => (
          <Tag
            key={`learn-${ls.code}`}
            label={t({
              es: `Aprende ${langLabel(ls.code, 'es')}`,
              en: `Learns ${langLabel(ls.code, 'en')}`,
            })}
            tone="sand"
          />
        ))}
      </Row>

      {/* Reasons — the whole point of the feature */}
      {reasonLine ? (
        <View
          style={{
            marginTop: space.md,
            backgroundColor: palette.tealLight,
            borderRadius: radius.sm,
            paddingVertical: space.xs + 2,
            paddingHorizontal: space.md,
          }}
        >
          <Txt variant="caption" style={{ color: palette.tealDarker }}>
            {`${t({ es: '¿Por qué?', en: 'Why' })} · ${reasonLine}`}
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}
