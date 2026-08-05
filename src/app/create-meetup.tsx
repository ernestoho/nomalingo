/**
 * Create meetup — presented as a modal.
 *
 * The user picks a real venue from the directory. There is no free-text
 * location field. Home addresses are not allowed.
 *
 * Safety copy (venue picker note) is plain pan-Hispanic, no slang, no emoji.
 */

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import {
  Screen,
  Row,
  Txt,
  PressableScale,
  Button,
  Chip,
  ScreenHeader,
  Field,
} from '../components/ui';
import { CheckIcon, SearchIcon } from '../components/icons';
import {
  color,
  palette,
  radius,
  space,
  font,
} from '../theme/tokens';

import { useT, useLang } from '../lib/i18n';
import { useStore } from '../lib/store';
import * as haptics from '../lib/haptics';

import { VENUES, venueById } from '../data/venues';
import {
  MEETUP_CATEGORIES,
  LANGUAGES,
  langLabel,
  categoryEmoji,
  categoryLabel,
  venueTypeLabel,
} from '../data/reference';
import { nextWeekday } from '../data/meetups';
import type { LangCode, MeetupCategory, Meetup } from '../data/types';

/* ------------------------------------------------------------------ */
/*  Day and hour options                                                */
/* ------------------------------------------------------------------ */

const DAYS = [
  { dow: 1, es: 'Lun', en: 'Mon' },
  { dow: 2, es: 'Mar', en: 'Tue' },
  { dow: 3, es: 'Mié', en: 'Wed' },
  { dow: 4, es: 'Jue', en: 'Thu' },
  { dow: 5, es: 'Vie', en: 'Fri' },
  { dow: 6, es: 'Sáb', en: 'Sat' },
  { dow: 0, es: 'Dom', en: 'Sun' },
];

type HourOption = { hour: number; minute: number; es: string; en: string };

const HOURS: HourOption[] = [
  { hour: 7, minute: 0, es: '7:00 a.m.', en: '7:00 AM' },
  { hour: 9, minute: 0, es: '9:00 a.m.', en: '9:00 AM' },
  { hour: 12, minute: 0, es: '12:00 p.m.', en: '12:00 PM' },
  { hour: 15, minute: 0, es: '3:00 p.m.', en: '3:00 PM' },
  { hour: 17, minute: 0, es: '5:00 p.m.', en: '5:00 PM' },
  { hour: 18, minute: 0, es: '6:00 p.m.', en: '6:00 PM' },
  { hour: 19, minute: 0, es: '7:00 p.m.', en: '7:00 PM' },
  { hour: 20, minute: 0, es: '8:00 p.m.', en: '8:00 PM' },
];

