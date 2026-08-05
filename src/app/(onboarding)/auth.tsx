/**
 * Auth screen — sign up or log in.
 *
 * Initial tab comes from the `mode` search param so the welcome screen's two
 * buttons each land in the right place.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Wordmark } from '../../components/Logo';
import {
  Button,
  Divider,
  Field,
  PressableScale,
  Row,
  SegmentedControl,
  Spacer,
} from '../../components/ui';
import { color, font, radius, space } from '../../theme/tokens';
import { useLang, useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { useAuth } from '../../lib/auth';

type Mode = 'signup' | 'login';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateName(v: string, lang: 'es' | 'en'): string | null {
  if (v.trim().length < 2)
    return lang === 'es' ? 'Mínimo 2 caracteres' : 'At least 2 characters';
  return null;
}

function validateEmail(v: string, lang: 'es' | 'en'): string | null {
  if (!EMAIL_RE.test(v.trim()))
    return lang === 'es' ? 'Correo no válido' : 'Invalid email';
  return null;
}

function validatePassword(v: string, lang: 'es' | 'en'): string | null {
  if (v.length < 8)
    return lang === 'es' ? 'Mínimo 8 caracteres' : 'At least 8 characters';
  return null;
}

export default function AuthScreen() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { updateProfile } = useStore();
  const { signUp, signIn, busy } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();

  const initialMode: Mode = params.mode === 'login' ? 'login' : 'signup';
  const [mode, setMode] = useState<Mode>(initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Touched state — only show errors after first blur
  const [touchedName, setTouchedName] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const [socialNote, setSocialNote] = useState<string | null>(null);

  const nameErr = touchedName ? validateName(name, lang) : null;
  const emailErr = touchedEmail ? validateEmail(email, lang) : null;
  const pwErr = touchedPassword ? validatePassword(password, lang) : null;

  const signupValid =
    validateName(name, lang) === null &&
    validateEmail(email, lang) === null &&
    validatePassword(password, lang) === null;

  const loginValid =
    validateEmail(email, lang) === null &&
    validatePassword(password, lang) === null;

  const canSubmit = mode === 'signup' ? signupValid : loginValid;

  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * Real accounts now. The screen looks identical; only what happens on submit
   * changed.
   *
   * Sign-up goes to the server first and only advances into onboarding once an
   * account genuinely exists — otherwise someone completes six steps and then
   * discovers their email was taken.
   */
  async function handleSubmit() {
    if (!canSubmit || busy) return;
    setServerError(null);

    if (mode === 'signup') {
      const err = await signUp({ email: email.trim(), password, name: name.trim() });
      if (err) {
        setServerError(err.message);
        // Point the error at the offending field when the server names one.
        if (err.kind === 'http' && err.field === 'email') setTouchedEmail(true);
        return;
      }
      updateProfile({ name: name.trim(), email: email.trim() });
      router.push('/(onboarding)/steps');
      return;
    }

    const err = await signIn({ email: email.trim(), password });
    if (err) {
      setServerError(err.message);
      return;
    }
    // Where they land depends on whether they finished onboarding before; the
    // boot gate owns that decision, so hand back to it rather than guessing.
    router.replace('/');
  }

  function handleSocial(_provider: 'google' | 'apple') {
    setSocialNote(
      t({
        es: 'El inicio de sesión social no está conectado en esta versión.',
        en: 'Social sign-in is not connected in this build.',
      }),
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <PressableScale
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
            quiet
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 5 8 12l7 7"
                stroke={color.textSecondary}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </PressableScale>
          <Wordmark size={26} tint={color.textPrimary} pinFill={color.accent} />
          <View style={{ width: 38 }} />
        </View>

        <Spacer h={space.xxl} />

        {/* Segmented control */}
        <SegmentedControl<Mode>
          options={[
            { key: 'signup', label: t({ es: 'Crear cuenta', en: 'Sign up' }) },
            { key: 'login', label: t({ es: 'Iniciar sesión', en: 'Log in' }) },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            setSocialNote(null);
          }}
        />

        <Spacer h={space.xxl} />

        {/* Form fields */}
        <View>
          {mode === 'signup' && (
            <>
              <Field
                label={t({ es: 'Nombre', en: 'Name' })}
                placeholder={t({ es: 'Tu nombre', en: 'Your name' })}
                value={name}
                onChangeText={setName}
                onBlur={() => setTouchedName(true)}
                error={nameErr}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
              <Spacer h={space.base} />
            </>
          )}

          <Field
            label={t({ es: 'Correo electrónico', en: 'Email' })}
            placeholder={t({ es: 'tu@correo.com', en: 'you@email.com' })}
            value={email}
            onChangeText={setEmail}
            onBlur={() => setTouchedEmail(true)}
            error={emailErr}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />

          <Spacer h={space.base} />

          <Field
            label={t({ es: 'Contraseña', en: 'Password' })}
            placeholder={t({ es: 'Mínimo 8 caracteres', en: 'At least 8 characters' })}
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouchedPassword(true)}
            error={pwErr}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <Spacer h={space.xl} />

          <Button
            label={
              mode === 'signup'
                ? t({ es: 'Continuar', en: 'Continue' })
                : t({ es: 'Entrar', en: 'Log in' })
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={busy}
            variant="primary"
          />

          {serverError ? (
            <Text style={styles.serverError}>{serverError}</Text>
          ) : null}

          {mode === 'login' && (
            <Text style={styles.demoNote}>
              {t({
                es: 'El inicio de sesión es simulado en esta versión de demostración.',
                en: 'Log-in is simulated in this demo build.',
              })}
            </Text>
          )}
        </View>

        <Spacer h={space.xl} />

        {/* Divider with "o" / "or" */}
        <Row align="center" gap={space.md}>
          <Divider style={{ flex: 1 }} />
          <Text style={styles.orText}>{t({ es: 'o', en: 'or' })}</Text>
          <Divider style={{ flex: 1 }} />
        </Row>

        <Spacer h={space.xl} />

        {/* Social buttons */}
        <View>
          <PressableScale
            onPress={() => handleSocial('google')}
            style={styles.socialBtn}
            quiet
          >
            <GoogleMark />
            <Text style={styles.socialLabel}>
              {t({ es: 'Continuar con Google', en: 'Continue with Google' })}
            </Text>
          </PressableScale>

          <Spacer h={space.md} />

          <PressableScale
            onPress={() => handleSocial('apple')}
            style={styles.socialBtn}
            quiet
          >
            <AppleMark />
            <Text style={styles.socialLabel}>
              {t({ es: 'Continuar con Apple', en: 'Continue with Apple' })}
            </Text>
          </PressableScale>

          {socialNote ? (
            <Text style={styles.socialNote}>{socialNote}</Text>
          ) : null}
        </View>

        <Spacer h={space.huge} />
      </KeyboardAwareScrollView>
    </View>
  );
}

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.38.07 2.34.74 3.15.8 1.2-.24 2.35-.93 3.62-.84 1.56.13 2.73.75 3.5 1.91-3.21 1.91-2.44 6.01.63 7.17-.5 1.36-1.16 2.68-2.9 3.84zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill={color.textPrimary}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  serverError: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: color.highlight,
    textAlign: 'center',
    marginTop: space.md,
  },
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: {
    paddingHorizontal: space.base,
    paddingTop: space.huge,
    paddingBottom: space.huge,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoNote: {
    fontFamily: font.regular,
    fontSize: 11.5,
    color: color.textTertiary,
    textAlign: 'center',
    marginTop: space.md,
    lineHeight: 16,
  },
  orText: {
    fontFamily: font.medium,
    fontSize: 13,
    color: color.textTertiary,
  },
  socialBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  socialLabel: {
    fontFamily: font.bold,
    fontSize: 15,
    color: color.textPrimary,
    letterSpacing: 0.1,
  },
  socialNote: {
    fontFamily: font.regular,
    fontSize: 12,
    color: color.textTertiary,
    textAlign: 'center',
    marginTop: space.md,
    lineHeight: 17,
  },
});
