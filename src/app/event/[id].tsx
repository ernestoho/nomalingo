/**
 * Meetup detail screen.
 *
 * Shows everything needed to decide whether to attend: venue photo,
 * when / where, who's going, how it works, the host, and a sticky RSVP bar.
 * Safety copy is plain and pan-Hispanic — no slang, no emoji, no jokes.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';

import {
  Screen,
  Row,
  Spacer,
  Divider,
  Txt,
  PressableScale,
  Button,
  Tag,
  Avatar,
  ProgressBar,
  BackButton,
  Disclosure,
} from '../../components/ui';
import {
  PinIcon,
  ClockIcon,
  ShareIcon,
  VerifiedIcon,
  ShieldIcon,
  BellIcon,
} from '../../components/icons';
import {
  color,
  palette,
  radius,
  space,
  font,
  shadow,
  categoryTint,
} from '../../theme/tokens';

import { useT, useLang, formatLongDate, formatTime } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import * as haptics from '../../lib/haptics';
import {
  scheduleMeetupReminder,
  shareText,
} from '../../lib/device';

import { partnerById, avatarTint } from '../../data/partners';
import { venueById, venueName } from '../../data/venues';
import { venuePhoto } from '../../data/photos';
import {
  categoryEmoji,
  categoryLabel,
} from '../../data/reference';
import type { Meetup, MeetupCategory } from '../../data/types';

/* ------------------------------------------------------------------ */
/*  How it works copy per category                                      */
/* ------------------------------------------------------------------ */

