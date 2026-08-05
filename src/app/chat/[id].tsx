/**
 * Chat / [id]
 *
 * Full messaging screen for a single partner conversation.
 *
 * Features:
 * - Inverted FlatList so the newest message sits at the bottom
 * - Keyboard-aware composer via react-native-keyboard-controller
 * - Partner bubbles (left) + user bubbles (right)
 * - Correction card — the hero element, renders ser/estar mistakes beautifully
 * - Meetup inline card
 * - Conversation-starter chips above the input
 * - Scripted reply simulation with a typing indicator
 * - Every scripted reply is visibly labelled as demo behaviour
 *
 * Honesty: scripted replies are labelled "respuesta de demostración / demo reply".
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  BackButton,
  Card,
  Chip,
  Disclosure,
  PressableScale,
  Row,
  Spacer,
  Txt,
} from '../../components/ui';
import { CheckIcon } from '../../components/icons';

import { color, font, palette, radius, shadow, space, type } from '../../theme/tokens';
import { useT, useLang } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { score } from '../../lib/match';
import * as haptics from '../../lib/haptics';

import { partnerById, avatarTint } from '../../data/partners';
import { venueName } from '../../data/venues';
import { SCRIPTED_REPLIES, STARTERS } from '../../data/chats';
import type { ChatMessage } from '../../data/types';

/* ─── constants ─────────────────────────────────────────────────────────────── */

const BUBBLE_MAX_WIDTH = '78%';
const BUBBLE_RADIUS = 18;
const BUBBLE_TIGHT = 6;
const STARTERS_HIDE_THRESHOLD = 4; // hide chips once convo has >4 messages

/* ─── typing indicator ──────────────────────────────────────────────────────── */

function TypingDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withTiming(-5, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(y);
  }, [y, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: color.textTertiary,
        },
        animStyle,
      ]}
    />
  );
}

function TypingIndicator() {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginLeft: space.base,
        marginVertical: space.xs,
      }}
    >
      <View
        style={{
          backgroundColor: color.surface,
          borderRadius: BUBBLE_RADIUS,
          borderBottomLeftRadius: BUBBLE_TIGHT,
          paddingHorizontal: space.base,
          paddingVertical: space.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.border,
          flexDirection: 'row',
          gap: 5,
          alignItems: 'center',
        }}
      >
        <TypingDot delay={0} />
        <TypingDot delay={140} />
        <TypingDot delay={280} />
      </View>
    </View>
  );
}

/* ─── correction card ─────────────────────────────────────────────────────── */

