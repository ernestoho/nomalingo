/**
 * Slim status strip for connectivity and pending writes.
 *
 * Shows only when there is something to say — offline, or changes waiting to
 * sync. A permanent "online" badge is noise; users assume things work and only
 * need telling when they do not.
 *
 * The wording matters more than the styling here. "Sin conexión · tus cambios
 * se guardan" tells someone their RSVP is not lost, which is the actual anxiety
 * a dead connection creates. A bare "offline" leaves them wondering.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { color, font, palette, space } from '../theme/tokens';
import { Txt } from './ui';
import { useT } from '../lib/i18n';
import { subscribeNet } from '../lib/net';
import { subscribeOutbox } from '../lib/outbox';
import { useAuth } from '../lib/auth';

export function SyncBar() {
  const t = useT();
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => subscribeNet(({ online: o }) => setOnline(o)), []);
  useEffect(() => subscribeOutbox(setPending), []);

  // Nothing worth interrupting the UI for.
  if (online && pending === 0) return null;
  // Before sign-in there is nothing to sync, so an offline strip is just noise.
  if (!user && online) return null;

  const offline = !online;

  return (
    <Animated.View
      entering={FadeInUp.duration(180)}
      exiting={FadeOutUp.duration(140)}
      style={[styles.bar, { backgroundColor: offline ? palette.ink : palette.tealLight }]}
      pointerEvents="none"
    >
      <View style={[styles.dot, { backgroundColor: offline ? palette.gold : color.accent }]} />
      <Txt
        variant="micro"
        c={offline ? 'rgba(255,255,255,0.92)' : palette.tealDarker}
        style={styles.label}
      >
        {offline
          ? pending > 0
            ? t({
                es: `Sin conexión · ${pending} ${pending === 1 ? 'cambio' : 'cambios'} se guardarán`,
                en: `Offline · ${pending} ${pending === 1 ? 'change' : 'changes'} will sync`,
              })
            : t({ es: 'Sin conexión · tus cambios se guardan', en: 'Offline · your changes are saved' })
          : t({ es: 'Sincronizando…', en: 'Syncing…' })}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: space.base,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: font.bold, letterSpacing: 0.2 },
});
