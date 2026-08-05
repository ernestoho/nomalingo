/**
 * Shared UI primitives.
 *
 * Screens compose these and never hand-roll a touchable, a card, or a chip.
 * That is what keeps nineteen screens looking like one product rather than
 * nineteen people's work.
 *
 * Two rules baked in here rather than left to call sites:
 *   - Nothing tappable is a bare Pressable or a TouchableOpacity. Every tap
 *     target scales on contact with spring physics on the UI thread, so it
 *     keeps responding while JS is busy — which is exactly when people tap.
 *   - Loading states are shape-matched skeletons, not spinners. A spinner
 *     tells you to wait; a skeleton tells you what is coming.
 */

import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { color, font, motion, palette, radius, shadow, space, type } from '../theme/tokens';
import * as haptics from '../lib/haptics';

/* ============================ layout ============================ */

export function Screen({
  children,
  style,
  edges = ['top'],
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: color.bg },
        edges.includes('top') && { paddingTop: insets.top },
        edges.includes('bottom') && { paddingBottom: insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = space.sm,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const Spacer = ({ h = space.base }: { h?: number }) => <View style={{ height: h }} />;

export function Divider({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color.border }, style]}
    />
  );
}

/* ============================ text ============================ */

type TxtProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  variant?: keyof typeof type;
  c?: string;
};

export function Txt({ children, style, numberOfLines, variant = 'body', c }: TxtProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[type[variant], c ? { color: c } : null, style as TextStyle]}
    >
      {children}
    </Text>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Row justify="space-between" style={[{ marginBottom: space.md }, style]}>
      <Txt variant="h3">{title}</Txt>
      {action ? (
        <PressableScale onPress={onAction} hitSlop={8}>
          <Txt variant="label" c={color.accent}>
            {action}
          </Txt>
        </PressableScale>
      ) : null}
    </Row>
  );
}

/* ============================ pressables ============================ */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressScaleProps = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Skip the automatic selection tick — for destructive or heavier actions. */
  quiet?: boolean;
  scaleTo?: number;
};

/**
 * The one tap target in the app.
 *
 * Spring rather than timing: a spring settles asymmetrically, which reads as
 * physical contact. Linear timing reads as a CSS transition, which is the
 * clearest tell of a web page wearing an app's clothes.
 */