function CorrectionCard({
  wrong,
  right,
  why,
}: {
  wrong: string;
  right: string;
  why: { es: string; en: string };
}) {
  const t = useT();
  const { phrases, addPhrase } = useStore();

  const alreadySaved = phrases.some((p) => p.wrong === wrong && p.right === right);
  const [justSaved, setJustSaved] = useState(alreadySaved);

  const handleSave = useCallback(() => {
    if (justSaved) return;
    addPhrase({ wrong, right, why });
    haptics.success();
    setJustSaved(true);
  }, [justSaved, addPhrase, wrong, right, why]);

  // Sync if the phrase was already in the store from a previous session
  useEffect(() => {
    if (alreadySaved) setJustSaved(true);
  }, [alreadySaved]);

  return (
    <View
      style={{
        marginHorizontal: space.base,
        marginVertical: space.sm,
        borderRadius: radius.lg,
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.border,
        overflow: 'hidden',
        ...shadow.card,
      }}
    >
      {/* Header stripe */}
      <View
        style={{
          backgroundColor: palette.tealLight,
          paddingHorizontal: space.base,
          paddingVertical: 7,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: color.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
        }}
      >
        <Text style={{ fontSize: 13 }}>✏️</Text>
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 11,
            color: palette.tealDarker,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {t({ es: 'Corrección sugerida', en: 'Suggested correction' })}
        </Text>
      </View>

      <View style={{ padding: space.base, gap: space.md }}>
        {/* Wrong */}
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.textTertiary,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            {t({ es: 'Lo que dijiste', en: 'What you said' })}
          </Text>
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 16,
              color: palette.coral,
              textDecorationLine: 'line-through',
              lineHeight: 22,
            }}
          >
            {wrong}
          </Text>
        </View>

        {/* Divider with arrow */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.border }} />
          <Text style={{ fontSize: 14, color: color.textTertiary }}>↓</Text>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.border }} />
        </View>

        {/* Right */}
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.textTertiary,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            {t({ es: 'La forma correcta', en: 'The correct form' })}
          </Text>
          <Text
            style={{
              fontFamily: font.bold,
              fontSize: 16,
              color: palette.teal,
              lineHeight: 22,
            }}
          >
            {right}
          </Text>
        </View>

        {/* Explanation */}
        <View
          style={{
            backgroundColor: palette.sand1,
            borderRadius: radius.sm,
            padding: space.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: color.chipBorder,
          }}
        >
          <Txt variant="caption" style={{ lineHeight: 19, color: color.textSecondary }}>
            {t(why)}
          </Txt>
        </View>

        {/* Save action */}
        <PressableScale
          onPress={handleSave}
          quiet={justSaved}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            backgroundColor: justSaved ? palette.tealLight : color.accent,
          }}
        >
          {justSaved ? (
            <>
              <CheckIcon size={16} c={palette.tealDarker} />
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 13.5,
                  color: palette.tealDarker,
                }}
              >
                {t({ es: 'Guardado', en: 'Saved' })}
              </Text>
            </>
          ) : (
            <Text
              style={{
                fontFamily: font.bold,
                fontSize: 13.5,
                color: color.onAccent,
              }}
            >
              {t({ es: 'Guardar en frasario', en: 'Save to phrasebook' })}
            </Text>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

/* ─── meetup inline card ─────────────────────────────────────────────────── */

function MeetupCard({ meetupId }: { meetupId: string }) {
  const t = useT();
  const { findMeetup } = useStore();
  const meetup = findMeetup(meetupId);

  if (!meetup) return null;

  // categoryTint from tokens
  const tintMap: Record<string, string> = {
    'Café': palette.tealLight,
    Coworking: '#E7EEF6',
    Playa: '#E6F2F7',
    Bachata: palette.coralLight,
    Networking: '#F9EEDF',
  };
  const tint = tintMap[meetup.category] ?? palette.tealLight;

  const emojiMap: Record<string, string> = {
    'Café': '☕',
    Coworking: '💻',
    Playa: '🏖',
    Bachata: '💃',
    Networking: '🤝',
  };
  const emoji = emojiMap[meetup.category] ?? '📅';

  return (
    <View style={{ marginHorizontal: space.base, marginVertical: space.sm }}>
      <PressableScale
        onPress={() => router.push(`/event/${meetupId}`)}
        style={{
          backgroundColor: tint,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.border,
          padding: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          ...shadow.card,
        }}
      >
        {/* Category emoji pill */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: color.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ fontFamily: font.bold, fontSize: 14, color: color.textPrimary }}
            numberOfLines={1}
          >
            {t(meetup.title)}
          </Text>
          <Text
            style={{ fontFamily: font.regular, fontSize: 12.5, color: color.textSecondary }}
            numberOfLines={1}
          >
            {venueName(meetup.venueId)} · {t(meetup.when)}
          </Text>
        </View>

        <Text style={{ fontSize: 16 }}>›</Text>
      </PressableScale>
    </View>
  );
}

/* ─── chat bubble ─────────────────────────────────────────────────────────── */

