/**
 * Inbox / Bandeja
 *
 * Three filters: All · Unread · Meetups (conversations with a meetupId message).
 * Each row shows the partner's avatar, name, last message, timestamp, and
 * an unread dot + heavier weight when there is something new.
 *
 * Honesty: a quiet Disclosure notes that partners are illustrative personas
 * and replies are scripted in this build.
 */

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  Avatar,
  Disclosure,
  Divider,
  EmptyState,
  PressableScale,
  Row,
  Screen,
  SegmentedControl,
  Spacer,
  Txt,
} from '../../components/ui';

import { color, font, palette, radius, space, type } from '../../theme/tokens';
import { useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';

import { partnerById, avatarTint } from '../../data/partners';

/* ─── filter type ─────────────────────────────────────────────────────────── */

type InboxFilter = 'all' | 'unread' | 'meetups';

/* ─── row component ───────────────────────────────────────────────────────── */

function InboxRow({ partnerId }: { partnerId: number }) {
  const t = useT();
  const { getChat, isUnread } = useStore();

  const partner = partnerById(partnerId);
  if (!partner) return null;

  const messages = getChat(partnerId);
  const last = messages[messages.length - 1];
  const unread = isUnread(partnerId);

  if (!last) return null;

  return (
    <PressableScale
      onPress={() => router.push(`/chat/${partnerId}`)}
      style={{
        paddingHorizontal: space.base,
        paddingVertical: space.md,
        backgroundColor: color.surface,
      }}
    >
      <Row gap={space.md} align="center">
        {/* Avatar */}
        <Avatar
          seed={partner.avatarSeed}
          tint={avatarTint(partner.id)}
          size={50}
          online={partner.online}
          flag={partner.flag}
        />

        {/* Content */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row justify="space-between" align="center" gap={space.sm}>
            <Text
              numberOfLines={1}
              style={[
                type.bodyStrong,
                unread ? { fontFamily: font.bold, color: color.textPrimary } : null,
                { flex: 1 },
              ]}
            >
              {partner.name}
            </Text>
            <Text
              style={[
                type.caption,
                { flexShrink: 0, color: unread ? color.accent : color.textTertiary },
              ]}
            >
              {last.time}
            </Text>
          </Row>

          <Row justify="space-between" align="center" gap={space.sm} style={{ marginTop: 2 }}>
            <Text
              numberOfLines={1}
              style={[
                type.caption,
                {
                  flex: 1,
                  color: unread ? color.textSecondary : color.textTertiary,
                  fontFamily: unread ? font.medium : font.regular,
                },
              ]}
            >
              {last.fromPartner ? '' : `${t({ es: 'Tú: ', en: 'You: ' })}`}
              {last.correction
                ? t({ es: '📝 Corrección sugerida', en: '📝 Suggested correction' })
                : last.meetupId
                  ? t({ es: '📅 Invitación a encuentro', en: '📅 Meetup invitation' })
                  : last.text}
            </Text>
            {unread ? (
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: color.accent,
                  flexShrink: 0,
                }}
              />
            ) : null}
          </Row>
        </View>
      </Row>
    </PressableScale>
  );
}

/* ─── main screen ──────────────────────────────────────────────────────────── */

export default function InboxScreen() {
  const t = useT();
  const { chatPartnerIds, getChat, isUnread } = useStore();

  const [filter, setFilter] = useState<InboxFilter>('all');

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    if (filter === 'all') return chatPartnerIds;
    if (filter === 'unread') return chatPartnerIds.filter((id) => isUnread(id));
    // meetups: conversations containing at least one message with a meetupId
    return chatPartnerIds.filter((id) => {
      const msgs = getChat(id);
      return msgs.some((m) => m.meetupId);
    });
  }, [filter, chatPartnerIds, isUnread, getChat]);

  /* ── empty state content ── */
  const emptyEmoji =
    filter === 'unread' ? '✅' : filter === 'meetups' ? '📅' : '💬';

  const emptyTitle =
    filter === 'unread'
      ? t({ es: '¡Todo leído, eso es lo máximo!', en: 'All caught up — nice work!' })
      : filter === 'meetups'
        ? t({ es: 'Sin conversaciones de encuentros', en: 'No meetup conversations yet' })
        : t({ es: 'Tu bandeja está vacía', en: 'Your inbox is empty' });

  const emptyBody =
    filter === 'unread'
      ? t({
          es: 'No tienes mensajes sin leer. Aprovecha para escribirle a alguien nuevo.',
          en: 'No unread messages. A great moment to reach out to someone new.',
        })
      : filter === 'meetups'
        ? t({
            es: 'Cuando alguien te invite a un encuentro o mencione uno en el chat, aparece aquí.',
            en: 'When someone mentions a meetup in a chat, that conversation shows here.',
          })
        : t({
            es: 'Conecta con alguien en Descubrir para empezar una conversación.',
            en: 'Connect with someone in Discover to start a conversation.',
          });

  const emptyAction =
    filter === 'unread'
      ? undefined
      : t({ es: 'Ir a Descubrir', en: 'Go to Discover' });

  const emptyOnAction =
    filter === 'unread' ? undefined : () => router.push('/(tabs)/discover');

  const filterOptions: { key: InboxFilter; label: string }[] = [
    { key: 'all', label: t({ es: 'Todos', en: 'All' }) },
    { key: 'unread', label: t({ es: 'No leídos', en: 'Unread' }) },
    { key: 'meetups', label: t({ es: 'Encuentros', en: 'Meetups' }) },
  ];

  const ListHeader = (
    <View>
      {/* Title */}
      <View style={{ paddingHorizontal: space.base, paddingTop: space.lg, paddingBottom: space.md }}>
        <Txt variant="h2">{t({ es: 'Bandeja', en: 'Inbox' })}</Txt>
      </View>

      {/* Filter */}
      <View style={{ paddingHorizontal: space.base, paddingBottom: space.base }}>
        <SegmentedControl
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {/* Divider */}
      {filtered.length > 0 ? <Divider /> : null}
    </View>
  );

  const ListFooter = (
    <View style={{ paddingHorizontal: space.base, paddingTop: space.lg, paddingBottom: space.huge }}>
      <Disclosure
        text={t({
          es: 'Los perfiles de esta bandeja son personas ilustrativas, no personas reales. Las respuestas en el chat están predefinidas en esta versión de demostración.',
          en: 'The profiles in this inbox are illustrative personas, not real people. Chat replies are scripted in this demo build.',
        })}
      />
    </View>
  );

  return (
    <Screen edges={['top']}>
      {filtered.length === 0 ? (
        <>
          {ListHeader}
          <EmptyState
            emoji={emptyEmoji}
            title={emptyTitle}
            body={emptyBody}
            actionLabel={emptyAction}
            onAction={emptyOnAction}
          />
          {ListFooter}
        </>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(id) => String(id)}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ paddingLeft: 50 + space.md + space.base }}>
              <Divider />
            </View>
          )}
          renderItem={({ item }) => <InboxRow partnerId={item} />}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </Screen>
  );
}
