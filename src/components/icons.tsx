/**
 * Icon set, drawn as SVG paths.
 *
 * Hand-drawn rather than pulled from a font pack so the whole set shares one
 * stroke weight and one corner treatment. Mixing icon families is one of those
 * things nobody can name but everybody feels — it is a big part of why an
 * interface reads as assembled rather than designed.
 *
 * All icons are 24x24, 1.9 stroke, round caps and joins.
 */

import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '../theme/tokens';

export type IconProps = {
  size?: number;
  c?: string;
  filled?: boolean;
  strokeWidth?: number;
};

const S = 1.9;

function Base({
  size = 22,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

const common = (c: string, w: number) => ({
  stroke: c,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export const HomeIcon = ({ size, c = color.textTertiary, filled, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M3.6 10.2 12 3.8l8.4 6.4V19a1.4 1.4 0 0 1-1.4 1.4h-3.6v-5.2h-6.8v5.2H5a1.4 1.4 0 0 1-1.4-1.4z"
      {...common(c, strokeWidth)}
      fill={filled ? c : 'none'}
    />
  </Base>
);

export const CompassIcon = ({ size, c = color.textTertiary, filled, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Circle cx="12" cy="12" r="8.6" {...common(c, strokeWidth)} fill={filled ? c : 'none'} />
    <Path
      d="M15.3 8.7 13.6 13.6 8.7 15.3 10.4 10.4z"
      {...common(filled ? '#fff' : c, strokeWidth)}
    />
  </Base>
);

export const CalendarIcon = ({ size, c = color.textTertiary, filled, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Rect
      x="3.4"
      y="5.2"
      width="17.2"
      height="15.4"
      rx="3"
      {...common(c, strokeWidth)}
      fill={filled ? c : 'none'}
    />
    <Path d="M3.4 10h17.2" {...common(filled ? '#fff' : c, strokeWidth)} />
    <Path d="M8.2 3.4v3.4M15.8 3.4v3.4" {...common(c, strokeWidth)} />
  </Base>
);

export const ChatIcon = ({ size, c = color.textTertiary, filled, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M20.4 11.6c0 4.1-3.8 7.4-8.4 7.4-1 0-2-.16-2.9-.45L4 20.4l1.5-3.6A7 7 0 0 1 3.6 11.6C3.6 7.5 7.4 4.2 12 4.2s8.4 3.3 8.4 7.4Z"
      {...common(c, strokeWidth)}
      fill={filled ? c : 'none'}
    />
  </Base>
);

export const UserIcon = ({ size, c = color.textTertiary, filled, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Circle cx="12" cy="8.4" r="3.9" {...common(c, strokeWidth)} fill={filled ? c : 'none'} />
    <Path
      d="M4.8 20.2c0-3.6 3.2-5.9 7.2-5.9s7.2 2.3 7.2 5.9"
      {...common(c, strokeWidth)}
      fill={filled ? c : 'none'}
    />
  </Base>
);

export const PinIcon = ({ size = 16, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M19 10.3c0 5.2-7 11-7 11s-7-5.8-7-11a7 7 0 0 1 14 0Z"
      {...common(c, strokeWidth)}
    />
    <Circle cx="12" cy="10.1" r="2.5" {...common(c, strokeWidth)} />
  </Base>
);

export const ClockIcon = ({ size = 16, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Circle cx="12" cy="12" r="8.6" {...common(c, strokeWidth)} />
    <Path d="M12 7.2V12l3.2 2" {...common(c, strokeWidth)} />
  </Base>
);

export const UsersIcon = ({ size = 16, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Circle cx="9.4" cy="8.6" r="3.4" {...common(c, strokeWidth)} />
    <Path d="M3.4 19.4c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" {...common(c, strokeWidth)} />
    <Path d="M16.4 5.6a3.3 3.3 0 0 1 0 6.2M17.6 14.6c1.9.6 3 2.2 3 4.4" {...common(c, strokeWidth)} />
  </Base>
);

export const StarIcon = ({ size = 14, c = color.warm, filled = true, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"
      {...common(c, strokeWidth)}
      fill={filled ? c : 'none'}
    />
  </Base>
);

export const CheckIcon = ({ size = 18, c = color.accent, strokeWidth = 2.4 }: IconProps) => (
  <Base size={size}>
    <Path d="m5 12.6 4.6 4.4L19 6.6" {...common(c, strokeWidth)} />
  </Base>
);

export const PlusIcon = ({ size = 20, c = color.onAccent, strokeWidth = 2.3 }: IconProps) => (
  <Base size={size}>
    <Path d="M12 5.4v13.2M5.4 12h13.2" {...common(c, strokeWidth)} />
  </Base>
);

export const ChevronRight = ({ size = 18, c = color.textTertiary, strokeWidth = 2.1 }: IconProps) => (
  <Base size={size}>
    <Path d="m9.5 5.5 7 6.5-7 6.5" {...common(c, strokeWidth)} />
  </Base>
);

export const SearchIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Circle cx="10.8" cy="10.8" r="6.6" {...common(c, strokeWidth)} />
    <Path d="m15.8 15.8 4 4" {...common(c, strokeWidth)} />
  </Base>
);

export const BellIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M18 16.2H6l1.2-2.1V10a4.8 4.8 0 0 1 9.6 0v4.1z"
      {...common(c, strokeWidth)}
    />
    <Path d="M10.3 19a1.9 1.9 0 0 0 3.4 0" {...common(c, strokeWidth)} />
  </Base>
);

export const ShareIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path d="M12 15.4V4.2M8.4 7.4 12 4l3.6 3.4" {...common(c, strokeWidth)} />
    <Path d="M5.6 13.2v5.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6v-5.4" {...common(c, strokeWidth)} />
  </Base>
);

export const ShieldIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M12 3.6 5.4 6.2v5.3c0 4 2.8 7.6 6.6 8.9 3.8-1.3 6.6-4.9 6.6-8.9V6.2z"
      {...common(c, strokeWidth)}
    />
  </Base>
);

export const VerifiedIcon = ({ size = 16, c = color.accent }: IconProps) => (
  <Base size={size}>
    <Path
      d="m12 2.6 2.3 1.8 2.9-.2.9 2.8 2.4 1.6-1 2.8 1 2.8-2.4 1.6-.9 2.8-2.9-.2L12 21.4l-2.3-1.8-2.9.2-.9-2.8-2.4-1.6 1-2.8-1-2.8L5.9 8l.9-2.8 2.9.2z"
      fill={c}
    />
    <Path
      d="m8.6 12.2 2.3 2.2 4.5-4.6"
      stroke="#fff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Base>
);

export const CameraIcon = ({ size = 20, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M3.6 8.8A2 2 0 0 1 5.6 6.8h1.9l1.2-2h6.6l1.2 2h1.9a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z"
      {...common(c, strokeWidth)}
    />
    <Circle cx="12" cy="13" r="3.4" {...common(c, strokeWidth)} />
  </Base>
);

export const TicketIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M3.6 8.4V6.6h16.8v1.8a2.4 2.4 0 0 0 0 4.8v4.2H3.6v-4.2a2.4 2.4 0 0 0 0-4.8Z"
      {...common(c, strokeWidth)}
    />
    <Path d="M14 6.6v10.8" strokeDasharray="2 2.4" {...common(c, strokeWidth)} />
  </Base>
);

export const GlobeIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Circle cx="12" cy="12" r="8.6" {...common(c, strokeWidth)} />
    <Path d="M3.6 12h16.8M12 3.4c2.2 2.4 3.3 5.4 3.3 8.6S14.2 18.2 12 20.6c-2.2-2.4-3.3-5.4-3.3-8.6S9.8 5.8 12 3.4Z" {...common(c, strokeWidth)} />
  </Base>
);

export const SlidersIcon = ({ size = 18, c = color.textTertiary, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path d="M5 7.4h14M5 12h14M5 16.6h14" {...common(c, strokeWidth)} />
    <Circle cx="9.2" cy="7.4" r="2" fill={c} />
    <Circle cx="15.4" cy="12" r="2" fill={c} />
    <Circle cx="8" cy="16.6" r="2" fill={c} />
  </Base>
);

export const SparkIcon = ({ size = 16, c = color.warm, strokeWidth = S }: IconProps) => (
  <Base size={size}>
    <Path
      d="M12 3.4 13.6 9 19 10.6 13.6 12.2 12 17.8 10.4 12.2 5 10.6 10.4 9z"
      fill={c}
    />
    <Path d="M18.4 15.4 19.2 18l2.6.8-2.6.8-.8 2.6-.8-2.6-2.6-.8 2.6-.8z" fill={c} opacity={0.7} />
  </Base>
);