function howItWorksBullets(category: MeetupCategory, lang: 'es' | 'en'): string[] {
  const bullets: Record<MeetupCategory, { es: string[]; en: string[] }> = {
    Café: {
      es: [
        'Llegas, te dan una credencial con tus idiomas y tu nombre.',
        'Se rota de mesa cada veinte minutos — así conoces a todos.',
        'Sin agenda fija: habla de lo que quieras, en el idioma que quieras.',
      ],
      en: [
        'You arrive and get a name tag with your languages on it.',
        'Tables rotate every twenty minutes — you end up meeting everyone.',
        'No fixed agenda: talk about whatever you like, in any language.',
      ],
    },
    Coworking: {
      es: [
        'Las primeras dos horas son de trabajo en silencio — como en cualquier coworking.',
        'La última hora es de conversación libre en los idiomas que quieras practicar.',
        'Trae auriculares y tu propio ordenador.',
      ],
      en: [
        'The first two hours are quiet work time — like any coworking session.',
        'The last hour is open conversation in whatever languages you want to practise.',
        'Bring headphones and your own laptop.',
      ],
    },
    Playa: {
      es: [
        'Nos encontramos en la entrada principal del lugar.',
        'Caminamos por la orilla cambiando de idioma cada quince minutos.',
        'Nada de agenda rígida — trae agua y gorra.',
      ],
      en: [
        'We meet at the main entrance of the venue.',
        'We walk along the shore and switch languages every fifteen minutes.',
        'No rigid agenda — bring water and a hat.',
      ],
    },
    Bachata: {
      es: [
        'Arrancamos con una clase básica en español — no hace falta saber bailar.',
        'Después del calentamiento, practicamos idiomas mientras bailamos.',
        'El ambiente es relajado; nadie te juzga el nivel.',
      ],
      en: [
        'We start with a basic bachata lesson in Spanish — no dance experience needed.',
        'After the warm-up, we practise languages while we dance.',
        'The vibe is relaxed; no one judges your level.',
      ],
    },
    Networking: {
      es: [
        'Cada persona se presenta en dos minutos en el idioma de su elección.',
        'Después hay tiempo libre para conversar en grupos pequeños.',
        'Trae tarjetas si tienes, pero no es obligatorio.',
      ],
      en: [
        'Each person does a two-minute intro in whatever language they choose.',
        'Then it’s open time for small-group conversations.',
        'Bring business cards if you have them — not required.',
      ],
    },
  };
  return bullets[category]?.[lang] ?? bullets.Café[lang];
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

export default function EventDetail() {
  const t = useT();
  const { lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findMeetup, isGoing, toggleRsvp } = useStore();

  const meetup = findMeetup(id ?? '');

  const [reminderState, setReminderState] = useState<
    'idle' | 'scheduling' | 'scheduled' | 'denied' | 'past' | 'unsupported' | 'error'
  >('idle');
  const [reminderTime, setReminderTime] = useState<string | null>(null);

  if (!meetup) {
    return (
      <Screen edges={['top']}>
        <View style={{ padding: space.base }}>
          <BackButton onPress={() => router.back()} />
          <Spacer h={space.xxl} />
          <Txt variant="h2" style={{ textAlign: 'center' }}>
            {t({ es: 'Encuentro no encontrado', en: 'Meetup not found' })}
          </Txt>
          <Spacer h={space.base} />
          <Txt variant="body" style={{ textAlign: 'center' }}>
            {t({
              es: 'Este encuentro ya no existe o fue cancelado.',
              en: 'This meetup no longer exists or was cancelled.',
            })}
          </Txt>
          <Spacer h={space.xl} />
          <Button
            label={t({ es: 'Ver todos los encuentros', en: 'See all meetups' })}
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  const venue = venueById(meetup.venueId);
  const photo = venue ? venuePhoto(venue.photoSeed) : venuePhoto('cafe');
  const host = meetup.hostId !== null ? partnerById(meetup.hostId) : null;
  const going = isGoing(meetup.id);
  const spotsLeft = meetup.capacity - meetup.going;
  const fillPct = meetup.going / meetup.capacity;
  const bullets = howItWorksBullets(meetup.category, lang);

  async function handleRsvp() {
    const nowGoing = toggleRsvp(meetup!.id);
    if (nowGoing) {
      haptics.success();
    } else {
      haptics.impact();
    }
  }

  async function handleReminder() {
    setReminderState('scheduling');
    const title = t(meetup!.title);
    const body = t({
      es: `Recuerda: ${t(meetup!.title)} en ${venueName(meetup!.venueId)} — ¡nos vemos en dos horas!`,
      en: `Reminder: ${t(meetup!.title)} at ${venueName(meetup!.venueId)} — see you in two hours!`,
    });
    const result = await scheduleMeetupReminder(title, body, meetup!.startsAt);
    if (result.ok) {
      setReminderTime(formatTime(result.at.toISOString(), lang));
      setReminderState('scheduled');
    } else {
      setReminderState(result.reason);
    }
  }

  function handleShare() {
    const msg = t({
      es: `¡Únete al encuentro "${t(meetup!.title)}" en NómadaLingo! ${meetup!.when.es} en ${venueName(meetup!.venueId)}, ${meetup!.area}.`,
      en: `Join the meetup "${t(meetup!.title)}" on NómadaLingo! ${meetup!.when.en} at ${venueName(meetup!.venueId)}, ${meetup!.area}.`,
    });
    void shareText(msg, t(meetup!.title));
  }

  function reminderLabel(): string {
    switch (reminderState) {
      case 'scheduling':
        return t({ es: 'Configurando…', en: 'Setting up…' });
      case 'scheduled':
        return reminderTime
          ? t({ es: `Recordatorio a las ${reminderTime}`, en: `Reminder at ${reminderTime}` })
          : t({ es: 'Recordatorio activo', en: 'Reminder set' });
      case 'denied':
        return t({
          es: 'Permiso denegado — actívalo en Ajustes',
          en: 'Permission denied — enable in Settings',
        });
      case 'past':
        return t({
          es: 'Este encuentro ya está muy cerca',
          en: 'This meetup is too soon for a reminder',
        });
      case 'unsupported':
        return t({
          es: 'Los recordatorios funcionan en la app del teléfono',
          en: 'Reminders work in the phone app',
        });
      case 'error':
        return t({ es: 'No se pudo configurar', en: 'Could not set reminder' });
      default:
        return t({ es: 'Recordarme', en: 'Remind me' });
    }
  }

  const reminderDone = reminderState !== 'idle' && reminderState !== 'scheduling';

  return (
    <Screen edges={[]} style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Photo header */}
        <View style={{ height: 220, position: 'relative' }}>
          <Image
            source={photo}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
            transition={220}
          />
          {/* Dark scrim at top for button legibility */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
            pointerEvents="none"
          />
          {/* Back button overlay */}
          <View
            style={{
              position: 'absolute',
              top: 52,
              left: space.base,
            }}
          >
            <BackButton onPress={() => router.back()} tint="white" />
          </View>
          {/* Share button */}
          <PressableScale
            onPress={handleShare}
            style={{
              position: 'absolute',
              top: 52,
              right: space.base,
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

        {/* Content */}
        <View style={{ padding: space.base, gap: space.xl }}>
          {/* Title + category */}
          <View style={{ gap: space.sm }}>
            <Row gap={space.sm} wrap>
              <Tag label={`${categoryEmoji(meetup.category)} ${categoryLabel(meetup.category, lang)}`} tone="sand" />
              {meetup.userCreated && (
                <Tag label={t({ es: 'Tuyo', en: 'Yours' })} tone="accent" />
              )}
            </Row>
            <Txt variant="h1">{t(meetup.title)}</Txt>
            {/* Venue row — tappable */}
            <PressableScale onPress={() => router.push(`/venue/${meetup.venueId}`)}>
              <Row gap={space.xs} align="center">
                <PinIcon size={14} c={color.accent} />
                <Txt variant="bodyStrong" c={color.accent}>
                  {venueName(meetup.venueId)}
                </Txt>
              </Row>
            </PressableScale>
          </View>

          <Divider />

          {/* When and where */}
          <View style={{ gap: space.md }}>
            <Txt variant="h3">{t({ es: 'Cuándo y dónde', en: 'When and where' })}</Txt>
            <Row gap={space.sm} align="flex-start">
              <ClockIcon size={16} c={color.textTertiary} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="bodyStrong">{t(meetup.when)}</Txt>
                <Txt variant="body">
                  {formatLongDate(meetup.startsAt, lang)}
                  {' · '}
                  {formatTime(meetup.startsAt, lang)}
                </Txt>
              </View>
            </Row>
            <Row gap={space.sm} align="flex-start">
              <PinIcon size={16} c={color.textTertiary} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="bodyStrong">{venueName(meetup.venueId)}</Txt>
                <Txt variant="body">{meetup.area}</Txt>
              </View>
            </Row>
          </View>

          <Divider />

          {/* Who's going */}
          <View style={{ gap: space.md }}>
            <Txt variant="h3">{t({ es: 'Quién va', en: "Who's going" })}</Txt>
            <View style={{ gap: space.sm }}>
              {/* Avatar stack */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {meetup.attendees.slice(0, 5).map((id, i) => {
                  const p = partnerById(id);
                  return (
                    <View
                      key={id}
                      style={{
                        marginLeft: i === 0 ? 0 : -12,
                        borderWidth: 2,
                        borderColor: color.surface,
                        borderRadius: 18,
                        zIndex: meetup.attendees.length - i,
                      }}
                    >
                      <Avatar
                        seed={p?.avatarSeed ?? String(id)}
                        tint={avatarTint(id)}
                        size={36}
                      />
                    </View>
                  );
                })}
                {meetup.attendees.length > 5 && (
                  <View
                    style={{
                      marginLeft: -12,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: palette.sand2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: color.surface,
                    }}
                  >
                    <Text style={{ fontFamily: font.bold, fontSize: 11, color: color.textSecondary }}>
                      +{meetup.attendees.length - 5}
                    </Text>
                  </View>
                )}
              </View>

              <Txt variant="body">
                {t({
                  es: `${meetup.going} de ${meetup.capacity} personas`,
                  en: `${meetup.going} of ${meetup.capacity} people`,
                })}
              </Txt>
              <ProgressBar value={fillPct} height={6} />
            </View>
          </View>

          <Divider />

          {/* How it works */}
          <View style={{ gap: space.md }}>
            <Txt variant="h3">{t({ es: 'Cómo funciona', en: 'How it works' })}</Txt>
            {bullets.map((bullet, i) => (
              <Row key={i} gap={space.md} align="flex-start">
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: palette.tealLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontFamily: font.bold, fontSize: 11, color: color.accent }}>
                    {i + 1}
                  </Text>
                </View>
                <Txt variant="body" style={{ flex: 1 }}>
                  {bullet}
                </Txt>
              </Row>
            ))}
          </View>

          {/* Host row */}
          {host && (
            <>
              <Divider />
              <View style={{ gap: space.md }}>
                <Txt variant="h3">{t({ es: 'Anfitrión', en: 'Host' })}</Txt>
                <Row gap={space.md} align="center">
                  <Avatar seed={host.avatarSeed} tint={avatarTint(host.id)} size={48} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Row gap={space.xs} align="center">
                      <Txt variant="bodyStrong">{host.name}</Txt>
                      <VerifiedIcon size={16} c={color.accent} />
                    </Row>
                    <Txt variant="caption" c={color.textTertiary}>
                      {t(host.role)}
                    </Txt>
                    <Txt variant="caption" c={color.accent}>
                      {t({ es: 'Anfitrión verificado', en: 'Verified host' })}
                    </Txt>
                  </View>
                </Row>
              </View>
            </>
          )}

          <Divider />

          {/* Safety block — plain pan-Hispanic, no slang, no emoji */}
          <View
            style={{
              backgroundColor: palette.sand1,
              borderRadius: radius.md,
              padding: space.base,
              gap: space.sm,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: color.border,
            }}
          >
            <Row gap={space.sm} align="center">
              <ShieldIcon size={16} c={color.textSecondary} />
              <Txt variant="label">{t({ es: 'Seguridad', en: 'Safety' })}</Txt>
            </Row>
            <Txt variant="body">
              {t({
                es: 'Reúnanse en el lugar público indicado. Informe a alguien de confianza adónde va. Puede reportar o bloquear a cualquier persona desde su perfil en cualquier momento.',
                en: 'Meet at the public venue listed. Let someone you trust know where you are going. You can report or block anyone from their profile at any time.',
              })}
            </Txt>
          </View>

          {/* Reminder status (shown when not idle) */}
          {reminderState !== 'idle' && (
            <View
              style={{
                backgroundColor:
                  reminderState === 'scheduled' ? palette.tealLight : palette.sand1,
                borderRadius: radius.md,
                padding: space.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor:
                  reminderState === 'scheduled' ? palette.tealDark : color.border,
              }}
            >
              <Txt
                variant="caption"
                c={reminderState === 'scheduled' ? palette.tealDarker : color.textTertiary}
              >
                {reminderLabel()}
              </Txt>
            </View>
          )}

          <Disclosure
            text={t({
              es: 'Los perfiles de asistentes son personas ilustrativas, no reales. Información investigada en 2026 y sujeta a cambios.',
              en: 'Attendee profiles are illustrative personas, not real people. Information researched in 2026, subject to change.',
            })}
          />
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: color.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: color.border,
            padding: space.base,
            gap: space.sm,
          },
          shadow.lifted,
        ]}
      >
        <Row gap={space.sm}>
          {/* RSVP button */}
          <View style={{ flex: 1 }}>
            <Button
              label={
                going
                  ? t({ es: '✓ Ya voy', en: '✓ Going' })
                  : t({ es: 'Voy a ir', en: "I'm going" })
              }
              variant={going ? 'secondary' : 'primary'}
              onPress={handleRsvp}
            />
          </View>

          {/* Reminder button */}
          <View style={{ flex: 1 }}>
            <Button
              label={reminderDone ? reminderLabel() : t({ es: 'Recordarme', en: 'Remind me' })}
              variant="secondary"
              icon={<BellIcon size={16} c={color.textPrimary} />}
              onPress={handleReminder}
              disabled={reminderDone}
            />
          </View>
        </Row>
      </View>
    </Screen>
  );
}