function ChatBubble({ message }: { message: ChatMessage }) {
  const t = useT();
  const fromPartner = message.fromPartner;

  // Special full-width elements
  if (message.correction && fromPartner) {
    return (
      <View>
        {/* The message text itself in a small partner bubble first */}
        {message.text ? (
          <View
            style={{
              alignSelf: 'flex-start',
              marginLeft: space.base,
              marginRight: '22%',
              marginVertical: space.xs,
            }}
          >
            <View
              style={{
                backgroundColor: color.surface,
                borderRadius: BUBBLE_RADIUS,
                borderBottomLeftRadius: BUBBLE_TIGHT,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: color.border,
                paddingHorizontal: space.md,
                paddingVertical: space.sm + 2,
              }}
            >
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: color.textPrimary, lineHeight: 21 }}>
                {message.text}
              </Text>
              <Text style={[type.micro, { marginTop: 4, textAlign: 'right' }]}>
                {message.time}
              </Text>
            </View>
          </View>
        ) : null}
        <CorrectionCard
          wrong={message.correction.wrong}
          right={message.correction.right}
          why={message.correction.why}
        />
      </View>
    );
  }

  if (message.meetupId && fromPartner) {
    return (
      <View>
        {message.text ? (
          <View
            style={{
              alignSelf: 'flex-start',
              marginLeft: space.base,
              marginRight: '22%',
              marginVertical: space.xs,
            }}
          >
            <View
              style={{
                backgroundColor: color.surface,
                borderRadius: BUBBLE_RADIUS,
                borderBottomLeftRadius: BUBBLE_TIGHT,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: color.border,
                paddingHorizontal: space.md,
                paddingVertical: space.sm + 2,
              }}
            >
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: color.textPrimary, lineHeight: 21 }}>
                {message.text}
              </Text>
              <Text style={[type.micro, { marginTop: 4, textAlign: 'right' }]}>
                {message.time}
              </Text>
            </View>
          </View>
        ) : null}
        <MeetupCard meetupId={message.meetupId} />
      </View>
    );
  }

  // Standard bubble
  const isUser = !fromPartner;

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        marginLeft: isUser ? '22%' : space.base,
        marginRight: isUser ? space.base : '22%',
        marginVertical: space.xs,
      }}
    >
      <View
        style={{
          backgroundColor: isUser ? color.accent : color.surface,
          borderRadius: BUBBLE_RADIUS,
          borderBottomLeftRadius: !isUser ? BUBBLE_TIGHT : BUBBLE_RADIUS,
          borderBottomRightRadius: isUser ? BUBBLE_TIGHT : BUBBLE_RADIUS,
          borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
          borderColor: color.border,
          paddingHorizontal: space.md,
          paddingVertical: space.sm + 2,
          maxWidth: '100%',
        }}
      >
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 15,
            lineHeight: 21,
            color: isUser ? color.onAccent : color.textPrimary,
          }}
        >
          {message.text}
        </Text>
        <Text
          style={[
            type.micro,
            {
              marginTop: 4,
              textAlign: 'right',
              color: isUser ? 'rgba(255,255,255,0.65)' : color.textTertiary,
            },
          ]}
        >
          {message.time}
        </Text>
      </View>

      {/* Honesty label for scripted replies */}
      {message.scripted ? (
        <Text
          style={[
            type.micro,
            {
              textAlign: isUser ? 'right' : 'left',
              marginTop: 3,
              marginHorizontal: 4,
              color: color.textTertiary,
              fontStyle: 'italic',
            },
          ]}
        >
          {t({ es: 'respuesta de demostración', en: 'demo reply' })}
        </Text>
      ) : null}
    </View>
  );
}

/* ─── send button ─────────────────────────────────────────────────────────── */

function SendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const t = useT();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t({ es: 'Enviar', en: 'Send' })}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: disabled ? palette.sand2 : color.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Arrow-up send icon */}
      <Text style={{ color: disabled ? color.textTertiary : color.onAccent, fontSize: 18, lineHeight: 20 }}>
        ↑
      </Text>
    </PressableScale>
  );
}

/* ─── main screen ─────────────────────────────────────────────────────────── */

