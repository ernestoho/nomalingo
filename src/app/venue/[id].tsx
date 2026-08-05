/**
 * Venue detail screen.
 *
 * Shows the full profile of a directory venue: photo, amenities, map, and
 * (if a deal exists) a member-gated discount block. The locked state looks
 * designed, not broken.
 *
 * Honesty rules applied:
 *   - Venue photo is labelled as an illustrative category image.
 *   - Sponsor deal is labelled as illustrative.
 *   - No signed partnership is implied anywhere.
 */

import React from 'react';
import {
  Linking,
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
  Button,
  Tag,
  BackButton,
  Disclosure,
} from '../../components/ui';
import {
  StarIcon,
  PlusIcon,
} from '../../components/icons';
import {
  color,
  palette,
  radius,
  space,
} from '../../theme/tokens';
import MapCard from '../../components/MapCard';

import { useT, useLang } from '../../lib/i18n';
import { useStore } from '../../lib/store';

import { venueById } from '../../data/venues';
import { venuePhoto } from '../../data/photos';
import {
  AREAS,
  venueTypeLabel,
  amenityLabel,
  amenityEmoji,
} from '../../data/reference';

/* ------------------------------------------------------------------ */
/*  Locked deal block                                                   */
/* ------------------------------------------------------------------ */

function LockedDealBlock() {
  const t = useT();
  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: color.border,
        borderStyle: 'dashed',
        padding: space.base,
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: palette.sand1,
      }}
    >
      <Text style={{ fontSize: 24 }}>🔒</Text>
      <Txt variant="bodyStrong" style={{ textAlign: 'center' }}>
        {t({ es: 'Descuento exclusivo para miembros', en: 'Members-only discount' })}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 56,
              height: 10,
              borderRadius: 5,
              backgroundColor: palette.sand2,
            }}
          />
        ))}
      </View>
      <Txt variant="caption" c={color.textTertiary} style={{ textAlign: 'center' }}>
        {t({
          es: 'Hazte miembro para ver el descuento',
          en: 'Become a member to see the discount',
        })}
      </Txt>
      <Button
        label={t({ es: 'Ver membresía', en: 'View membership' })}
        variant="secondary"
        full={false}
        onPress={() => router.push('/membership')}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                              */
/* ------------------------------------------------------------------ */

