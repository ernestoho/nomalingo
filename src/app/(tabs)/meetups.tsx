/**
 * Meetups tab — "Encuentros | Lugares"
 *
 * Two segments: community meetups and the venue directory. The SegmentedControl
 * keeps them in one tab because "where do people meet this week" is a single
 * question, not two navigation destinations.
 */

import React, { useState, useMemo } from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import {
  Screen,
  Row,
  Spacer,
  Divider,
  Txt,
  Button,
  Card,
  Chip,
  Tag,
  SegmentedControl,
  Avatar,
  EmptyState,
  Disclosure,
} from '../../components/ui';
import {
  PinIcon,
  ClockIcon,
  StarIcon,
  PlusIcon,
} from '../../components/icons';
import {
  color,
  palette,
  radius,
  space,
  font,
  categoryTint,
} from '../../theme/tokens';

import { useT, useLang } from '../../lib/i18n';
import { useStore } from '../../lib/store';

import { partnerById, avatarTint } from '../../data/partners';
import { VENUES } from '../../data/venues';
import { venuePhoto } from '../../data/photos';
import {
  AREA_NAMES,
  MEETUP_CATEGORIES,
  VENUE_TYPES,
  langLabel,
  categoryEmoji,
  categoryLabel,
  venueTypeLabel,
  amenityLabel,
  amenityEmoji,
} from '../../data/reference';
import { venueName } from '../../data/venues';
import type { Meetup, MeetupCategory, VenueType, AreaName } from '../../data/types';

/* ------------------------------------------------------------------ */
/*  Meetup card                                                         */
/* ------------------------------------------------------------------ */