export default function ChatScreen() {
  const t = useT();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { profile, getChat, sendMessage, appendMessage, markRead, phrases } = useStore();

  const partnerId = Number(params.id);
  const partner = partnerById(partnerId);

  const [inputText, setInputText] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Mark as read on mount
  useEffect(() => {
    if (partner) markRead(partnerId);
  }, [partnerId, partner, markRead]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const messages = getChat(partnerId);

  // Match score
  const matchScore = useMemo(() => {
    if (!partner) return null;
    return score(partner, profile, lang);
  }, [partner, profile, lang]);

  // Conversation starters visibility
  const showStarters = useMemo(() => {
    return inputText.length === 0 && messages.length <= STARTERS_HIDE_THRESHOLD;
  }, [inputText, messages.length]);

  // Handle send
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendMessage(partnerId, text);
    haptics.impact();

    // Show typing indicator, then deliver a scripted reply
    setShowTyping(true);
    const delay = 1200 + Math.random() * 600;
    replyTimerRef.current = setTimeout(() => {
      setShowTyping(false);
      const reply = SCRIPTED_REPLIES[Math.floor(Math.random() * SCRIPTED_REPLIES.length)];
      const now = new Date();
      let h = now.getHours();
      const suffix = h >= 12 ? (lang === 'es' ? 'p.m.' : 'PM') : lang === 'es' ? 'a.m.' : 'AM';
      h = h % 12 || 12;
      appendMessage(partnerId, {
        fromPartner: true,
        text: lang === 'es' ? reply.es : reply.en,
        time: `${h}:${String(now.getMinutes()).padStart(2, '0')} ${suffix}`,
        scripted: true,
      });
    }, delay);
  }, [inputText, partnerId, sendMessage, appendMessage, lang]);

  // Not-found guard
  if (!partner) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.xl,
          paddingTop: insets.top,
        }}
      >
        <BackButton onPress={() => router.back()} />
        <Spacer h={space.xl} />
        <Txt variant="h2" style={{ textAlign: 'center' }}>
          {t({ es: 'Conversación no encontrada', en: 'Conversation not found' })}
        </Txt>
        <Spacer h={space.base} />
        <Txt variant="body" style={{ textAlign: 'center' }}>
          {t({
            es: 'Este usuario no existe en el directorio.',
            en: 'This user does not exist in the directory.',
          })}
        </Txt>
      </View>
    );
  }

  const statusLine = partner.online
    ? t({ es: 'En línea', en: 'Online' })
    : lang === 'es'
      ? partner.role.es
      : partner.role.en;

  // Messages to render (reverse for inverted FlatList, but we keep normal order and scroll to end)
  const allMessages = useMemo(() => messages, [messages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: color.bg }}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View
          style={{
            paddingTop: insets.top + space.sm,
            paddingBottom: space.md,
            paddingHorizontal: space.base,
            backgroundColor: color.surface,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: color.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
          }}
        >
          <BackButton onPress={() => router.back()} />

          {/* Avatar + name + status */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Avatar
              seed={partner.avatarSeed}
              tint={avatarTint(partner.id)}
              size={38}
              online={partner.online}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: font.bold,
                  fontSize: 15,
                  color: color.textPrimary,
                }}
              >
                {partner.name}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: font.regular,
                  fontSize: 12,
                  color: partner.online ? color.accent : color.textTertiary,
                }}
              >
                {statusLine}
              </Text>
            </View>
          </View>

          {/* Match score pill */}
          {matchScore !== null ? (
            <View
              style={{
                paddingHorizontal: space.sm,
                paddingVertical: 4,
                borderRadius: radius.pill,
                backgroundColor: palette.tealLight,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: palette.teal,
              }}
            >
              <Text
                style={{
                  fontFamily: font.heavy,
                  fontSize: 12,
                  color: palette.tealDarker,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {matchScore.score}%
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Message list ── */}
        <FlatList
          ref={listRef}
          data={allMessages}
          keyExtractor={(_, i) => String(i)}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{
            paddingTop: space.base,
            paddingBottom: space.sm,
          }}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ListFooterComponent={showTyping ? <TypingIndicator /> : null}
        />

        {/* ── Composer ── */}
        <View
          style={{
            backgroundColor: color.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: color.border,
            paddingBottom: insets.bottom + space.sm,
          }}
        >
          {/* Conversation starter chips */}
          {showStarters ? (
            <ScrollView
              horizontal
              style={{ flexGrow: 0, flexShrink: 0 }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: space.base,
                paddingTop: space.md,
                paddingBottom: space.sm,
                gap: space.sm,
              }}
            >
              {STARTERS.map((starter, i) => (
                <Chip
                  key={i}
                  label={t(starter)}
                  onPress={() => setInputText(t(starter))}
                  small
                />
              ))}
            </ScrollView>
          ) : (
            <View style={{ height: space.md }} />
          )}

          {/* Input row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: space.base,
              gap: space.sm,
            }}
          >
            <View
              style={{
                flex: 1,
                minHeight: 42,
                maxHeight: 120,
                borderRadius: 21,
                backgroundColor: color.bg,
                borderWidth: 1,
                borderColor: color.border,
                paddingHorizontal: space.md,
                paddingVertical: space.sm + 2,
                justifyContent: 'center',
              }}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={t({ es: 'Escribe un mensaje…', en: 'Type a message…' })}
                placeholderTextColor={color.textTertiary}
                multiline
                returnKeyType="default"
                style={{
                  fontFamily: font.regular,
                  fontSize: 15,
                  color: color.textPrimary,
                  lineHeight: 21,
                  margin: 0,
                  padding: 0,
                  // @ts-ignore web
                  ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
                }}
              />
            </View>

            <SendButton onPress={handleSend} disabled={inputText.trim().length === 0} />
          </View>

          {/* Honesty disclosure (once, at the bottom of the composer) */}
          <View style={{ paddingHorizontal: space.base, paddingTop: space.sm }}>
            <Disclosure
              text={t({
                es: 'Los perfiles son personas ilustrativas. Las respuestas son de demostración y están predefinidas en esta versión.',
                en: 'Profiles are illustrative personas. Replies are scripted demo responses in this build.',
              })}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
