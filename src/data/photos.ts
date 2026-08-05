/**
 * Bundled venue photography, keyed by the venue's photoSeed.
 *
 * Bundled rather than remote: the app has to work on hotel wifi and on a
 * Claro signal in Verón, and a venue card with a grey box where the photo
 * should be is worse than no photo at all.
 *
 * These are illustrative category images, not photographs of the specific
 * businesses. The venue screens say so.
 */

import type { ImageSourcePropType } from 'react-native';

export const VENUE_PHOTOS: Record<string, ImageSourcePropType> = {
  coworking: require('../../assets/img/venue-coworking.jpg'),
  cafe: require('../../assets/img/venue-cafe.jpg'),
  bar: require('../../assets/img/venue-bar.jpg'),
  beach: require('../../assets/img/venue-beach.jpg'),
  plaza: require('../../assets/img/venue-plaza.jpg'),
};

export const HERO_PHOTO: ImageSourcePropType = require('../../assets/img/hero-puntacana.jpg');

export const venuePhoto = (seed: string): ImageSourcePropType =>
  VENUE_PHOTOS[seed] ?? VENUE_PHOTOS.cafe;
