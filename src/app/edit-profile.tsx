/**
 * Edit profile screen.
 *
 * Saves on change via updateProfile, so there is no "save" state to lose.
 * The exception is the text fields which fire on blur to avoid spamming
 * the store on every keystroke.
 *
 * KeyboardAwareScrollView keeps focused fields visible above the keyboard.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';

import {
  Screen,
  Row,
  Spacer,
  Divider,
  Txt,
  SectionHeader,
  PressableScale,
  Button,
  Card,
  Chip,
  Avatar,
  LevelDots,
  Field,
  ScreenHeader,
} from '../components/ui';
import { CameraIcon, CheckIcon } from '../components/icons';
import { color, palette, radius, space, font, shadow } from '../theme/tokens';
import { useT, useLang } from '../lib/i18n';
import { useStore } from '../lib/store';
import * as haptics from '../lib/haptics';
import { pickAvatar, detectArea } from '../lib/device';
import {
  LANGUAGES,
  LEVELS,
  INTERESTS,
  AVAILABILITY,
  AREA_NAMES,
  USER_KINDS,
  MEET_PREFS,
  langLabel,
  langFlag,
  levelLabel,
  levelDots,
  interestLabel,
  interestEmoji,
  availLabel,
} from '../data/reference';
import type { LangCode, Level, LangSkill, AreaName } from '../data/types';

const AGE_BANDS = ['18–24', '25–34', '35–44', '45–54', '55+'] as const;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NL';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type PhotoStatus =
  | { kind: 'idle' }
  | { kind: 'denied' }
  | { kind: 'error' };

type AreaStatus =
  | { kind: 'idle' }
  | { kind: 'detected'; area: AreaName; km: number }
  | { kind: 'denied' }
  | { kind: 'unavailable' };

export default function EditProfileScreen() {
  const t = useT();
  useLang(); // lang context — t() reads it internally
  const { profile, updateProfile } = useStore();

  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>({ kind: 'idle' });
  const [areaStatus, setAreaStatus] = useState<AreaStatus>({ kind: 'idle' });

  // Local draft for text fields — flushed on blur
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [bioDraft, setBioDraft] = useState(profile.bio);
  const [untilDraft, setUntilDraft] = useState(
    profile.until ? isoToDdMmYyyy(profile.until) : '',
  );
  const [untilError, setUntilError] = useState<string | null>(null);

  /* ── helpers ── */

  function flushName() {
    if (nameDraft !== profile.name) updateProfile({ name: nameDraft });
  }
  function flushBio() {
    if (bioDraft !== profile.bio) updateProfile({ bio: bioDraft });
  }
  function flushUntil() {
    if (!untilDraft) {
      updateProfile({ until: null });
      setUntilError(null);
      return;
    }
    const iso = ddMmYyyyToIso(untilDraft);
    if (!iso) {
      setUntilError(t({ es: 'Usa el formato DD/MM/AAAA', en: 'Use the format DD/MM/YYYY' }));
      return;
    }
    setUntilError(null);
    updateProfile({ until: iso });
  }

  /* ── photo picker ── */

  const handlePickPhoto = useCallback(async () => {
    const result = await pickAvatar();
    if (result.ok) {
      updateProfile({ photo: result.uri });
      haptics.success();
      setPhotoStatus({ kind: 'idle' });
    } else if (result.reason === 'denied') {
      setPhotoStatus({ kind: 'denied' });
    } else if (result.reason === 'cancelled') {
      // do nothing
    } else {
      setPhotoStatus({ kind: 'error' });
    }
  }, [updateProfile]);

  /* ── area detection ── */

  const handleDetectArea = useCallback(async () => {
    const result = await detectArea();
    if (result.ok) {
      updateProfile({ area: result.area });
      haptics.success();
      setAreaStatus({ kind: 'detected', area: result.area, km: result.km });
    } else if (result.reason === 'denied') {
      setAreaStatus({ kind: 'denied' });
    } else {
      setAreaStatus({ kind: 'unavailable' });
    }
  }, [updateProfile]);

  /* ── language skill helpers ── */

  function toggleExtra(code: LangCode) {
    const current = profile.extra ?? [];
    const exists = current.find((ls) => ls.code === code);
    if (exists) {
      updateProfile({ extra: current.filter((ls) => ls.code !== code) });
    } else {
      updateProfile({ extra: [...current, { code, level: 'B1' as Level }] });
    }
    haptics.light();
  }

  function setExtraLevel(code: LangCode, level: Level) {
    const current = profile.extra ?? [];
    updateProfile({
      extra: current.map((ls) => (ls.code === code ? { ...ls, level } : ls)),
    });
    haptics.light();
  }

  function toggleLearning(code: LangCode) {
    const current = profile.learning ?? [];
    const exists = current.find((ls) => ls.code === code);
    if (exists) {
      updateProfile({ learning: current.filter((ls) => ls.code !== code) });
    } else {
      updateProfile({ learning: [...current, { code, level: 'A1' as Level }] });
    }
    haptics.light();
  }

  function setLearningLevel(code: LangCode, level: Level) {
    const current = profile.learning ?? [];
    updateProfile({
      learning: current.map((ls) => (ls.code === code ? { ...ls, level } : ls)),
    });
    haptics.light();
  }

  const avatarTint = palette.teal;
  const avatarSeed = profile.name.trim() ? initials(profile.name) : 'NL';

  return (
    <Screen edges={['top']} style={{ flex: 1 }}>
      <ScreenHeader
        title={t({ es: 'Editar perfil', en: 'Edit profile' })}
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 48 }}
      >
        {/* ── Photo picker ── */}
        <Spacer h={space.lg} />
        <View style={{ alignItems: 'center' }}>
          <View style={{ position: 'relative' }}>
            <Avatar
              seed={avatarSeed}
              tint={avatarTint}
              size={88}
              photo={profile.photo ?? undefined}
            />
            <PressableScale
              onPress={handlePickPhoto}
              style={{
                position: 'absolute',
                bottom: 0,
                right: -4,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: color.accent,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: color.bg,
              }}
            >
              <CameraIcon size={15} c="#fff" />
            </PressableScale>
          </View>
          <Spacer h={space.sm} />
          <PressableScale onPress={handlePickPhoto}>
            <Txt variant="label" c={color.accent}>
              {t({ es: 'Cambiar foto', en: 'Change photo' })}
            </Txt>
          </PressableScale>
          {photoStatus.kind === 'denied' && (
            <Txt variant="caption" style={{ textAlign: 'center', marginTop: space.xs, maxWidth: 280 }}>
              {t({
                es: 'Necesitamos acceso a tus fotos. Habilítalo en Ajustes del dispositivo › Privacidad.',
                en: 'We need access to your photos. Enable it in device Settings › Privacy.',
              })}
            </Txt>
          )}
          {photoStatus.kind === 'error' && (
            <Txt variant="caption" c={color.highlight} style={{ textAlign: 'center', marginTop: space.xs }}>
              {t({ es: 'Algo salió mal. Inténtalo de nuevo.', en: 'Something went wrong. Please try again.' })}
            </Txt>
          )}
        </View>

        <Spacer h={space.xl} />

        {/* ── Name ── */}
        <Field
          label={t({ es: 'Nombre', en: 'Name' })}
          value={nameDraft}
          onChangeText={setNameDraft}
          onBlur={flushName}
          placeholder={t({ es: 'Tu nombre completo', en: 'Your full name' })}
          returnKeyType="next"
          autoCorrect={false}
        />

        <Spacer h={space.base} />

        {/* ── Bio ── */}
        <Field
          label={t({ es: 'Bio', en: 'Bio' })}
          value={bioDraft}
          onChangeText={setBioDraft}
          onBlur={flushBio}
          placeholder={t({
            es: 'Cuéntale a la gente de qué vas — idiomas, trabajo, lo que sea que te mueva.',
            en: 'Tell people what you are about — languages, work, whatever moves you.',
          })}
          multiline
          numberOfLines={4}
          style={{ height: 100, paddingTop: 12, textAlignVertical: 'top' }}
        />

        <Spacer h={space.xl} />

        {/* ── Age band ── */}
        <SectionHeader title={t({ es: 'Rango de edad', en: 'Age range' })} />
        <Row wrap gap={space.sm}>
          {AGE_BANDS.map((band) => (
            <Chip
              key={band}
              label={band}
              selected={profile.age === band}
              onPress={() => {
                updateProfile({ age: band });
                haptics.light();
              }}
            />
          ))}
        </Row>

        <Spacer h={space.xl} />

        {/* ── I am ── */}
        <SectionHeader title={t({ es: 'Soy…', en: 'I am…' })} />
        <Row wrap gap={space.sm}>
          {USER_KINDS.map((kind) => (
            <Chip
              key={kind.key}
              label={t(kind.label)}
              emoji={kind.emoji}
              selected={profile.kind === kind.key}
              onPress={() => {
                updateProfile({ kind: kind.key });
                haptics.light();
              }}
            />
          ))}
        </Row>

        {/* Visiting until — only when visitor */}
        {profile.kind === 'visitor' && (
          <>
            <Spacer h={space.base} />
            <Field
              label={t({ es: 'En Punta Cana hasta (DD/MM/AAAA)', en: 'In Punta Cana until (DD/MM/YYYY)' })}
              value={untilDraft}
              onChangeText={(v) => {
                setUntilDraft(v);
                setUntilError(null);
              }}
              onBlur={flushUntil}
              placeholder="31/08/2026"
              keyboardType="numeric"
              error={untilError}
            />
          </>
        )}

        <Spacer h={space.xl} />

        {/* ── Native language ── */}
        <SectionHeader title={t({ es: 'Idioma nativo', en: 'Native language' })} />
        <Row wrap gap={space.sm}>
          {LANGUAGES.map((lang_item) => (
            <Chip
              key={lang_item.code}
              label={t(lang_item.label)}
              emoji={lang_item.flag}
              selected={profile.native === lang_item.code}
              onPress={() => {
                updateProfile({ native: lang_item.code });
                haptics.light();
              }}
            />
          ))}
        </Row>

        <Spacer h={space.xl} />

        {/* ── Other languages I teach ── */}
        <SectionHeader title={t({ es: 'Otros idiomas que enseño', en: 'Other languages I teach' })} />
        <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.md }}>
          {t({ es: 'Selecciona los idiomas y elige tu nivel.', en: 'Select the languages and pick your level.' })}
        </Txt>
        {LANGUAGES.filter((l) => l.code !== profile.native).map((lang_item) => {
          const selected = (profile.extra ?? []).find((ls) => ls.code === lang_item.code);
          return (
            <View key={lang_item.code}>
              <Chip
                label={`${lang_item.flag} ${t(lang_item.label)}`}
                selected={!!selected}
                onPress={() => toggleExtra(lang_item.code)}
              />
              {selected && (
                <View style={{ marginTop: space.sm, marginBottom: space.sm }}>
                  <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.xs }}>
                    {t({ es: 'Nivel', en: 'Level' })}
                  </Txt>
                  <Row wrap gap={space.sm}>
                    {LEVELS.filter((l) => l !== 'Nativo').map((level) => (
                      <Chip
                        key={level}
                        label={level}
                        small
                        selected={selected.level === level}
                        onPress={() => setExtraLevel(lang_item.code, level)}
                      />
                    ))}
                  </Row>
                </View>
              )}
              <Spacer h={space.sm} />
            </View>
          );
        })}

        <Spacer h={space.xl} />

        {/* ── Learning ── */}
        <SectionHeader title={t({ es: 'Estoy aprendiendo', en: "I'm learning" })} />
        <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.md }}>
          {t({ es: 'Selecciona los idiomas y elige tu nivel actual.', en: 'Select the languages and pick your current level.' })}
        </Txt>
        {LANGUAGES.map((lang_item) => {
          const selected = (profile.learning ?? []).find((ls) => ls.code === lang_item.code);
          return (
            <View key={lang_item.code}>
              <Chip
                label={`${lang_item.flag} ${t(lang_item.label)}`}
                selected={!!selected}
                onPress={() => toggleLearning(lang_item.code)}
              />
              {selected && (
                <View style={{ marginTop: space.sm, marginBottom: space.sm }}>
                  <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.xs }}>
                    {t({ es: 'Nivel actual', en: 'Current level' })}
                  </Txt>
                  <Row wrap gap={space.sm}>
                    {LEVELS.filter((l) => l !== 'Nativo').map((level) => (
                      <Chip
                        key={level}
                        label={level}
                        small
                        selected={selected.level === level}
                        onPress={() => setLearningLevel(lang_item.code, level)}
                      />
                    ))}
                  </Row>
                </View>
              )}
              <Spacer h={space.sm} />
            </View>
          );
        })}

        <Spacer h={space.xl} />

        {/* ── Interests ── */}
        <SectionHeader title={t({ es: 'Intereses', en: 'Interests' })} />
        <Row wrap gap={space.sm}>
          {INTERESTS.map((interest) => (
            <Chip
              key={interest.key}
              label={t(interest.label)}
              emoji={interest.emoji}
              selected={(profile.interests ?? []).includes(interest.key)}
              onPress={() => {
                const current = profile.interests ?? [];
                const has = current.includes(interest.key);
                updateProfile({
                  interests: has
                    ? current.filter((k) => k !== interest.key)
                    : [...current, interest.key],
                });
                haptics.light();
              }}
            />
          ))}
        </Row>

        <Spacer h={space.xl} />

        {/* ── Area ── */}
        <SectionHeader title={t({ es: 'Zona', en: 'Area' })} />
        <Row wrap gap={space.sm}>
          {AREA_NAMES.map((area) => (
            <Chip
              key={area}
              label={area}
              selected={profile.area === area}
              onPress={() => {
                updateProfile({ area });
                haptics.light();
                setAreaStatus({ kind: 'idle' });
              }}
            />
          ))}
        </Row>
        <Spacer h={space.md} />
        <Button
          label={t({ es: 'Detectar mi zona', en: 'Detect my area' })}
          onPress={handleDetectArea}
          variant="secondary"
          full={false}
        />
        {areaStatus.kind === 'detected' && (
          <Txt variant="caption" c={color.accent} style={{ marginTop: space.xs }}>
            {t({
              es: `Estás en ${areaStatus.area}, a ${areaStatus.km} km del centro de la zona.`,
              en: `You are in ${areaStatus.area}, ${areaStatus.km} km from the zone centre.`,
            })}
          </Txt>
        )}
        {areaStatus.kind === 'denied' && (
          <Txt variant="caption" style={{ marginTop: space.xs, maxWidth: 280 }}>
            {t({
              es: 'Necesitamos acceso a tu ubicación. Habilítalo en Ajustes › Privacidad.',
              en: 'We need location access. Enable it in Settings › Privacy.',
            })}
          </Txt>
        )}
        {areaStatus.kind === 'unavailable' && (
          <Txt variant="caption" style={{ marginTop: space.xs }}>
            {t({
              es: 'No se pudo determinar tu ubicación. Selecciona la zona manualmente.',
              en: 'Could not determine your location. Please select the area manually.',
            })}
          </Txt>
        )}

        <Spacer h={space.xl} />

        {/* ── Availability ── */}
        <SectionHeader title={t({ es: 'Disponibilidad', en: 'Availability' })} />
        <Row wrap gap={space.sm}>
          {AVAILABILITY.map((av) => (
            <Chip
              key={av.key}
              label={t(av.label)}
              selected={(profile.availability ?? []).includes(av.key)}
              onPress={() => {
                const current = profile.availability ?? [];
                const has = current.includes(av.key);
                updateProfile({
                  availability: has
                    ? current.filter((k) => k !== av.key)
                    : [...current, av.key],
                });
                haptics.light();
              }}
            />
          ))}
        </Row>

        <Spacer h={space.xl} />

        {/* ── Meeting preference ── */}
        <SectionHeader title={t({ es: 'Preferencia de encuentro', en: 'Meeting preference' })} />
        <Row wrap gap={space.sm}>
          {MEET_PREFS.map((pref) => (
            <Chip
              key={pref.key}
              label={t(pref.label)}
              selected={profile.meetPref === pref.key}
              onPress={() => {
                updateProfile({ meetPref: pref.key });
                haptics.light();
              }}
            />
          ))}
        </Row>

        <Spacer h={space.xxl} />
      </KeyboardAwareScrollView>
    </Screen>
  );
}

/* ── date helpers ── */

function ddMmYyyyToIso(s: string): string | null {
  // Accept DD/MM/AAAA or DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isoToDdMmYyyy(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '';
  }
}
