/**
 * NómadaLingo design tokens.
 *
 * The palette is fixed by the brand spec and is NOT open to interpretation.
 * Warm sand surfaces, ocean teal accents, subtle coral highlights.
 *
 * Rules encoded here:
 *   1. Screens reference semantic roles (bg, surface, accent), never raw hex.
 *   2. Teal is the primary action colour and is rationed — it marks the one
 *      thing you should tap. Coral is for highlights and alerts only.
 *   3. Elevation on light UI comes from soft shadow + hairline border together;
 *      neither alone reads as a card on warm sand.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

export const palette = {
  /** App background — warm sand. */
  bg: '#FDF8F1',
  /** Cards. */
  surface: '#FFFFFF',
  /** Chips, fills. */
  sand1: '#F7EEE0',
  /** Borders on sand. */
  sand2: '#EFE1CC',

  gold: '#D4A373',
  goldDark: '#B0824F',

  /** Primary action. */
  teal: '#2A9D8F',
  tealDark: '#1F8A7D',
  tealDarker: '#176E63',
  tealLight: '#E3F3F0',

  /** Highlights, low stock, alerts. */
  coral: '#E5735B',
  coralLight: '#FCEAE5',

  /** Primary text. */
  ink: '#14304F',
  ink2: '#3D5771',
  muted: '#7A8CA0',

  line: '#EADFCF',
  line2: '#E6EDF3',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Semantic aliases. Prefer these in screens. */
export const color = {
  bg: palette.bg,
  surface: palette.surface,
  surfaceSunk: palette.sand1,
  chip: palette.sand1,
  chipBorder: palette.sand2,

  accent: palette.teal,
  accentPressed: palette.tealDark,
  accentDeep: palette.tealDarker,
  accentSoft: palette.tealLight,
  onAccent: palette.white,

  highlight: palette.coral,
  highlightSoft: palette.coralLight,

  warm: palette.gold,
  warmDeep: palette.goldDark,

  textPrimary: palette.ink,
  textSecondary: palette.ink2,
  textTertiary: palette.muted,
  onDark: palette.white,

  border: palette.line,
  borderCool: palette.line2,
} as const;

/** Category tints used by meetup cards. Kept here so they can't drift. */
export const categoryTint: Record<string, string> = {
  'Café': palette.tealLight,
  Coworking: '#E7EEF6',
  Playa: '#E6F2F7',
  Bachata: palette.coralLight,
  Networking: '#F9EEDF',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

/** 4pt rhythm. Screens use these, never arbitrary numbers. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 44,
} as const;

export const font = {
  display: 'BricolageGrotesque_700Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  heavy: 'PlusJakartaSans_800ExtraBold',
} as const;

/**
 * Display faces carry -3% tracking per the brand spec. Body text does not —
 * negative tracking on small Spanish text damages diacritic legibility, which
 * is the exact thing these two families were chosen to get right.
 */
export const type = {
  hero: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.0,
    color: color.textPrimary,
  } as TextStyle,
  h1: {
    fontFamily: font.display,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -0.8,
    color: color.textPrimary,
  } as TextStyle,
  h2: {
    fontFamily: font.display,
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.6,
    color: color.textPrimary,
  } as TextStyle,
  h3: {
    fontFamily: font.display,
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.4,
    color: color.textPrimary,
  } as TextStyle,
  body: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: color.textSecondary,
  } as TextStyle,
  bodyStrong: {
    fontFamily: font.medium,
    fontSize: 15,
    lineHeight: 21,
    color: color.textPrimary,
  } as TextStyle,
  label: {
    fontFamily: font.bold,
    fontSize: 13,
    lineHeight: 17,
    color: color.textPrimary,
  } as TextStyle,
  caption: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: color.textTertiary,
  } as TextStyle,
  micro: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
    color: color.textTertiary,
  } as TextStyle,
  /** Numerals in scores, prices, counters. */
  numeric: {
    fontFamily: font.heavy,
    fontSize: 15,
    lineHeight: 19,
    color: color.textPrimary,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;

/** Soft, low-contrast shadows. Anything heavier reads cheap on sand. */
export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#14304F',
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {
      boxShadow: '0 1px 2px rgba(20,48,79,.05), 0 4px 14px rgba(20,48,79,.06)',
    },
  })!,
  lifted: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#14304F',
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {
      boxShadow: '0 10px 30px rgba(20,48,79,.14)',
    },
  })!,
} as const;

/** Motion. Short, spring-based, never decorative. */
export const motion = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  enter: { damping: 20, stiffness: 260, mass: 0.9 },
  pressScale: 0.972,
} as const;

export const layout = {
  screenX: space.base,
  tabBarHeight: 58,
  hairline: 1,
} as const;