export function PressableScale({
  children,
  style,
  quiet,
  scaleTo = motion.pressScale,
  onPress,
  disabled,
  ...rest
}: PressScaleProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.92]),
  }));

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (disabled) return;
      if (!quiet) haptics.selection();
      onPress?.(e);
    },
    [disabled, quiet, onPress],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withSpring(1, motion.press);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motion.press);
      }}
      onPress={handlePress}
      style={[style, animStyle, disabled ? { opacity: 0.45 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ============================ buttons ============================ */

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  full = true,
  icon,
  style,
}: ButtonProps) {
  const bg =
    variant === 'primary'
      ? color.accent
      : variant === 'danger'
        ? color.highlight
        : variant === 'secondary'
          ? color.surface
          : 'transparent';

  const fg =
    variant === 'primary' || variant === 'danger' ? color.onAccent : color.textPrimary;

  const height = size === 'lg' ? 52 : 44;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          height,
          borderRadius: radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          paddingHorizontal: space.lg,
          alignSelf: full ? 'stretch' : 'flex-start',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: color.border,
        },
        variant === 'primary' ? shadow.card : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={{
              fontFamily: font.bold,
              fontSize: size === 'lg' ? 15.5 : 14,
              color: fg,
              letterSpacing: 0.1,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

/* ============================ surfaces ============================ */

export function Card({
  children,
  style,
  onPress,
  padded = true,
  tint,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  tint?: string;
}) {
  const base: ViewStyle = {
    backgroundColor: tint ?? color.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: padded ? space.base : 0,
    overflow: 'hidden',
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[base, shadow.card, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[base, shadow.card, style]}>{children}</View>;
}

/* ============================ chips ============================ */

export function Chip({
  label,
  selected,
  onPress,
  emoji,
  small,
  tone = 'default',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  small?: boolean;
  tone?: 'default' | 'accent' | 'warm' | 'coral';
}) {
  const selBg =
    tone === 'coral' ? color.highlight : tone === 'warm' ? color.warm : color.accent;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      style={{
        paddingHorizontal: small ? space.md : space.base,
        height: small ? 30 : 36,
        borderRadius: radius.pill,
        backgroundColor: selected ? selBg : color.chip,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? selBg : color.chipBorder,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
      }}
    >
      {emoji ? <Text style={{ fontSize: small ? 12 : 13.5 }}>{emoji}</Text> : null}
      <Text
        style={{
          fontFamily: font.medium,
          fontSize: small ? 12.5 : 13.5,
          color: selected ? color.onAccent : color.textSecondary,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/** Non-interactive label, e.g. language tags on a meetup card. */
export function Tag({
  label,
  tone = 'sand',
}: {
  label: string;
  tone?: 'sand' | 'accent' | 'coral' | 'warm';
}) {
  const map = {
    sand: { bg: color.chip, fg: color.textSecondary },
    accent: { bg: palette.tealLight, fg: palette.tealDarker },
    coral: { bg: palette.coralLight, fg: '#B24632' },
    warm: { bg: '#F9EEDF', fg: palette.goldDark },
  }[tone];

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 7,
        backgroundColor: map.bg,
      }}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 11, color: map.fg, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}

/* ============================ segmented ============================ */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: color.chip,
          borderRadius: radius.md,
          padding: 3,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.chipBorder,
        },
        style,
      ]}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <PressableScale
            key={o.key}
            onPress={() => onChange(o.key)}
            scaleTo={0.985}
            style={{
              flex: 1,
              height: 38,
              borderRadius: radius.sm,
              backgroundColor: active ? color.surface : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              ...(active ? (shadow.card as object) : {}),
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                fontFamily: active ? font.bold : font.medium,
                fontSize: 13.5,
                color: active ? color.textPrimary : color.textTertiary,
              }}
            >
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ============================ avatar ============================ */

export function Avatar({
  seed,
  tint,
  size = 48,
  photo,
  online,
  flag,
}: {
  seed: string;
  tint: string;
  size?: number;
  photo?: string | null;
  online?: boolean;
  flag?: string;
}) {
  return (
    <View style={{ width: size, height: size }}>
      {photo ? (
        <Animated.Image
          source={{ uri: photo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: font.heavy,
              fontSize: size * 0.36,
              color: '#fff',
              letterSpacing: 0.5,
            }}
          >
            {seed}
          </Text>
        </View>
      )}

      {online ? (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: color.accent,
            borderWidth: 2,
            borderColor: color.bg,
          }}
        />
      ) : null}

      {flag ? (
        <View
          style={{
            position: 'absolute',
            left: -2,
            bottom: -3,
            backgroundColor: color.surface,
            borderRadius: 8,
            paddingHorizontal: 2,
          }}
        >
          <Text style={{ fontSize: size * 0.24 }}>{flag}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ============================ score ============================ */

/** Match score as a ring. The number always ships with its reasons nearby. */
export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.sand2}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        style={{
          fontFamily: font.heavy,
          fontSize: size * 0.3,
          color: color.textPrimary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {score}
      </Text>
    </View>
  );
}

/** Level as filled dots — reads faster than "B2" for anyone who is not a linguist. */
export function LevelDots({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <Row gap={3}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: i < filled ? color.accent : palette.sand2,
          }}
        />
      ))}
    </Row>
  );
}

export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(Math.max(0, Math.min(1, value)), motion.enter);
  }, [value, w]);

  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: palette.sand2,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[{ height, borderRadius: height / 2, backgroundColor: color.accent }, style]}
      />
    </View>
  );
}

