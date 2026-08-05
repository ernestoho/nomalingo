/**
 * NómadaLingo brand marks.
 *
 * The acute accent over the ó is a map pin, tilted ~24°. That is the whole
 * idea of the logo, so it is drawn as vector geometry rather than typed as a
 * character — a real ´ would be at the mercy of whatever face is loaded.
 *
 * Positioning note: the pin is anchored to a wrapper around the bare "o"
 * glyph rather than offset by a hand-tuned number. Font metrics differ between
 * platforms and Bricolage's lowercase o is not where a magic constant would
 * guess. Measuring the glyph is the only thing that survives iOS + Android +
 * web without drifting.
 *
 * Under ~40px the full wordmark turns to mush, so `Logo` swaps itself to the
 * pin alone. Callers do not have to remember that rule.
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { color, font, palette } from '../theme/tokens';

const PIN_TILT = -24; // degrees; leans left like a real acute accent

/**
 * The pin itself. Viewbox is 24x32 — a teardrop with a hollow eye, the shape
 * that still reads as "map pin" at 12px where a detailed one would fill in.
 */
export function PinMark({
  size = 16,
  fill = color.accent,
  eye = palette.bg,
  tilt = PIN_TILT,
  style,
}: {
  size?: number;
  fill?: string;
  eye?: string;
  tilt?: number;
  style?: ViewStyle;
}) {
  const w = size * (24 / 32);
  return (
    <Svg width={w} height={size} viewBox="0 0 24 32" style={style}>
      <G rotation={tilt} origin="12, 16">
        <Path
          d="M12 0.6C5.75 0.6 0.9 5.45 0.9 11.7c0 7.9 9.03 18.2 10.35 19.66a1.02 1.02 0 0 0 1.5 0C14.07 29.9 23.1 19.6 23.1 11.7 23.1 5.45 18.25 0.6 12 0.6Z"
          fill={fill}
        />
        <Circle cx="12" cy="11.6" r="4.15" fill={eye} />
      </G>
    </Svg>
  );
}

/**
 * Full wordmark. `size` is the cap height of the type, not the box height —
 * the pin lives above the x-height so the mark is taller than `size`.
 */
export function Wordmark({
  size = 30,
  tint = color.textPrimary,
  pinFill = color.accent,
  pinEye,
  style,
}: {
  size?: number;
  tint?: string;
  pinFill?: string;
  pinEye?: string;
  style?: ViewStyle;
}) {
  const [oWidth, setOWidth] = React.useState(0);
  const pinSize = size * 0.46;
  // Sit the pin's tip just above the o, with a hair of air.
  const pinBottomOffset = size * 0.78;

  const textStyle = {
    fontFamily: font.display,
    fontSize: size,
    lineHeight: size * 1.14,
    letterSpacing: size * -0.03,
    color: tint,
  };

  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel="NómadaLingo">
      <Text style={textStyle} allowFontScaling={false}>
        N
      </Text>

      <View onLayout={(e) => setOWidth(e.nativeEvent.layout.width)}>
        <Text style={textStyle} allowFontScaling={false}>
          o
        </Text>
        {oWidth > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: oWidth / 2 - (pinSize * (24 / 32)) / 2,
              bottom: pinBottomOffset,
            }}
          >
            <PinMark size={pinSize} fill={pinFill} eye={pinEye ?? color.bg} />
          </View>
        )}
      </View>

      <Text style={textStyle} allowFontScaling={false}>
        madaLingo
      </Text>
    </View>
  );
}

/**
 * Monogram — capital Ó, white on deep ocean blue, pin in light teal.
 * A cap-height O needs less accent mass than a lowercase o or the pin reads
 * like a balloon, so the pin here is deliberately smaller and tighter than the
 * wordmark's.
 */
export function Monogram({
  size = 64,
  rounded = true,
  bg = palette.ink,
  style,
}: {
  size?: number;
  rounded?: boolean;
  bg?: string;
  style?: ViewStyle;
}) {
  const capSize = size * 0.54;
  const pinSize = size * 0.19; // tighter than the wordmark's 0.46 of cap height

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderRadius: rounded ? size * 0.24 : 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="NómadaLingo"
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: font.display,
            fontSize: capSize,
            lineHeight: capSize * 1.1,
            color: palette.white,
            letterSpacing: capSize * -0.02,
          }}
        >
          O
        </Text>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: capSize * 0.82 }}
        >
          <PinMark size={pinSize} fill={palette.tealLight} eye={bg} tilt={PIN_TILT} />
        </View>
      </View>
    </View>
  );
}

/**
 * Size-aware mark. Below the legibility floor it renders the pin alone, which
 * is the documented brand behaviour rather than a shrunken wordmark.
 */
export function Logo({
  size = 30,
  tint,
  pinFill,
  style,
}: {
  size?: number;
  tint?: string;
  pinFill?: string;
  style?: ViewStyle;
}) {
  if (size < 40) {
    return <PinMark size={size} fill={pinFill ?? color.accent} style={style} />;
  }
  return <Wordmark size={size * 0.62} tint={tint} pinFill={pinFill} style={style} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
