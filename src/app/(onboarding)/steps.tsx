/**
 * Onboarding steps — 6-step wizard after sign up.
 *
 * Collected in a single screen with local state so we can enforce the
 * "disabled until valid" contract without a route per step.
 *
 * Step 1  — Who are you (kind)
 * Step 2  — Native language
 * Step 3  — Learning + level
 * Step 4  — Interests (≥ 2)
 * Step 5  — Area + availability + (visiting until, visitors only)
 * Step 6  — Connection preferences + community rules
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  BackButton,
  Button,
  Chip,
  ProgressBar,
  PressableScale,
  Row,
  Spacer,
  Txt,
} from '../../components/ui';
import { color, font, palette, radius, shadow, space } from '../../theme/tokens';
import { useLang, useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import * as haptics from '../../lib/haptics';
import {
  AREA_NAMES,
  AVAILABILITY,
  CONNECTION_MODES,
  INTERESTS,
  LANGUAGES,
  LEVELS,
  MEET_PREFS,
  USER_KINDS,
  levelLabel,
} from '../../data/reference';
import type { AreaName, LangCode, LangSkill, Level, MeetPref, UserKind } from '../../data/types';

const TOTAL_STEPS = 6;

// Minimal date parser: dd/mm/yyyy → ISO string. Returns null if invalid.
function parseDDMMYYYY(raw: string): string | null {
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(d)
  )
    return null;
  return date.toISOString();
}

export default function StepsScreen() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { profile, completeOnboarding } = useStore();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);

  // Step 1
  const [kind, setKind] = useState<UserKind | null>(null);
  // Step 2
  const [native, setNative] = useState<LangCode | null>(null);
  // Step 3
  const [learning, setLearning] = useState<LangSkill[]>([]);
  // Step 4
  const [interests, setInterests] = useState<string[]>([]);
  // Step 5
  const [area, setArea] = useState<AreaName | null>(null);
  const [availability, setAvailability] = useState<string[]>([]);
  const [untilRaw, setUntilRaw] = useState('');
  const [untilErr, setUntilErr] = useState<string | null>(null);
  // Step 6
  const [connectionModes, setConnectionModes] = useState<string[]>([]);
  const [meetPref, setMeetPref] = useState<MeetPref | null>(null);
  const [rules, setRules] = useState({ r1: false, r2: false, r3: false });

  // Step validity
  /**
   * Why the Continue button is disabled, in plain language.
   *
   * A greyed-out button with no explanation is the most common way an
   * onboarding flow silently strands someone -- especially on step 5, where
   * the blocker (the visiting-until date) can sit below the fold on a small
   * phone.
   */
  function blockedReason(s: number): string | null {
    switch (s) {
      case 1:
        return kind === null ? t({ es: 'Elige una opción', en: 'Pick one option' }) : null;
      case 2:
        return native === null
          ? t({ es: 'Elige tu idioma nativo', en: 'Pick your native language' })
          : null;
      case 3:
        if (learning.length === 0)
          return t({ es: 'Elige al menos un idioma', en: 'Pick at least one language' });
        if (!learning.every((l) => l.level !== undefined))
          return t({ es: 'Elige tu nivel en cada idioma', en: 'Pick your level for each language' });
        return null;
      case 4:
        return interests.length < 2
          ? t({ es: 'Elige al menos dos intereses', en: 'Pick at least two interests' })
          : null;
      case 5:
        if (!area) return t({ es: 'Elige tu zona', en: 'Pick your area' });
        if (availability.length === 0)
          return t({ es: 'Elige cuándo estás libre', en: 'Pick when you are free' });
        if (kind === 'visitor' && !untilRaw)
          return t({ es: 'Falta hasta cuándo estás aquí', en: 'Add how long you are here for' });
        if (kind === 'visitor' && !parseDDMMYYYY(untilRaw))
          return t({ es: 'Usa el formato DD/MM/AAAA', en: 'Use the format DD/MM/YYYY' });
        return null;
      case 6:
        if (connectionModes.length === 0)
          return t({ es: 'Elige cómo prefieres conectar', en: 'Pick how you like to connect' });
        if (meetPref === null)
          return t({ es: 'Elige dónde quieres practicar', en: 'Pick where you want to practise' });
        if (!rules.r1 || !rules.r2 || !rules.r3)
          return t({ es: 'Acepta las tres reglas para continuar', en: 'Accept the three rules to continue' });
        return null;
      default:
        return null;
    }
  }

  function stepValid(s: number): boolean {
    switch (s) {
      case 1:
        return kind !== null;
      case 2:
        return native !== null;
      case 3:
        return learning.length > 0 && learning.every((l) => l.level !== undefined);
      case 4:
        return interests.length >= 2;
      case 5: {
        if (!area || availability.length === 0) return false;
        if (kind === 'visitor') {
          if (!untilRaw) return false;
          if (!parseDDMMYYYY(untilRaw)) return false;
        }
        return true;
      }
      case 6:
        return (
          connectionModes.length > 0 &&
          meetPref !== null &&
          rules.r1 &&
          rules.r2 &&
          rules.r3
        );
      default:
        return false;
    }
  }

  function advance() {
    if (!stepValid(step)) return;
    haptics.impact();
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      finishOnboarding();
    }
  }

  function goBack() {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }

  function finishOnboarding() {
    haptics.success();
    const untilIso = kind === 'visitor' && untilRaw ? parseDDMMYYYY(untilRaw) : null;

    completeOnboarding({
      name: profile.name || '',
      email: profile.email || '',
      age: profile.age || '25–34',
      nationality: profile.nationality || '',
      flag: kind === 'local' ? '🇩🇴' : '🌎',
      kind: kind!,
      native: native!,
      extra: [],
      learning,
      interests,
      area: area!,
      availability,
      until: untilIso,
      meetPref: meetPref!,
      bio: profile.bio || '',
      photo: profile.photo || null,
    });

    router.replace('/(tabs)');
  }

  function toggleLearningLang(code: LangCode) {
    setLearning((prev) => {
      const has = prev.some((l) => l.code === code);
      if (has) return prev.filter((l) => l.code !== code);
      return [...prev, { code, level: 'A1' as Level }];
    });
  }

  function setLearningLevel(code: LangCode, level: Level) {
    setLearning((prev) =>
      prev.map((l) => (l.code === code ? { ...l, level } : l)),
    );
  }

  function toggleInterest(key: string) {
    setInterests((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  }

  function toggleAvailability(key: string) {
    setAvailability((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  }

  function toggleConnectionMode(key: string) {
    setConnectionModes((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  }

  const continueLabel =
    step < TOTAL_STEPS
      ? t({ es: 'Continuar', en: 'Continue' })
      : t({ es: 'Empezar', en: "Let's go" });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header row: back + progress */}
      <View style={styles.headerRow}>
        <BackButton onPress={goBack} />
        <View style={styles.progressWrap}>
          <ProgressBar value={step / TOTAL_STEPS} height={5} />
          <Text style={styles.progressLabel}>
            {step} / {TOTAL_STEPS}
          </Text>
        </View>
      </View>

      {/* Scrollable step content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <Step1
            t={t}
            lang={lang}
            kind={kind}
            onSelect={(k) => setKind(k)}
          />
        )}
        {step === 2 && (
          <Step2
            t={t}
            lang={lang}
            native={native}
            onSelect={(c) => setNative(c)}
          />
        )}
        {step === 3 && (
          <Step3
            t={t}
            lang={lang}
            native={native}
            learning={learning}
            onToggleLang={toggleLearningLang}
            onSetLevel={setLearningLevel}
          />
        )}
        {step === 4 && (
          <Step4
            t={t}
            lang={lang}
            interests={interests}
            onToggle={toggleInterest}
          />
        )}
        {step === 5 && (
          <Step5
            t={t}
            lang={lang}
            kind={kind}
            area={area}
            onSelectArea={(a) => setArea(a)}
            availability={availability}
            onToggleAvail={toggleAvailability}
            untilRaw={untilRaw}
            onUntilChange={(v) => {
              setUntilRaw(v);
              setUntilErr(null);
            }}
            untilErr={untilErr}
            onUntilBlur={() => {
              if (untilRaw && !parseDDMMYYYY(untilRaw)) {
                setUntilErr(
                  lang === 'es'
                    ? 'Fecha no válida (DD/MM/AAAA)'
                    : 'Invalid date (DD/MM/YYYY)',
                );
              }
            }}
          />
        )}
        {step === 6 && (
          <Step6
            t={t}
            lang={lang}
            connectionModes={connectionModes}
            onToggleMode={toggleConnectionMode}
            meetPref={meetPref}
            onSetMeetPref={(p) => setMeetPref(p)}
            rules={rules}
            onToggleRule={(k) =>
              setRules((prev) => ({ ...prev, [k]: !prev[k] }))
            }
          />
        )}
      </ScrollView>

      {/* Pinned bottom button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + space.base },
        ]}
      >
        {blockedReason(step) ? (
          <Text style={styles.blockedHint}>{blockedReason(step)}</Text>
        ) : null}
        <Button
          label={continueLabel}
          onPress={advance}
          disabled={!stepValid(step)}
          variant="primary"
        />
      </View>
    </View>
  );
}

/* ============================== Step 1 — Who are you ============================== */

function Step1({
  t,
  lang,
  kind,
  onSelect,
}: {
  t: (p: { es: string; en: string }) => string;
  lang: 'es' | 'en';
  kind: UserKind | null;
  onSelect: (k: UserKind) => void;
}) {
  return (
    <View>
      <Txt variant="h1">{t({ es: '¿Quién eres?', en: 'Who are you?' })}</Txt>
      <Spacer h={space.sm} />
      <Txt variant="body" c={color.textTertiary}>
        {t({
          es: 'Cuéntanos un poco sobre ti para conectarte mejor.',
          en: 'Tell us a bit about yourself so we can connect you better.',
        })}
      </Txt>
      <Spacer h={space.xl} />

      {USER_KINDS.map((k) => {
        const selected = kind === k.key;
        return (
          <PressableScale
            key={k.key}
            onPress={() => onSelect(k.key)}
            style={[
              styles.kindCard,
              selected && styles.kindCardSelected,
            ]}
          >
            <Text style={styles.kindEmoji}>{k.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.kindLabel,
                  selected && { color: color.onAccent },
                ]}
              >
                {k.label[lang]}
              </Text>
              <Text
                style={[
                  styles.kindSub,
                  selected && { color: 'rgba(255,255,255,0.78)' },
                ]}
              >
                {k.sub[lang]}
              </Text>
            </View>
            {selected && (
              <View style={styles.checkCircle}>
                <Text style={{ color: color.accent, fontSize: 13 }}>✓</Text>
              </View>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ============================== Step 2 — Native language ============================== */

function Step2({
  t,
  lang,
  native,
  onSelect,
}: {
  t: (p: { es: string; en: string }) => string;
  lang: 'es' | 'en';
  native: LangCode | null;
  onSelect: (c: LangCode) => void;
}) {
  return (
    <View>
      <Txt variant="h1">{t({ es: '¿Tu idioma nativo?', en: 'Your native language?' })}</Txt>
      <Spacer h={space.sm} />
      <Txt variant="body" c={color.textTertiary}>
        {t({
          es: 'El idioma que hablas desde siempre.',
          en: 'The language you have spoken all your life.',
        })}
      </Txt>
      <Spacer h={space.xl} />

      <Row wrap gap={space.sm}>
        {LANGUAGES.map((l) => (
          <Chip
            key={l.code}
            label={l.label[lang]}
            emoji={l.flag}
            selected={native === l.code}
            onPress={() => onSelect(l.code)}
          />
        ))}
      </Row>
    </View>
  );
}

/* ============================== Step 3 — Learning + levels ============================== */

function Step3({
  t,
  lang,
  native,
  learning,
  onToggleLang,
  onSetLevel,
}: {
  t: (p: { es: string; en: string }) => string;
  lang: 'es' | 'en';
  native: LangCode | null;
  learning: LangSkill[];
  onToggleLang: (c: LangCode) => void;
  onSetLevel: (c: LangCode, l: Level) => void;
}) {
  const available = LANGUAGES.filter((l) => l.code !== native);

  return (
    <View>
      <Txt variant="h1">{t({ es: '¿Qué estás aprendiendo?', en: 'What are you learning?' })}</Txt>
      <Spacer h={space.sm} />
      <Txt variant="body" c={color.textTertiary}>
        {t({
          es: 'Selecciona uno o más idiomas y elige tu nivel.',
          en: 'Pick one or more languages and choose your level.',
        })}
      </Txt>
      <Spacer h={space.xl} />

      <Row wrap gap={space.sm}>
        {available.map((l) => {
          const isSelected = learning.some((x) => x.code === l.code);
          return (
            <Chip
              key={l.code}
              label={l.label[lang]}
              emoji={l.flag}
              selected={isSelected}
              onPress={() => onToggleLang(l.code)}
            />
          );
        })}
      </Row>

      {learning.length > 0 && (
        <>
          <Spacer h={space.xl} />
          {learning.map((skill) => {
            const langInfo = LANGUAGES.find((l) => l.code === skill.code);
            return (
              <View key={skill.code} style={styles.levelBlock}>
                <Text style={styles.levelLangLabel}>
                  {langInfo?.flag} {langInfo?.label[lang]}
                </Text>
                <Spacer h={space.sm} />
                <Row wrap gap={space.sm}>
                  {LEVELS.map((lv) => (
                    <Chip
                      key={lv}
                      label={levelLabel(lv, lang)}
                      selected={skill.level === lv}
                      onPress={() => onSetLevel(skill.code, lv)}
                      small
                    />
                  ))}
                </Row>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

/* ============================== Step 4 — Interests ============================== */

function Step4({
  t,
  lang,
  interests,
  onToggle,
}: {
  t: (p: { es: string; en: string }) => string;
  lang: 'es' | 'en';
  interests: string[];
  onToggle: (k: string) => void;
}) {
  return (
    <View>
      <Txt variant="h1">{t({ es: '¿Qué te gusta?', en: 'What are you into?' })}</Txt>
      <Spacer h={space.sm} />
      <Txt variant="body" c={color.textTertiary}>
        {t({
          es: 'Elige al menos 2. Te ayuda a encontrar personas afines.',
          en: 'Choose at least 2. It helps you find like-minded people.',
        })}
      </Txt>
      <Spacer h={space.xl} />

      <Row wrap gap={space.sm}>
        {INTERESTS.map((item) => (
          <Chip
            key={item.key}
            label={item.label[lang]}
            emoji={item.emoji}
            selected={interests.includes(item.key)}
            onPress={() => onToggle(item.key)}
          />
        ))}
      </Row>

      {interests.length > 0 && interests.length < 2 && (
        <>
          <Spacer h={space.base} />
          <Text style={styles.hintText}>
            {t({ es: 'Elige al menos uno más', en: 'Pick at least one more' })}
          </Text>
        </>
      )}
    </View>
  );
}

/* ============================== Step 5 — Area + availability ============================== */

function Step5({
  t,
  lang,
  kind,
  area,
  onSelectArea,
  availability,
  onToggleAvail,
  untilRaw,
  onUntilChange,
  untilErr,
  onUntilBlur,
}: {
  t: (p: { es: string; en: string }) => string;
  lang: 'es' | 'en';
  kind: UserKind | null;
  area: AreaName | null;
  onSelectArea: (a: AreaName) => void;
  availability: string[];
  onToggleAvail: (k: string) => void;
  untilRaw: string;
  onUntilChange: (v: string) => void;
  untilErr: string | null;
  onUntilBlur: () => void;
}) {
  return (
    <View>
      <Txt variant="h1">{t({ es: '¿Dónde y cuándo?', en: 'Where and when?' })}</Txt>
      <Spacer h={space.sm} />
      <Txt variant="body" c={color.textTertiary}>
        {t({
          es: 'Tu zona y cuándo sueles estar disponible.',
          en: 'Your area and when you are usually free.',
        })}
      </Txt>
      <Spacer h={space.xl} />

      <Text style={styles.sectionLabel}>
        {t({ es: 'Zona', en: 'Area' })}
      </Text>
      <Spacer h={space.sm} />
      <Row wrap gap={space.sm}>
        {AREA_NAMES.map((a) => (
          <Chip
            key={a}
            label={a}
            selected={area === a}
            onPress={() => onSelectArea(a)}
          />
        ))}
      </Row>

      <Spacer h={space.xl} />

      <Text style={styles.sectionLabel}>
        {t({ es: 'Disponibilidad', en: 'Availability' })}
      </Text>
      <Spacer h={space.sm} />
      <Row wrap gap={space.sm}>
        {AVAILABILITY.map((av) => (
          <Chip
            key={av.key}
            label={av.label[lang]}
            selected={availability.includes(av.key)}
            onPress={() => onToggleAvail(av.key)}
          />
        ))}
      </Row>

      {kind === 'visitor' && (
        <>
          <Spacer h={space.xl} />
          <Text style={styles.sectionLabel}>
            {t({ es: '¿Hasta cuándo estás aquí?', en: 'Visiting until?' })}
          </Text>
          <Spacer h={space.sm} />
          <TextInput
            value={untilRaw}
            onChangeText={onUntilChange}
            onBlur={onUntilBlur}
            placeholder={lang === 'es' ? 'DD/MM/AAAA' : 'DD/MM/YYYY'}
            placeholderTextColor={color.textTertiary}
            keyboardType="numbers-and-punctuation"
            style={[
              styles.dateInput,
              untilErr ? { borderColor: color.highlight } : null,
            ]}
          />
          {untilErr ? (
            <Text style={styles.fieldError}>{untilErr}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

/* ============================== Step 6 — Connection prefs + rules ============================== */

function Step6({
  t,
  lang,
  connectionModes,
  onToggleMode,
  meetPref,
  onSetMeetPref,
  rules,
  onToggleRule,
}: {
  t: (p: { es: string; en: string }) => string;
  lang: 'es' | 'en';
  connectionModes: string[];
  onToggleMode: (k: string) => void;
  meetPref: MeetPref | null;
  onSetMeetPref: (p: MeetPref) => void;
  rules: { r1: boolean; r2: boolean; r3: boolean };
  onToggleRule: (k: 'r1' | 'r2' | 'r3') => void;
}) {
  return (
    <View>
      <Txt variant="h1">{t({ es: 'Preferencias', en: 'Preferences' })}</Txt>
      <Spacer h={space.sm} />
      <Txt variant="body" c={color.textTertiary}>
        {t({
          es: 'Cuéntanos cómo prefieres conectar con la gente.',
          en: 'Tell us how you prefer to connect with people.',
        })}
      </Txt>
      <Spacer h={space.xl} />

      <Text style={styles.sectionLabel}>
        {t({ es: 'Formas de conectar', en: 'Ways to connect' })}
      </Text>
      <Spacer h={space.sm} />
      <Row wrap gap={space.sm}>
        {CONNECTION_MODES.map((m) => (
          <Chip
            key={m.key}
            label={m.label[lang]}
            emoji={m.emoji}
            selected={connectionModes.includes(m.key)}
            onPress={() => onToggleMode(m.key)}
          />
        ))}
      </Row>

      <Spacer h={space.xl} />

      <Text style={styles.sectionLabel}>
        {t({ es: '¿Dónde quieres practicar?', en: 'Where do you want to practise?' })}
      </Text>
      <Spacer h={space.sm} />
      <Row wrap gap={space.sm}>
        {MEET_PREFS.map((mp) => (
          <Chip
            key={mp.key}
            label={mp.label[lang]}
            selected={meetPref === mp.key}
            onPress={() => onSetMeetPref(mp.key)}
          />
        ))}
      </Row>

      <Spacer h={space.xxl} />

      {/* Community rules — safety copy: plain, pan-Hispanic, no emoji, no jokes */}
      <View style={styles.rulesBlock}>
        <Text style={styles.rulesTitle}>
          {t({ es: 'Normas de la comunidad', en: 'Community rules' })}
        </Text>
        <Spacer h={space.base} />

        <RuleRow
          checked={rules.r1}
          onToggle={() => onToggleRule('r1')}
          heading={t({ es: 'Respeto primero.', en: 'Respect first.' })}
          body={t({
            es: 'Trata a todo el mundo como tratarías a un vecino.',
            en: 'Treat everyone the way you would treat a neighbour.',
          })}
        />

        <View style={styles.ruleDivider} />

        <RuleRow
          checked={rules.r2}
          onToggle={() => onToggleRule('r2')}
          heading={t({
            es: 'Esto no es una app de citas.',
            en: 'This is not a dating app.',
          })}
          body={t({
            es: 'Aquí se viene a practicar idiomas y hacer amistades.',
            en: 'People come here to practise languages and make friends.',
          })}
        />

        <View style={styles.ruleDivider} />

        <RuleRow
          checked={rules.r3}
          onToggle={() => onToggleRule('r3')}
          heading={t({
            es: 'Nos vemos en lugares públicos.',
            en: 'We meet in public places.',
          })}
          body={t({
            es: 'Los encuentros son siempre en lugares abiertos al público.',
            en: 'Meetups always happen in places open to the public.',
          })}
        />
      </View>
    </View>
  );
}

function RuleRow({
  checked,
  onToggle,
  heading,
  body,
}: {
  checked: boolean;
  onToggle: () => void;
  heading: string;
  body: string;
}) {
  return (
    <PressableScale onPress={onToggle} style={styles.ruleRow} quiet>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleHeading}>{heading}</Text>
        <Text style={styles.ruleBody}>{body}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.base,
    paddingHorizontal: space.base,
    paddingTop: space.sm,
    paddingBottom: space.base,
  },
  progressWrap: {
    flex: 1,
    gap: 6,
  },
  progressLabel: {
    fontFamily: font.medium,
    fontSize: 11,
    color: color.textTertiary,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.base,
    paddingTop: space.sm,
  },
  blockedHint: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: color.textTertiary,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  bottomBar: {
    paddingHorizontal: space.base,
    paddingTop: space.base,
    backgroundColor: color.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },

  // Step 1 — kind cards
  kindCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.base,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.border,
    padding: space.base,
    marginBottom: space.md,
    ...shadow.card,
  },
  kindCardSelected: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  kindEmoji: {
    fontSize: 28,
  },
  kindLabel: {
    fontFamily: font.bold,
    fontSize: 15.5,
    color: color.textPrimary,
    marginBottom: 3,
  },
  kindSub: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.textTertiary,
    lineHeight: 18,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Step 3 — level blocks
  levelBlock: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space.base,
    marginBottom: space.md,
    ...shadow.card,
  },
  levelLangLabel: {
    fontFamily: font.bold,
    fontSize: 14,
    color: color.textPrimary,
  },

  // Shared
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: 13,
    color: color.textSecondary,
    letterSpacing: 0.1,
  },
  hintText: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: color.textTertiary,
  },

  // Step 5 — date input
  dateInput: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.base,
    fontFamily: font.regular,
    fontSize: 15,
    color: color.textPrimary,
  },
  fieldError: {
    fontFamily: font.medium,
    fontSize: 12,
    color: color.highlight,
    marginTop: 4,
  },

  // Step 6 — rules
  rulesBlock: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  rulesTitle: {
    fontFamily: font.bold,
    fontSize: 13.5,
    color: color.textSecondary,
    paddingHorizontal: space.base,
    paddingTop: space.base,
    letterSpacing: 0.2,
  },
  ruleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
    marginHorizontal: space.base,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.base,
    padding: space.base,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  checkboxTick: {
    color: palette.white,
    fontSize: 12,
    fontFamily: font.bold,
  },
  ruleHeading: {
    fontFamily: font.bold,
    fontSize: 14,
    color: color.textPrimary,
    marginBottom: 3,
  },
  ruleBody: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.textSecondary,
    lineHeight: 19,
  },
});