const CAPACITY_OPTIONS = [6, 10, 12, 16, 20, 25];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Full day names for the `when` bilingual string. */
const DAY_NAME_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_NAME_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWhen(dow: number, hourOption: HourOption): { es: string; en: string } {
  return {
    es: `${DAY_NAME_ES[dow]} ${hourOption.es}`,
    en: `${DAY_NAME_EN[dow]} ${hourOption.en}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Venue picker row                                                    */
/* ------------------------------------------------------------------ */

function VenueRow({
  venueId,
  selected,
  onPress,
  lang,
}: {
  venueId: string;
  selected: boolean;
  onPress: () => void;
  lang: 'es' | 'en';
}) {
  const venue = venueById(venueId);
  if (!venue) return null;

  return (
    <PressableScale
      onPress={onPress}
      style={[
        {
          paddingHorizontal: space.base,
          paddingVertical: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          backgroundColor: selected ? palette.tealLight : 'transparent',
          borderRadius: radius.md,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{venue.name}</Txt>
        <Txt variant="caption" c={color.textTertiary}>
          {venueTypeLabel(venue.type, lang)} · {venue.area}
        </Txt>
      </View>
      {selected && <CheckIcon size={18} c={color.accent} />}
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

export default function CreateMeetup() {
  const t = useT();
  const { lang } = useLang();
  const { createMeetup } = useStore();
  const params = useLocalSearchParams<{ venue?: string }>();

  // Field state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MeetupCategory | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(params.venue ?? null);
  const [venueSearch, setVenueSearch] = useState('');
  const [selectedDow, setSelectedDow] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<HourOption | null>(null);
  const [languages, setLanguages] = useState<LangCode[]>([]);
  const [capacity, setCapacity] = useState<number>(12);
  const [description, setDescription] = useState('');

  // Validation
  const [submitted, setSubmitted] = useState(false);

  const titleError =
    submitted && title.trim().length < 4
      ? t({ es: 'Mínimo 4 caracteres', en: 'At least 4 characters' })
      : null;
  const categoryError = submitted && !category
    ? t({ es: 'Elige una categoría', en: 'Choose a category' })
    : null;
  const venueError = submitted && !selectedVenueId
    ? t({ es: 'Selecciona un lugar del directorio', en: 'Select a venue from the directory' })
    : null;
  const dayError = submitted && selectedDow === null
    ? t({ es: 'Elige un día', en: 'Choose a day' })
    : null;
  const hourError = submitted && !selectedHour
    ? t({ es: 'Elige una hora', en: 'Choose a time' })
    : null;
  const languagesError = submitted && languages.length === 0
    ? t({ es: 'Elige al menos un idioma', en: 'Choose at least one language' })
    : null;

  const isValid =
    title.trim().length >= 4 &&
    category !== null &&
    selectedVenueId !== null &&
    selectedDow !== null &&
    selectedHour !== null &&
    languages.length > 0;

  // Filtered venues for picker
  const filteredVenues = useMemo(() => {
    const q = venueSearch.toLowerCase().trim();
    if (!q) return VENUES;
    return VENUES.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.area.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q),
    );
  }, [venueSearch]);

  function toggleLanguage(code: LangCode) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;

    const venue = venueById(selectedVenueId!);
    if (!venue) return;

    const startsAt = nextWeekday(selectedDow!, selectedHour!.hour, selectedHour!.minute);
    const when = buildWhen(selectedDow!, selectedHour!);

    const descText = description.trim() || '';
    const descL = { es: descText, en: descText };

    const created = createMeetup({
      category: category!,
      title: { es: title.trim(), en: title.trim() },
      venueId: selectedVenueId!,
      area: venue.area,
      when,
      startsAt,
      going: 1,
      capacity,
      languages,
      attendees: [],
      description: descL,
      hostId: null,
    });

    haptics.success();
    router.replace(`/event/${created.id}`);
  }

  return (
    <Screen edges={['top']} style={{ flex: 1 }}>
      <ScreenHeader
        title={t({ es: 'Nuevo encuentro', en: 'New meetup' })}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        bottomOffset={space.xxl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.base, gap: space.xl, paddingBottom: space.huge * 2 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* Título */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Título *', en: 'Title *' })}
          </Txt>
          <Field
            value={title}
            onChangeText={setTitle}
            placeholder={t({
              es: 'p. ej. Café de las 6 con hablantes de inglés',
              en: 'e.g. 6 o’clock coffee with English speakers',
            })}
            error={titleError}
            maxLength={80}
          />
        </View>

        {/* Categoría */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Categoría *', en: 'Category *' })}
          </Txt>
          <Row gap={space.sm} wrap>
            {MEETUP_CATEGORIES.map((cat) => (
              <Chip
                key={cat.key}
                label={t(cat.label)}
                emoji={cat.emoji}
                selected={category === cat.key}
                onPress={() => setCategory(cat.key)}
              />
            ))}
          </Row>
          {categoryError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.highlight }}>
              {categoryError}
            </Text>
          )}
        </View>

        {/* Lugar */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Lugar *', en: 'Venue *' })}
          </Txt>

          {/* Search field */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              height: 50,
              borderRadius: radius.md,
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: venueError ? color.highlight : color.border,
              paddingHorizontal: space.base,
            }}
          >
            <SearchIcon size={16} c={color.textTertiary} />
            <TextInput
              value={venueSearch}
              onChangeText={setVenueSearch}
              placeholder={t({
                es: 'Buscar por nombre o zona…',
                en: 'Search by name or area…',
              })}
              placeholderTextColor={color.textTertiary}
              style={{
                flex: 1,
                fontFamily: font.regular,
                fontSize: 15,
                color: color.textPrimary,
              }}
            />
          </View>

          {/* Venue list */}
          <View
            style={{
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: venueError ? color.highlight : color.border,
              backgroundColor: color.surface,
              maxHeight: 260,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: space.xs }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredVenues.map((v, i) => (
                <React.Fragment key={v.id}>
                  {i > 0 && (
                    <View
                      style={{
                        marginHorizontal: space.base,
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: color.border,
                      }}
                    />
                  )}
                  <VenueRow
                    venueId={v.id}
                    selected={selectedVenueId === v.id}
                    onPress={() => setSelectedVenueId(v.id)}
                    lang={lang}
                  />
                </React.Fragment>
              ))}
              {filteredVenues.length === 0 && (
                <View style={{ padding: space.base }}>
                  <Txt variant="caption" c={color.textTertiary}>
                    {t({ es: 'Sin resultados', en: 'No results' })}
                  </Txt>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Selected venue display */}
          {selectedVenueId && (
            <View
              style={{
                backgroundColor: palette.tealLight,
                borderRadius: radius.md,
                padding: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
              }}
            >
              <CheckIcon size={16} c={color.accent} />
              <Txt variant="bodyStrong" c={palette.tealDarker}>
                {venueById(selectedVenueId)?.name}
              </Txt>
            </View>
          )}

          {/* Safety note — plain, no emoji, no slang */}
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: color.textTertiary,
              lineHeight: 17,
            }}
          >
            {t({
              es: 'Solo lugares públicos del directorio. No se permiten direcciones particulares.',
              en: 'Public venues from the directory only. Home addresses are not allowed.',
            })}
          </Text>

          {venueError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.highlight }}>
              {venueError}
            </Text>
          )}
        </View>

        {/* Día */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Día *', en: 'Day *' })}
          </Txt>
          <Row gap={space.sm} wrap>
            {DAYS.map((d) => (
              <Chip
                key={d.dow}
                label={lang === 'es' ? d.es : d.en}
                selected={selectedDow === d.dow}
                onPress={() => setSelectedDow(d.dow)}
              />
            ))}
          </Row>
          {dayError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.highlight }}>
              {dayError}
            </Text>
          )}
        </View>

        {/* Hora */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Hora *', en: 'Time *' })}
          </Txt>
          <Row gap={space.sm} wrap>
            {HOURS.map((h) => (
              <Chip
                key={`${h.hour}:${h.minute}`}
                label={lang === 'es' ? h.es : h.en}
                selected={selectedHour?.hour === h.hour && selectedHour?.minute === h.minute}
                onPress={() => setSelectedHour(h)}
              />
            ))}
          </Row>
          {hourError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.highlight }}>
              {hourError}
            </Text>
          )}
        </View>

        {/* Idiomas */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Idiomas * (al menos uno)', en: 'Languages * (at least one)' })}
          </Txt>
          <Row gap={space.sm} wrap>
            {LANGUAGES.map((l) => (
              <Chip
                key={l.code}
                label={t(l.label)}
                emoji={l.flag}
                selected={languages.includes(l.code)}
                onPress={() => toggleLanguage(l.code)}
              />
            ))}
          </Row>
          {languagesError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.highlight }}>
              {languagesError}
            </Text>
          )}
        </View>

        {/* Capacidad */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Capacidad', en: 'Capacity' })}
          </Txt>
          <Row gap={space.sm} wrap>
            {CAPACITY_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={capacity === n}
                onPress={() => setCapacity(n)}
              />
            ))}
          </Row>
        </View>

        {/* Descripción */}
        <View style={{ gap: space.sm }}>
          <Txt variant="label" c={color.textSecondary}>
            {t({ es: 'Descripción (opcional)', en: 'Description (optional)' })}
          </Txt>
          <Field
            value={description}
            onChangeText={setDescription}
            placeholder={t({
              es: 'Cuéntale al coro de qué va el encuentro, qué esperar, qué traer…',
              en: 'Tell everyone what the meetup is about, what to expect, what to bring…',
            })}
            multiline
            numberOfLines={4}
            style={{ height: 100, paddingTop: space.md, textAlignVertical: 'top' }}
          />
        </View>

        {/* Preview of when string */}
        {selectedDow !== null && selectedHour !== null && (
          <View
            style={{
              backgroundColor: palette.sand1,
              borderRadius: radius.md,
              padding: space.md,
              gap: 4,
            }}
          >
            <Txt variant="caption" c={color.textTertiary}>
              {t({ es: 'Cuándo', en: 'When' })}
            </Txt>
            <Txt variant="bodyStrong">
              {lang === 'es'
                ? buildWhen(selectedDow, selectedHour).es
                : buildWhen(selectedDow, selectedHour).en}
            </Txt>
            {selectedVenueId && (
              <Txt variant="caption" c={color.textTertiary}>
                {venueById(selectedVenueId)?.name}
                {' · '}
                {venueById(selectedVenueId)?.area}
              </Txt>
            )}
          </View>
        )}

        {/* Submit */}
        <Button
          label={t({ es: 'Crear encuentro', en: 'Create meetup' })}
          onPress={handleSubmit}
          disabled={submitted && !isValid}
        />

        {/* Missing fields hint after failed submit */}
        {submitted && !isValid && (
          <View
            style={{
              backgroundColor: palette.coralLight,
              borderRadius: radius.md,
              padding: space.md,
              gap: space.xs,
            }}
          >
            <Txt variant="label" c={color.highlight}>
              {t({ es: 'Completa estos campos:', en: 'Complete these fields:' })}
            </Txt>
            {title.trim().length < 4 && (
              <Txt variant="caption" c={color.highlight}>{'• '}{t({ es: 'Título (mínimo 4 caracteres)', en: 'Title (at least 4 characters)' })}</Txt>
            )}
            {!category && (
              <Txt variant="caption" c={color.highlight}>{'• '}{t({ es: 'Categoría', en: 'Category' })}</Txt>
            )}
            {!selectedVenueId && (
              <Txt variant="caption" c={color.highlight}>{'• '}{t({ es: 'Lugar', en: 'Venue' })}</Txt>
            )}
            {selectedDow === null && (
              <Txt variant="caption" c={color.highlight}>{'• '}{t({ es: 'Día', en: 'Day' })}</Txt>
            )}
            {!selectedHour && (
              <Txt variant="caption" c={color.highlight}>{'• '}{t({ es: 'Hora', en: 'Time' })}</Txt>
            )}
            {languages.length === 0 && (
              <Txt variant="caption" c={color.highlight}>{'• '}{t({ es: 'Al menos un idioma', en: 'At least one language' })}</Txt>
            )}
          </View>
        )}

      </KeyboardAwareScrollView>
    </Screen>
  );
}