export default function VenueDetail() {
  const t = useT();
  const { lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isMember } = useStore();

  const venue = venueById(id ?? '');

  if (!venue) {
    return (
      <Screen edges={['top']}>
        <View style={{ padding: space.base }}>
          <BackButton onPress={() => router.back()} />
          <Spacer h={space.xxl} />
          <Txt variant="h2" style={{ textAlign: 'center' }}>
            {t({ es: 'Lugar no encontrado', en: 'Venue not found' })}
          </Txt>
          <Spacer h={space.base} />
          <Txt variant="body" style={{ textAlign: 'center' }}>
            {t({
              es: 'Este lugar ya no está en el directorio.',
              en: 'This venue is no longer in the directory.',
            })}
          </Txt>
          <Spacer h={space.xl} />
          <Button
            label={t({ es: 'Ver todos los lugares', en: 'See all venues' })}
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  const photo = venuePhoto(venue.photoSeed);
  const area = AREAS.find((a) => a.name === venue.area);

  function openDirections() {
    const query = encodeURIComponent(`${venue!.name}, ${venue!.area}, Punta Cana`);
    const lat = area?.lat;
    const lng = area?.lng;
    let url: string;
    if (lat !== undefined && lng !== undefined) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${query}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    void Linking.openURL(url);
  }

  return (
    <Screen edges={[]} style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Photo header */}
        <View style={{ height: 220, position: 'relative' }}>
          <Image
            source={photo}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
            transition={220}
          />
          {/* Dark scrim */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              backgroundColor: 'rgba(0,0,0,0.30)',
            }}
            pointerEvents="none"
          />
          {/* Back button */}
          <View style={{ position: 'absolute', top: 52, left: space.base }}>
            <BackButton onPress={() => router.back()} tint="white" />
          </View>
        </View>

        {/* Content */}
        <View style={{ padding: space.base, gap: space.xl }}>

          {/* Name + type + rating */}
          <View style={{ gap: space.sm }}>
            <Row justify="space-between" align="flex-start">
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="h1">{venue.name}</Txt>
                <Txt variant="body" c={color.textTertiary}>
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
                  <StarIcon size={15} c={palette.gold} filled />
                  <Txt variant="bodyStrong">{venue.rating.toFixed(1)}</Txt>
                  <Txt variant="caption" c={color.textTertiary}>
                    {t({ es: 'de 5', en: 'out of 5' })}
                  </Txt>
                </>
              ) : (
                <Txt variant="caption" c={color.textTertiary}>
                  {t({ es: 'Sin reseñas aún', en: 'No reviews yet' })}
                </Txt>
              )}
            </Row>
          </View>

          <Divider />

          {/* Blurb */}
          <View style={{ gap: space.sm }}>
            <Txt variant="h3">{t({ es: 'Sobre el lugar', en: 'About this place' })}</Txt>
            <Txt variant="body">{t(venue.blurb)}</Txt>
          </View>

          <Divider />

          {/* Amenities — all of them, wrapped */}
          <View style={{ gap: space.md }}>
            <Txt variant="h3">{t({ es: 'Lo que tiene', en: 'What it has' })}</Txt>
            <Row gap={space.sm} wrap>
              {venue.amenities.map((key) => (
                <Tag
                  key={key}
                  label={`${amenityEmoji(key)} ${amenityLabel(key, lang)}`}
                  tone="sand"
                />
              ))}
            </Row>
          </View>

          <Divider />

          {/* Map */}
          {area && (
            <View style={{ gap: space.md }}>
              <Txt variant="h3">{t({ es: 'Ubicación', en: 'Location' })}</Txt>
              <MapCard
                lat={area.lat}
                lng={area.lng}
                label={venue.name}
                height={170}
              />
              <Txt variant="caption" c={color.textTertiary}>
                {venue.area}
              </Txt>
            </View>
          )}

          {/* Member discount block */}
          {venue.sponsorDeal !== null && (
            <>
              <Divider />
              <View style={{ gap: space.md }}>
                <Txt variant="h3">{t({ es: 'Descuento para miembros', en: 'Member discount' })}</Txt>
                {isMember ? (
                  /* Revealed deal */
                  <View
                    style={{
                      backgroundColor: palette.tealLight,
                      borderRadius: radius.md,
                      padding: space.base,
                      gap: space.sm,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: palette.tealDark,
                    }}
                  >
                    <Txt variant="h3" c={palette.tealDarker}>
                      {t(venue.sponsorDeal)}
                    </Txt>
                    <Txt variant="caption" c={palette.tealDarker}>
                      {t({
                        es: 'Muestra tu perfil de miembro en el lugar para aplicar el descuento.',
                        en: 'Show your member profile at the venue to apply the discount.',
                      })}
                    </Txt>
                    <Txt variant="micro" c={palette.tealDarker} style={{ fontStyle: 'italic' }}>
                      {t({
                        es: 'Descuento ilustrativo — sujeto a acuerdo real con el establecimiento.',
                        en: 'Illustrative discount — subject to a real agreement with this venue.',
                      })}
                    </Txt>
                  </View>
                ) : (
                  <LockedDealBlock />
                )}
              </View>
            </>
          )}

          <Divider />

          {/* Actions */}
          <View style={{ gap: space.sm }}>
            <Button
              label={t({ es: 'Crear encuentro aquí', en: 'Create a meetup here' })}
              icon={<PlusIcon size={18} c={color.onAccent} />}
              onPress={() => router.push(`/create-meetup?venue=${venue.id}`)}
            />
            <Button
              label={t({ es: 'Cómo llegar', en: 'Get directions' })}
              variant="secondary"
              onPress={openDirections}
            />
          </View>

          <Disclosure
            text={t({
              es: 'Este es un lugar real y público mostrado como anfitrión ilustrativo. Ningún listado implica una alianza firmada. Los descuentos son ilustrativos hasta que existan acuerdos reales. Las fotos son imágenes de categoría, no fotografías del local específico. Información investigada en 2026 y sujeta a cambios.',
              en: 'This is a real, publicly listed place shown as an illustrative host. No listing implies a signed partnership. Sponsor deals are illustrative until real agreements exist. Photos are category images, not photographs of this specific establishment. Information researched in 2026, subject to change.',
            })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
