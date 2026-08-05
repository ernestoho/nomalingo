/**
 * Web stand-in for the native map.
 *
 * react-native-maps has no web build, so rather than ship a broken import the
 * web bundle gets an honest, designed placeholder: the coordinates, the zone,
 * and a working link out to a real map. It looks deliberate instead of looking
 * like a component that failed to load.
 */

import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color, font, palette, radius, space } from '../theme/tokens';
import { PressableScale } from './ui';
import type { MapCardProps } from './MapCard.native';

export default function MapCard({ lat, lng, label, height = 170 }: MapCardProps) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <PressableScale
      onPress={() => void Linking.openURL(url)}
      style={{
        height,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color.border,
        backgroundColor: palette.tealLight,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {/* A suggestion of coastline so the placeholder reads as a map, not a void. */}
      <Svg width="100%" height={height} style={{ position: 'absolute', opacity: 0.5 }}>
        <Path
          d="M0 118 C 60 96, 120 132, 190 112 S 320 84, 420 104 L 420 200 L 0 200 Z"
          fill={palette.sand1}
        />
        <Circle cx="50%" cy="46%" r="34" fill="#fff" opacity={0.45} />
      </Svg>

      <View
        style={{
          backgroundColor: color.surface,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path
            d="M19 10.3c0 5.2-7 11-7 11s-7-5.8-7-11a7 7 0 0 1 14 0Z"
            stroke={color.accent}
            strokeWidth={2}
            fill="none"
          />
          <Circle cx="12" cy="10.1" r="2.4" stroke={color.accent} strokeWidth={2} fill="none" />
        </Svg>
        <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: color.textPrimary }}>
          {label}
        </Text>
      </View>

      <Text style={{ fontFamily: font.regular, fontSize: 11, color: color.textTertiary }}>
        {lat.toFixed(4)}, {lng.toFixed(4)} · abrir en Maps
      </Text>
    </PressableScale>
  );
}