/* ============================ loading ============================ */

/**
 * Shape-matched shimmer. Deliberately not a spinner: a skeleton in the shape of
 * the content tells the user what is arriving, which makes the same wait feel
 * shorter.
 */
export function Skeleton({
  width,
  height = 14,
  radius: r = 7,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [p]);

  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.45, 0.85]),
  }));

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: r, backgroundColor: palette.sand2 },
        anim,
        style,
      ]}
    />
  );
}

/** Skeleton shaped like a partner row, used while the first rank is computing. */
export function PartnerSkeleton() {
  return (
    <Card style={{ marginBottom: space.md }}>
      <Row gap={space.md} align="flex-start">
        <Skeleton width={52} height={52} radius={26} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="80%" height={12} />
          <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={44} height={44} radius={22} />
      </Row>
    </Card>
  );
}

/* ============================ empty state ============================ */

/**
 * Empty states teach rather than apologise: they say what goes here and give
 * the one action that fills it.
 */
export function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: palette.tealLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.base,
        }}
      >
        <Text style={{ fontSize: 28 }}>{emoji}</Text>
      </View>
      <Txt variant="h3" style={{ textAlign: 'center', marginBottom: 6 }}>
        {title}
      </Txt>
      <Txt variant="body" style={{ textAlign: 'center', maxWidth: 280 }}>
        {body}
      </Txt>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} full={false} style={{ marginTop: space.lg }} />
      ) : null}
    </View>
  );
}

/* ============================ form ============================ */

export function Field({
  label,
  error,
  hint,
  style,
  ...rest
}: TextInputProps & { label?: string; error?: string | null; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: color.textSecondary }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={color.textTertiary}
        {...rest}
        style={[
          {
            height: 50,
            borderRadius: radius.md,
            backgroundColor: color.surface,
            borderWidth: 1,
            borderColor: error ? color.highlight : color.border,
            paddingHorizontal: space.base,
            fontFamily: font.regular,
            fontSize: 15,
            color: color.textPrimary,
          },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
          style as TextStyle,
        ]}
      />
      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: color.highlight }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: color.textTertiary }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Row justify="space-between" style={{ paddingVertical: space.md }} gap={space.base}>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{title}</Txt>
        {subtitle ? (
          <Txt variant="caption" style={{ marginTop: 2 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptics.light();
          onValueChange(v);
        }}
        trackColor={{ false: palette.sand2, true: color.accent }}
        thumbColor="#fff"
        ios_backgroundColor={palette.sand2}
      />
    </Row>
  );
}

/* ============================ nav ============================ */

export function BackButton({ onPress, tint }: { onPress: () => void; tint?: string }) {
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Atrás"
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: tint ? 'rgba(255,255,255,0.22)' : color.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: tint ? 0 : StyleSheet.hairlineWidth,
        borderColor: color.border,
      }}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M15 5 8 12l7 7"
          stroke={tint ?? color.textPrimary}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </PressableScale>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Row
      justify="space-between"
      style={{
        paddingHorizontal: space.base,
        paddingBottom: space.md,
        paddingTop: space.sm,
      }}
      gap={space.md}
    >
      <Row gap={space.md} style={{ flex: 1 }}>
        {onBack ? <BackButton onPress={onBack} /> : null}
        <Txt variant="h2" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Txt>
      </Row>
      {right}
    </Row>
  );
}

/* ============================ misc ============================ */

/**
 * The honesty notes required by the product rules. Deliberately quiet — it is
 * a footnote, not a disclaimer banner.
 */
export function Disclosure({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: palette.sand1,
        borderRadius: radius.md,
        padding: space.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color.chipBorder,
      }}
    >
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 11.5,
          lineHeight: 16,
          color: color.textTertiary,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: font.display, fontSize: 19, color: color.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontFamily: font.medium, fontSize: 11, color: color.textTertiary }}>
        {label}
      </Text>
    </View>
  );
}

export { ScrollView };
