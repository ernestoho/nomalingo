/**
 * Settings & safety screen.
 *
 * Sections (in order):
 *   a) Verification
 *   b) Install / updates
 *   c) Safety (expandable rows)
 *   d) Privacy toggles
 *   e) Notification toggles
 *   f) Language switch
 *   g) Phrasebook
 *   h) Storage
 *   i) Reset demo data
 *   j) Disclosure notes
 *
 * Safety copy is plain pan-Hispanic — no slang, no emoji, no humour.
 */

import React, { useState, useCallback } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import {
  Screen,
  Row,
  Spacer,
  Divider,
  Txt,
  SectionHeader,
  Tag,
  PressableScale,
  Button,
  Card,
  ToggleRow,
  Disclosure,
  EmptyState,
  ScreenHeader,
} from '../components/ui';
import {
  ChevronRight,
  ShieldIcon,
  VerifiedIcon,
  CheckIcon,
} from '../components/icons';
import { color, palette, radius, space, font, shadow } from '../theme/tokens';
import { useT, useLang, formatNumber } from '../lib/i18n';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import * as haptics from '../lib/haptics';
import { isWeb } from '../lib/device';

/* ── expo-updates guarded import ── */
let Updates: {
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  updateId?: string | null;
  releaseChannel?: string;
  runtimeVersion?: string | null;
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Updates = require('expo-updates');
} catch {
  Updates = null;
}

/* ============================================================
   Safety expandable row
   ============================================================ */

function SafetyRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: space.md,
        }}
      >
        <Txt variant="bodyStrong" style={{ flex: 1, paddingRight: space.sm }}>
          {title}
        </Txt>
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 18,
            color: color.textTertiary,
            lineHeight: 22,
          }}
        >
          {open ? '−' : '+'}
        </Text>
      </PressableScale>
      {open && (
        <View style={{ paddingBottom: space.md }}>
          {children}
        </View>
      )}
    </View>
  );
}

/* ============================================================
   Main screen
   ============================================================ */