function MeetupCard({ meetup, onPress }: { meetup: Meetup; onPress: () => void }) {
  const t = useT();
  const { lang } = useLang();

  const tint = categoryTint[meetup.category] ?? palette.tealLight;
  const emoji = categoryEmoji(meetup.category);
  const spotsLeft = meetup.capacity - meetup.going;
  const venName = venueName(meetup.venueId);

  // Build attendee avatar stack (first 3–4)
  const displayAttendees = meetup.attendees.slice(0, 4);
  const extraCount = meetup.attendees.length - displayAttendees.length;

  return (
    <Card onPress={onPress} style={{ marginBottom: space.md }} padded={false}>
      {/* Category header */}
      <View
        style={{
          backgroundColor: tint,
          paddingHorizontal: space.base,
          paddingVertical: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
        }}
      >
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>
            {t(meetup.title)}
          </Txt>
          <Txt variant="caption" c={color.textTertiary}>
            {categoryLabel(meetup.category, lang)}
          </Txt>
        </View>
        {meetup.userCreated && (
          <Tag label={t({ es: 'Tuyo', en: 'Yours' })} tone="accent" />
        )}
      </View>

      {/* Body */}
      <View style={{ padding: space.base, gap: space.md }}>
        {/* Venue / area row */}
        <Row gap={space.sm} align="center">
          <PinIcon size={14} c={color.textTertiary} />
          <Txt variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {venName}
          </Txt>
        </Row>

        {/* Time row */}
        <Row gap={space.sm} align="center">
          <ClockIcon size={14} c={color.textTertiary} />
          <Txt variant="caption">{t(meetup.when)}</Txt>
        </Row>

        {/* Language tags */}
        <Row gap={space.xs} wrap>
          {meetup.languages.map((code) => (
            <Tag key={code} label={langLabel(code, lang)} tone="sand" />
          ))}
        </Row>

        <Divider />

        {/* Attendees + spots */}
        <Row justify="space-between" align="center">
          {/* Avatar stack */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {displayAttendees.map((id, i) => {
              const partner = partnerById(id);
              return (
                <View
                  key={id}
                  style={{
                    marginLeft: i === 0 ? 0 : -10,
                    borderWidth: 2,
                    borderColor: color.surface,
                    borderRadius: 14,
                    zIndex: displayAttendees.length - i,
                  }}
                >
                  <Avatar
                    seed={partner?.avatarSeed ?? String(id)}
                    tint={avatarTint(id)}
                    size={28}
                  />
                </View>
              );
            })}
            {extraCount > 0 && (
              <View
                style={{
                  marginLeft: -10,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: palette.sand2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: color.surface,
                  zIndex: 0,
                }}
              >
                <Text
                  style={{ fontFamily: font.bold, fontSize: 9.5, color: color.textSecondary }}
                >
                  +{extraCount}
                </Text>
              </View>
            )}
          </View>

          {/* Spots left */}
          <View style={{ alignItems: 'flex-end' }}>
            {spotsLeft <= 3 ? (
              <Tag
                label={t({ es: `${spotsLeft} lugares`, en: `${spotsLeft} spots left` })}
                tone="coral"
              />
            ) : (
              <Txt variant="caption" c={color.textTertiary}>
                {t({ es: `${spotsLeft} lugares`, en: `${spotsLeft} spots left` })}
              </Txt>
            )}
          </View>
        </Row>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Venue card                                                          */
/* ------------------------------------------------------------------ */

function VenueCard({ venue, onPress }: { venue: (typeof VENUES)[number]; onPress: () => void }) {
  const t = useT();
  const { lang } = useLang();

  const photo = venuePhoto(venue.photoSeed);
  const firstThreeAmenities = venue.amenities.slice(0, 3);

  return (
    <Card onPress={onPress} style={{ marginBottom: space.md }} padded={false}>
      {/* Photo header */}
      <Image
        source={photo}
        style={{ width: '100%', height: 120, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}
        contentFit="cover"
            transition={220}
      />

      {/* Body */}
      <View style={{ padding: space.base, gap: space.sm }}>
        <Row justify="space-between" align="flex-start">
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="h3" numberOfLines={1}>
              {venue.name}
            </Txt>
            <Txt variant="caption" c={color.textTertiary}>
              {venueTypeLabel(venue.type, lang)} · {venue.area}
            </Txt>
          </View>
          {venue.sponsorDeal && (
            <Tag label={t({ es: 'Aliado', en: 'Partner' })} tone="accent" />
          )}
        </Row>

        {/* Rating */}
        <Row gap={space.xs} align="center">
          {venue.rating !== null ? (
            <>
              <StarIcon size={13} c={palette.gold} filled />
              <Txt variant="caption">{venue.rating.toFixed(1)}</Txt>
            </>
          ) : (
            <Txt variant="caption" c={color.textTertiary}>
              {t({ es: 'Sin reseñas', en: 'No reviews' })}
            </Txt>
          )}
        </Row>

        {/* Amenity tags */}
        <Row gap={space.xs} wrap>
          {firstThreeAmenities.map((key) => (
            <Tag
              key={key}
              label={`${amenityEmoji(key)} ${amenityLabel(key, lang)}`}
              tone="sand"
            />
          ))}
        </Row>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Encuentros segment                                                  */
/* ------------------------------------------------------------------ */

function EncuentrosSegment() {
  const t = useT();
  const { lang } = useLang();
  const { meetups } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<MeetupCategory | 'Todos'>('Todos');

  const filtered = useMemo(
    () =>
      selectedCategory === 'Todos'
        ? meetups
        : meetups.filter((m) => m.category === selectedCategory),
    [meetups, selectedCategory],
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Category chips */}
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingVertical: space.md,
          gap: space.sm,
        }}
      >
        <Chip
          label={t({ es: 'Todos', en: 'All' })}
          selected={selectedCategory === 'Todos'}
          onPress={() => setSelectedCategory('Todos')}
        />
        {MEETUP_CATEGORIES.map((cat) => (
          <Chip
            key={cat.key}
            label={t(cat.label)}
            emoji={cat.emoji}
            selected={selectedCategory === cat.key}
            onPress={() => setSelectedCategory(cat.key)}
          />
        ))}
      </ScrollView>

      {/* Create meetup button */}
      <View style={{ paddingHorizontal: space.base, paddingBottom: space.md }}>
        <Button
          label={t({ es: 'Crear encuentro', en: 'Create meetup' })}
          icon={<PlusIcon size={18} c={color.onAccent} />}
          onPress={() => router.push('/create-meetup')}
        />
      </View>

      {/* Meetup list */}
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingBottom: space.huge + space.xl,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MeetupCard
            meetup={item}
            onPress={() => router.push(`/event/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="📅"
            title={t({ es: 'Sin encuentros aquí', en: 'No meetups here' })}
            body={t({
              es: '¿Por qué no creas el primero en esta categoría?',
              en: 'Why not create the first one in this category?',
            })}
            actionLabel={t({ es: 'Crear encuentro', en: 'Create meetup' })}
            onAction={() => router.push('/create-meetup')}
          />
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Lugares segment                                                     */
/* ------------------------------------------------------------------ */

function LugaresSegment() {
  const t = useT();
  const { lang } = useLang();

  const [selectedType, setSelectedType] = useState<VenueType | 'Todos'>('Todos');
  const [selectedArea, setSelectedArea] = useState<AreaName | 'Todas'>('Todas');
  const [soloAliados, setSoloAliados] = useState(false);

  const filtered = useMemo(() => {
    return VENUES.filter((v) => {
      if (selectedType !== 'Todos' && v.type !== selectedType) return false;
      if (selectedArea !== 'Todas' && v.area !== selectedArea) return false;
      if (soloAliados && v.sponsorDeal === null) return false;
      return true;
    });
  }, [selectedType, selectedArea, soloAliados]);

  return (
    <View style={{ flex: 1 }}>
      {/* Type filter chips */}
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingTop: space.md,
          paddingBottom: space.xs,
          gap: space.sm,
        }}
      >
        <Chip
          label={t({ es: 'Todos', en: 'All' })}
          selected={selectedType === 'Todos'}
          onPress={() => setSelectedType('Todos')}
        />
        {VENUE_TYPES.map((vt) => (
          <Chip
            key={vt.key}
            label={t(vt.label)}
            emoji={vt.emoji}
            selected={selectedType === vt.key}
            onPress={() => setSelectedType(vt.key as VenueType)}
          />
        ))}
      </ScrollView>

      {/* Area filter chips */}
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingVertical: space.xs,
          gap: space.sm,
        }}
      >
        <Chip
          label={t({ es: 'Todas', en: 'All areas' })}
          small
          selected={selectedArea === 'Todas'}
          onPress={() => setSelectedArea('Todas')}
        />
        {AREA_NAMES.map((area) => (
          <Chip
            key={area}
            label={area}
            small
            selected={selectedArea === area}
            onPress={() => setSelectedArea(area)}
          />
        ))}
      </ScrollView>

      {/* Solo aliados toggle chip */}
      <View
        style={{
          paddingHorizontal: space.base,
          paddingBottom: space.md,
          paddingTop: space.xs,
        }}
      >
        <Chip
          label={t({ es: 'Solo aliados', en: 'Sponsors only' })}
          selected={soloAliados}
          onPress={() => setSoloAliados((v) => !v)}
          tone="accent"
          small
        />
      </View>

      {/* Venue list */}
      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{
          paddingHorizontal: space.base,
          paddingBottom: space.huge + space.xl,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <VenueCard
            venue={item}
            onPress={() => router.push(`/venue/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="🏢"
            title={t({ es: 'Sin lugares aquí', en: 'No venues here' })}
            body={t({
              es: 'Prueba cambiando los filtros.',
              en: 'Try adjusting the filters.',
            })}
          />
        }
        ListFooterComponent={
          <Disclosure
            text={t({
              es: 'Los lugares son establecimientos reales y públicos mostrados como anfitriones ilustrativos. Ningún listado implica una alianza firmada. Los descuentos son ilustrativos hasta que existan acuerdos reales. Información investigada en 2026, sujeta a cambios.',
              en: 'Venues are real, publicly listed places shown as illustrative hosts. No listing implies a signed partnership. Sponsor deals are illustrative until real agreements exist. Information researched in 2026, subject to change.',
            })}
          />
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

type Segment = 'encuentros' | 'lugares';

export default function MeetupsTab() {
  const t = useT();
  const [segment, setSegment] = useState<Segment>('encuentros');

  const segmentOptions: { key: Segment; label: string }[] = [
    { key: 'encuentros', label: t({ es: 'Encuentros', en: 'Meetups' }) },
    { key: 'lugares', label: t({ es: 'Lugares', en: 'Venues' }) },
  ];

  return (
    <Screen edges={['top']} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: space.base, paddingTop: space.md, paddingBottom: space.sm }}>
        <Txt variant="h1">{t({ es: 'Encuentros', en: 'Meetups' })}</Txt>
        <Spacer h={space.md} />
        <SegmentedControl
          options={segmentOptions}
          value={segment}
          onChange={setSegment}
        />
      </View>

      {segment === 'encuentros' ? <EncuentrosSegment /> : <LugaresSegment />}
    </Screen>
  );
}