export default function SettingsScreen() {
  const t = useT();
  const { lang, setLang } = useLang();
  const {
    settings,
    setSetting,
    phrases,
    removePhrase,
    usageKb,
    refreshUsage,
    resetDemoData,
  } = useStore();

  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Web two-tap confirm for reset
  const { user, isAdmin, signOut, online } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [resetConfirmPending, setResetConfirmPending] = useState(false);

  /* ── update check ── */
  const handleCheckUpdate = useCallback(async () => {
    if (isWeb) {
      setUpdateMsg(t({ es: 'Las actualizaciones no están disponibles en web.', en: 'Updates are not available on web.' }));
      return;
    }
    if (!Updates) {
      setUpdateMsg(t({ es: 'Información de actualización no disponible.', en: 'Update info is not available.' }));
      return;
    }
    setCheckingUpdate(true);
    setUpdateMsg(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setUpdateMsg(t({ es: 'Hay una actualización disponible. Reinicia la app para instalarla.', en: 'An update is available. Restart the app to install it.' }));
      } else {
        setUpdateMsg(t({ es: 'La app está al día.', en: 'The app is up to date.' }));
      }
    } catch {
      setUpdateMsg(t({ es: 'No se pudo comprobar. Verifica tu conexión.', en: 'Could not check. Check your connection.' }));
    } finally {
      setCheckingUpdate(false);
    }
  }, [t]);

  /* ── reset ── */
  const handleReset = useCallback(() => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        t({ es: 'Reiniciar datos de demo', en: 'Reset demo data' }),
        t({
          es: '¿Seguro? Esto borra todo el progreso local y vuelve al inicio.',
          en: 'Are you sure? This clears all local progress and returns to onboarding.',
        }),
        [
          { text: t({ es: 'Cancelar', en: 'Cancel' }), style: 'cancel' },
          {
            text: t({ es: 'Reiniciar', en: 'Reset' }),
            style: 'destructive',
            onPress: async () => {
              await resetDemoData();
              router.replace('/');
            },
          },
        ],
      );
    } else {
      if (!resetConfirmPending) {
        setResetConfirmPending(true);
        setTimeout(() => setResetConfirmPending(false), 4000);
      } else {
        setResetConfirmPending(false);
        resetDemoData().then(() => router.replace('/'));
      }
    }
  }, [resetConfirmPending, resetDemoData, t]);

  /* ── helpers ── */
  function setting<K extends keyof typeof settings>(key: K) {
    return {
      value: settings[key] as boolean,
      onValueChange: (v: boolean) => {
        setSetting(key, v as typeof settings[K]);
        haptics.light();
      },
    };
  }

  const appVersion = Constants.expoConfig?.version ?? '—';
  let runtimeVersion: string | null = null;
  let updateId: string | null = null;
  try {
    runtimeVersion = Updates?.runtimeVersion ?? null;
    updateId = Updates?.updateId ?? null;
  } catch {
    // no-op
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t({ es: 'Configuración', en: 'Settings' })}
        onBack={() => router.back()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.base, paddingBottom: 60 }}
      >

        {/* ══════════════════════════════════════════
            ACCOUNT
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Tu cuenta', en: 'Your account' })} />
        <Card style={{ marginBottom: space.xl }}>
          <Row gap={space.md} align="flex-start">
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{user?.name || t({ es: 'Miembro', en: 'Member' })}</Txt>
              <Spacer h={2} />
              <Txt variant="caption">{user?.email ?? ''}</Txt>
            </View>
            {isAdmin ? <Tag label={t({ es: 'ADMIN', en: 'ADMIN' })} tone="accent" /> : null}
          </Row>

          {isAdmin ? (
            <>
              <Spacer h={space.base} />
              <Divider />
              <Spacer h={space.base} />
              <Button
                label={t({ es: 'Panel de administración', en: 'Admin dashboard' })}
                variant="secondary"
                onPress={() => router.push('/(admin)')}
              />
            </>
          ) : null}

          <Spacer h={space.base} />
          <Divider />
          <Spacer h={space.base} />

          <Button
            label={t({ es: 'Cerrar sesión', en: 'Sign out' })}
            variant="ghost"
            loading={signingOut}
            onPress={async () => {
              setSigningOut(true);
              await signOut();
              // Back to the gate, which sends a signed-out user to welcome.
              router.replace('/');
            }}
          />

          {!online ? (
            <>
              <Spacer h={space.sm} />
              <Txt variant="caption" style={{ textAlign: 'center' }}>
                {t({
                  es: 'Sin conexión. Puedes seguir usando la app; lo que hagas se sincroniza al volver.',
                  en: 'Offline. You can keep using the app; anything you do syncs when you reconnect.',
                })}
              </Txt>
            </>
          ) : null}
        </Card>

        {/* ══════════════════════════════════════════
            a) VERIFICATION
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Verificación', en: 'Verification' })} />
        <Card style={{ marginBottom: space.xl }}>
          <Row gap={space.md} align="flex-start">
            <VerifiedIcon size={28} c={color.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">
                {t({ es: 'Verificar mi perfil', en: 'Verify my profile' })}
              </Txt>
              <Spacer h={space.xs} />
              <Txt variant="body">
                {t({
                  es: 'La verificación confirmaría tu identidad y añadiría una insignia a tu perfil, generando más confianza con otros miembros.',
                  en: 'Verification would confirm your identity and add a badge to your profile, building more trust with other members.',
                })}
              </Txt>
              <Spacer h={space.md} />
              <Txt variant="caption" c={color.textTertiary}>
                {t({
                  es: 'La verificación de identidad no está conectada en esta versión de la app.',
                  en: 'Identity verification is not connected in this version of the app.',
                })}
              </Txt>
              <Spacer h={space.md} />
              <Button
                label={t({ es: 'Verificar mi perfil', en: 'Verify my profile' })}
                variant="secondary"
                onPress={() => {/* not connected */}}
                full={false}
                disabled
              />
            </View>
          </Row>
        </Card>

        {/* ══════════════════════════════════════════
            b) INSTALL / UPDATES
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Instalación y actualizaciones', en: 'Install & updates' })} />
        <Card style={{ marginBottom: space.xl }}>
          <Row justify="space-between" style={{ paddingVertical: space.xs }}>
            <Txt variant="label" c={color.textTertiary}>
              {t({ es: 'Versión', en: 'Version' })}
            </Txt>
            <Txt variant="bodyStrong">{appVersion}</Txt>
          </Row>

          {runtimeVersion ? (
            <>
              <Divider style={{ marginVertical: space.sm }} />
              <Row justify="space-between" style={{ paddingVertical: space.xs }}>
                <Txt variant="label" c={color.textTertiary}>
                  {t({ es: 'Runtime', en: 'Runtime' })}
                </Txt>
                <Txt variant="bodyStrong">{runtimeVersion}</Txt>
              </Row>
            </>
          ) : null}

          {updateId ? (
            <>
              <Divider style={{ marginVertical: space.sm }} />
              <Row justify="space-between" style={{ paddingVertical: space.xs }}>
                <Txt variant="label" c={color.textTertiary}>
                  Update ID
                </Txt>
                <Txt variant="caption" numberOfLines={1} style={{ maxWidth: 180 }}>
                  {updateId}
                </Txt>
              </Row>
            </>
          ) : null}

          <Divider style={{ marginVertical: space.md }} />
          <Button
            label={
              checkingUpdate
                ? t({ es: 'Verificando…', en: 'Checking…' })
                : t({ es: 'Buscar actualizaciones', en: 'Check for updates' })
            }
            variant="secondary"
            onPress={handleCheckUpdate}
            loading={checkingUpdate}
            full={false}
          />
          {updateMsg ? (
            <Txt variant="caption" style={{ marginTop: space.sm }} c={color.textSecondary}>
              {updateMsg}
            </Txt>
          ) : null}
        </Card>

        {/* ══════════════════════════════════════════
            c) SAFETY
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Seguridad', en: 'Safety' })} />
        <Card style={{ marginBottom: space.xl }}>

          {/* Reportar o bloquear */}
          <SafetyRow title={t({ es: 'Reportar o bloquear a alguien', en: 'Report or block someone' })}>
            <Txt variant="body">
              {t({
                es: 'Puedes reportar o bloquear a cualquier miembro directamente desde su perfil. Al bloquear a alguien, esa persona desaparece de tus coincidencias y conversaciones, y no puede ver tu perfil.',
                en: 'You can report or block any member directly from their profile. When you block someone, they are removed from your matches and conversations, and cannot see your profile.',
              })}
            </Txt>
          </SafetyRow>

          <Divider />

          {/* Reglas de la comunidad */}
          <SafetyRow title={t({ es: 'Reglas de la comunidad', en: 'Community rules' })}>
            <View style={{ gap: space.md }}>
              <CommunityRule
                number="1"
                text={t({
                  es: 'El respeto es la base de todo intercambio. Nadie aprende en un ambiente donde se siente juzgado.',
                  en: 'Respect is the foundation of every exchange. Nobody learns in an environment where they feel judged.',
                })}
              />
              <CommunityRule
                number="2"
                text={t({
                  es: 'Esta es una plataforma de intercambio de idiomas y conexión cultural, no una aplicación de citas.',
                  en: 'This is a language exchange and cultural connection platform, not a dating app.',
                })}
              />
              <CommunityRule
                number="3"
                text={t({
                  es: 'Los encuentros presenciales se realizan en los lugares públicos listados en la app.',
                  en: 'In-person meetups take place at the public venues listed in the app.',
                })}
              />
            </View>
          </SafetyRow>

          <Divider />

          {/* Consejos para encuentros */}
          <SafetyRow title={t({ es: 'Consejos para encuentros', en: 'Meetup tips' })}>
            <View style={{ gap: space.md }}>
              <Txt variant="body">
                {t({
                  es: 'Reúnete siempre en los lugares públicos listados en la aplicación.',
                  en: 'Always meet at the public venues listed in the application.',
                })}
              </Txt>
              <Txt variant="body">
                {t({
                  es: 'Informa a alguien de confianza sobre adónde vas y a qué hora esperas regresar.',
                  en: 'Tell someone you trust where you are going and when you expect to return.',
                })}
              </Txt>
              <Txt variant="body">
                {t({
                  es: 'Organiza tu propio transporte de ida y de vuelta.',
                  en: 'Arrange your own transport to and from the meetup.',
                })}
              </Txt>
              <Txt variant="body">
                {t({
                  es: 'Si en algún momento te sientes incómodo o inseguro, tienes todo el derecho de retirarte.',
                  en: 'If at any point you feel uncomfortable or unsafe, you have every right to leave.',
                })}
              </Txt>
            </View>
          </SafetyRow>

          <Divider />

          {/* Insignias y verificación */}
          <SafetyRow title={t({ es: 'Insignias y verificación', en: 'Badges and verification' })}>
            <View style={{ gap: space.md }}>
              <BadgeExplainer
                icon={<VerifiedIcon size={18} c={color.accent} />}
                label={t({ es: 'Perfil verificado', en: 'Verified profile' })}
                desc={t({
                  es: 'Indica que el miembro ha completado el proceso de verificación de identidad.',
                  en: 'Indicates the member has completed the identity verification process.',
                })}
              />
              <BadgeExplainer
                icon={<CheckIcon size={18} c={color.accent} />}
                label={t({ es: 'Perfil completo', en: 'Complete profile' })}
                desc={t({
                  es: 'El miembro tiene nombre, al menos un idioma que aprende, y dos o más intereses.',
                  en: 'The member has a name, at least one language they are learning, and two or more interests.',
                })}
              />
            </View>
          </SafetyRow>
        </Card>

        {/* ══════════════════════════════════════════
            d) PRIVACY
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Privacidad', en: 'Privacy' })} />
        <Card style={{ marginBottom: space.xl }}>
          <ToggleRow
            title={t({ es: 'Mostrar mi zona', en: 'Show my area' })}
            subtitle={t({ es: 'Otros miembros ven tu zona en tu perfil.', en: 'Other members see your area on your profile.' })}
            {...setting('showArea')}
          />
          <Divider />
          <ToggleRow
            title={t({ es: 'Aparecer en Descubrir', en: 'Appear in Discover' })}
            subtitle={t({ es: 'Tu perfil aparece en las sugerencias de coincidencias.', en: 'Your profile appears in match suggestions.' })}
            {...setting('discoverable')}
          />
          <Divider />
          <ToggleRow
            title={t({ es: 'Confirmaciones de lectura', en: 'Read receipts' })}
            subtitle={t({ es: 'Los demás ven cuándo lees sus mensajes.', en: 'Others see when you read their messages.' })}
            {...setting('readReceipts')}
          />
        </Card>

        {/* ══════════════════════════════════════════
            e) NOTIFICATIONS
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Notificaciones', en: 'Notifications' })} />
        <Card style={{ marginBottom: space.xl }}>
          <ToggleRow
            title={t({ es: 'Sugerencias de práctica', en: 'Practice suggestions' })}
            subtitle={t({ es: 'Recibe sugerencias personalizadas de compañeros de práctica.', en: 'Receive personalised practice partner suggestions.' })}
            {...setting('notifySuggestions')}
          />
          <Divider />
          <ToggleRow
            title={t({ es: 'Encuentros y eventos', en: 'Meetups and events' })}
            subtitle={t({ es: 'Recordatorios de encuentros a los que te apuntaste.', en: 'Reminders for meetups you signed up for.' })}
            {...setting('notifyEvents')}
          />
          <Divider />
          <ToggleRow
            title={t({ es: 'Correcciones nuevas', en: 'New corrections' })}
            subtitle={t({ es: 'Aviso cuando alguien guarda una corrección de tus mensajes.', en: 'Alert when someone saves a correction of your messages.' })}
            {...setting('notifyCorrections')}
          />
        </Card>

        {/* ══════════════════════════════════════════
            f) LANGUAGE
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Idioma de la app', en: 'App language' })} />
        <Card style={{ marginBottom: space.xl }}>
          <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.md }}>
            {t({ es: 'El español es el idioma predeterminado.', en: 'Spanish is the default language.' })}
          </Txt>
          <Row gap={space.md}>
            <PressableScale
              onPress={() => {
                setLang('es');
                haptics.light();
              }}
              style={{
                flex: 1,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: lang === 'es' ? color.accent : color.chip,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: lang === 'es' ? color.accent : color.chipBorder,
              }}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 14,
                  color: lang === 'es' ? color.onAccent : color.textSecondary,
                }}
              >
                ES · Español
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => {
                setLang('en');
                haptics.light();
              }}
              style={{
                flex: 1,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: lang === 'en' ? color.accent : color.chip,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: lang === 'en' ? color.accent : color.chipBorder,
              }}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 14,
                  color: lang === 'en' ? color.onAccent : color.textSecondary,
                }}
              >
                EN · English
              </Text>
            </PressableScale>
          </Row>
        </Card>

        {/* ══════════════════════════════════════════
            g) PHRASEBOOK
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Frasario', en: 'Phrasebook' })} />
        <Card style={{ marginBottom: space.xl }} padded={phrases.length > 0}>
          {phrases.length === 0 ? (
            <EmptyState
              emoji="📝"
              title={t({ es: 'Aún sin frases guardadas', en: 'No phrases saved yet' })}
              body={t({
                es: 'Cuando alguien corrija algo en el chat, guarda la corrección y aparecerá aquí.',
                en: 'When someone corrects something in chat, save the correction and it will appear here.',
              })}
            />
          ) : (
            <>
              <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.md }}>
                {t({
                  es: `${formatNumber(phrases.length, lang)} ${phrases.length === 1 ? 'frase guardada' : 'frases guardadas'}`,
                  en: `${formatNumber(phrases.length, lang)} ${phrases.length === 1 ? 'saved phrase' : 'saved phrases'}`,
                })}
              </Txt>
              {phrases.map((phrase, index) => (
                <View key={`${phrase.wrong}-${phrase.savedAt}`}>
                  {index > 0 && <Divider style={{ marginVertical: space.md }} />}
                  <Row justify="space-between" align="flex-start">
                    <View style={{ flex: 1, gap: space.xs }}>
                      <Text
                        style={{
                          fontFamily: font.regular,
                          fontSize: 14,
                          color: color.highlight,
                          textDecorationLine: 'line-through',
                        }}
                      >
                        {phrase.wrong}
                      </Text>
                      <Text
                        style={{
                          fontFamily: font.medium,
                          fontSize: 14,
                          color: color.accent,
                        }}
                      >
                        {phrase.right}
                      </Text>
                      <Text
                        style={{
                          fontFamily: font.regular,
                          fontSize: 12.5,
                          color: color.textTertiary,
                          lineHeight: 17,
                        }}
                      >
                        {lang === 'es' ? phrase.why.es : phrase.why.en}
                      </Text>
                    </View>
                    <PressableScale
                      onPress={() => {
                        removePhrase(index);
                        haptics.impact();
                      }}
                      style={{
                        marginLeft: space.sm,
                        paddingHorizontal: space.sm,
                        paddingVertical: space.xs,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: font.medium,
                          fontSize: 20,
                          color: color.textTertiary,
                          lineHeight: 24,
                        }}
                      >
                        ×
                      </Text>
                    </PressableScale>
                  </Row>
                </View>
              ))}
            </>
          )}
        </Card>

        {/* ══════════════════════════════════════════
            h) STORAGE
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Almacenamiento', en: 'Storage' })} />
        <Card style={{ marginBottom: space.xl }}>
          <Row justify="space-between" align="center">
            <View>
              <Txt variant="bodyStrong">
                {t({ es: 'Datos locales', en: 'Local data' })}
              </Txt>
              <Txt variant="caption" c={color.textTertiary}>
                {formatNumber(usageKb, lang)} KB
              </Txt>
            </View>
            <Button
              label={t({ es: 'Actualizar', en: 'Refresh' })}
              variant="secondary"
              size="md"
              onPress={refreshUsage}
              full={false}
            />
          </Row>
        </Card>

        {/* ══════════════════════════════════════════
            i) RESET DEMO DATA
        ══════════════════════════════════════════ */}
        <SectionHeader title={t({ es: 'Datos de demo', en: 'Demo data' })} />
        <Card style={{ marginBottom: space.xl }}>
          <Txt variant="body" style={{ marginBottom: space.md }}>
            {t({
              es: 'Reinicia todo el contenido de demo y vuelve al inicio. No afecta datos reales de cuenta.',
              en: 'Resets all demo content and returns to onboarding. Does not affect real account data.',
            })}
          </Txt>
          <Button
            label={
              resetConfirmPending
                ? t({ es: 'Confirmar reinicio', en: 'Confirm reset' })
                : t({ es: 'Reiniciar datos de demo', en: 'Reset demo data' })
            }
            variant="danger"
            onPress={handleReset}
            full={false}
          />
        </Card>

        {/* ══════════════════════════════════════════
            j) DISCLOSURE NOTES
        ══════════════════════════════════════════ */}
        <Spacer h={space.sm} />
        <View style={{ gap: space.sm }}>
          <Disclosure
            text={t({
              es: 'Los perfiles de miembros que aparecen en la app son personas ilustrativas, no personas reales.',
              en: 'The member profiles shown in the app are illustrative personas, not real people.',
            })}
          />
          <Disclosure
            text={t({
              es: 'Los lugares mostrados son reales y están listados públicamente, pero aparecen como anfitriones ilustrativos. Los acuerdos con socios son ilustrativos y no implican una alianza firmada.',
              en: 'The venues shown are real, publicly listed places shown as illustrative hosts. Partner deals are illustrative and do not imply a signed partnership.',
            })}
          />
          <Disclosure
            text={t({
              es: 'La información práctica fue investigada en 2026 y está sujeta a cambios.',
              en: 'Practical information was researched in 2026 and is subject to change.',
            })}
          />
          <Disclosure
            text="Inspirado por el Nómada Language Social Club, fundado en Punta Cana en febrero de 2026 por Jennifer Ventura."
          />
        </View>

        <Spacer h={space.xxl} />
      </ScrollView>
    </Screen>
  );
}

/* ── sub-components ── */

function CommunityRule({ number, text }: { number: string; text: string }) {
  return (
    <Row gap={space.md} align="flex-start">
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: palette.tealLight,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 12,
            color: color.accent,
          }}
        >
          {number}
        </Text>
      </View>
      <Txt variant="body" style={{ flex: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

function BadgeExplainer({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Row gap={space.md} align="flex-start">
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{label}</Txt>
        <Txt variant="caption" style={{ marginTop: 2 }}>{desc}</Txt>
      </View>
    </Row>
  );
}
