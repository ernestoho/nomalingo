/**
 * Organiser QR scanner modal.
 *
 * On web: no camera access attempt — shows explanation plus a paste-and-verify
 * fallback so the screen is testable on the web build.
 *
 * On native: CameraView from expo-camera with permission gated behind an
 * explicit tap. No prompt on mount; a cold denial is permanent on iOS.
 *
 * Debounce via a `locked` ref so one QR in frame doesn't fire dozens of times.
 */

import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  Disclosure,
  Field,
  Row,
  ScreenHeader,
  Screen,
  Spacer,
  Txt,
} from '../components/ui';
import { CameraIcon, CheckIcon, ShieldIcon } from '../components/icons';

import { useT } from '../lib/i18n';
import * as haptics from '../lib/haptics';
import { isWeb } from '../lib/device';

import { verifyQrPayload, type VerifyResult } from '../lib/qr';
import { color, palette, radius, space } from '../theme/tokens';

// ── Types ──

type CameraPermStatus = 'idle' | 'requesting' | 'granted' | 'denied';
type ScanState =
  | { kind: 'idle' }
  | { kind: 'valid'; holder: string; eventId: string }
  | { kind: 'invalid'; reason: 'malformed' | 'version' | 'signature' };

// ── Web fallback ──

function WebFallback() {
  const t = useT();
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<ScanState>({ kind: 'idle' });

  const verify = () => {
    if (!payload.trim()) return;
    const res = verifyQrPayload(payload.trim());
    if (res.ok) {
      haptics.success();
      setResult({ kind: 'valid', holder: res.payload.holder, eventId: res.payload.eventId });
    } else {
      haptics.error();
      setResult({ kind: 'invalid', reason: res.reason });
    }
  };

  return (
    <View style={{ paddingHorizontal: space.base, gap: space.xl }}>
      {/* Explanation */}
      <Card padded>
        <Row gap={space.md} align="flex-start">
          <CameraIcon size={22} c={color.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="bodyStrong">
              {t({ es: 'Escáner disponible en la app', en: 'Scanner available in the app' })}
            </Txt>
            <Txt variant="caption" style={{ lineHeight: 18 }}>
              {t({
                es: 'Para escanear los códigos QR de los asistentes en la puerta, abre NómadaLingo en tu teléfono. Mientras tanto, puedes pegar un payload aquí para verificarlo.',
                en: 'To scan attendee QR codes at the door, open NómadaLingo on your phone. In the meantime, paste a payload below to verify it.',
              })}
            </Txt>
          </View>
        </Row>
      </Card>

      {/* Paste + verify */}
      <View style={{ gap: space.md }}>
        <Txt variant="h3">
          {t({ es: 'Verificar manualmente', en: 'Verify manually' })}
        </Txt>
        <Field
          label={t({ es: 'Payload del QR', en: 'QR payload' })}
          placeholder={t({ es: 'Pega el contenido del QR aquí', en: 'Paste QR content here' })}
          value={payload}
          onChangeText={setPayload}
          multiline
          style={{ height: 100, paddingTop: space.md } as any}
        />
        <Button
          label={t({ es: 'Verificar', en: 'Verify' })}
          onPress={verify}
          disabled={!payload.trim()}
        />
      </View>

      {/* Result */}
      {result.kind !== 'idle' ? (
        <ResultCard result={result} onReset={() => { setResult({ kind: 'idle' }); setPayload(''); }} />
      ) : null}

      <Disclosure
        text={t({
          es: 'En esta versión la firma es un checksum, no una firma criptográfica de servidor. Detecta errores accidentales y ediciones simples; no es un sistema de seguridad definitivo.',
          en: 'In this build the signature is a checksum, not a server cryptographic signature. It detects accidental corruption and simple edits; it is not a final security system.',
        })}
      />
    </View>
  );
}

// ── Native scanner ──

function NativeScanner() {
  const t = useT();
  const [permStatus, setPermStatus] = useState<CameraPermStatus>('idle');
  const [result, setResult] = useState<ScanState>({ kind: 'idle' });
  const lockedRef = useRef(false);

  // Lazy import so the web bundle never touches expo-camera
  const requestAndStart = useCallback(async () => {
    setPermStatus('requesting');
    try {
      // Dynamic import — only reached on native
      const cam = await import('expo-camera');
      const { status } = await cam.Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        setPermStatus('granted');
      } else {
        setPermStatus('denied');
      }
    } catch {
      setPermStatus('denied');
    }
  }, []);

  const handleBarcode = useCallback(({ data }: { data: string }) => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    const res = verifyQrPayload(data);
    if (res.ok) {
      haptics.success();
      setResult({ kind: 'valid', holder: res.payload.holder, eventId: res.payload.eventId });
    } else {
      haptics.error();
      setResult({ kind: 'invalid', reason: res.reason });
    }
  }, []);

  const reset = () => {
    setResult({ kind: 'idle' });
    lockedRef.current = false;
  };

  if (permStatus === 'idle') {
    return (
      <View style={{ paddingHorizontal: space.base, gap: space.xl }}>
        <Card padded>
          <View style={{ gap: space.md, alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: palette.tealLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CameraIcon size={28} c={palette.teal} />
            </View>
            <Txt variant="h3" style={{ textAlign: 'center' }}>
              {t({ es: 'Escáner de entrada', en: 'Entry scanner' })}
            </Txt>
            <Txt variant="body" style={{ textAlign: 'center' }}>
              {t({
                es: 'Activa la cámara para escanear los códigos QR de los asistentes en la puerta.',
                en: 'Turn on the camera to scan attendee QR codes at the door.',
              })}
            </Txt>
            <Button
              label={t({ es: 'Activar cámara', en: 'Turn on camera' })}
              onPress={requestAndStart}
              icon={<CameraIcon size={16} c="#fff" />}
            />
          </View>
        </Card>

        <Disclosure
          text={t({
            es: 'En esta versión la firma es un checksum, no una firma criptográfica de servidor. Detecta errores accidentales y ediciones simples.',
            en: 'In this build the signature is a checksum, not a server cryptographic signature. It detects accidental corruption and simple edits.',
          })}
        />
      </View>
    );
  }

  if (permStatus === 'requesting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <Txt variant="body" style={{ textAlign: 'center' }}>
          {t({ es: 'Esperando permiso de cámara…', en: 'Waiting for camera permission…' })}
        </Txt>
      </View>
    );
  }

  if (permStatus === 'denied') {
    return (
      <View style={{ paddingHorizontal: space.base, gap: space.xl }}>
        <Card padded>
          <View style={{ gap: space.md, alignItems: 'center' }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: palette.coralLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldIcon size={24} c={palette.coral} />
            </View>
            <Txt variant="h3" style={{ textAlign: 'center' }}>
              {t({ es: 'Permiso denegado', en: 'Permission denied' })}
            </Txt>
            <Txt variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
              {t({
                es: 'Para activar el escáner, ve a Ajustes del teléfono → NómadaLingo → Cámara y activa el permiso.',
                en: 'To enable the scanner, go to your phone Settings → NómadaLingo → Camera and grant permission.',
              })}
            </Txt>
          </View>
        </Card>
      </View>
    );
  }

  // Permission granted — show CameraView
  if (result.kind !== 'idle') {
    return (
      <View style={{ paddingHorizontal: space.base, gap: space.xl }}>
        <ResultCard result={result} onReset={reset} />
        <Disclosure
          text={t({
            es: 'En esta versión la firma es un checksum, no una firma criptográfica de servidor.',
            en: 'In this build the signature is a checksum, not a server cryptographic signature.',
          })}
        />
      </View>
    );
  }

  return (
    <NativeCameraView onBarcode={handleBarcode} />
  );
}

// Lazy native CameraView rendered only when permission is granted on native
function NativeCameraView({ onBarcode }: { onBarcode: (e: { data: string }) => void }) {
  const t = useT();
  const [CameraViewComponent, setCameraViewComponent] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    let alive = true;
    import('expo-camera').then(({ CameraView }) => {
      if (alive) setCameraViewComponent(() => CameraView);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!CameraViewComponent) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt variant="body">
          {t({ es: 'Cargando cámara…', en: 'Loading camera…' })}
        </Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraViewComponent
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcode}
      />
      {/* Viewfinder overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none"
      >
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: palette.teal,
          }}
        />
        <Txt variant="caption" c={palette.white} style={{ marginTop: space.xl, textAlign: 'center' }}>
          {t({ es: 'Apunta al código QR del asistente', en: 'Point at the attendee QR code' })}
        </Txt>
      </View>
    </View>
  );
}

// ── Shared result card ──

function ResultCard({
  result,
  onReset,
}: {
  result: ScanState;
  onReset: () => void;
}) {
  const t = useT();

  const isValid = result.kind === 'valid';

  const reasonText = result.kind === 'invalid'
    ? {
        malformed: t({ es: 'El código QR está malformado o no es de NómadaLingo.', en: 'The QR code is malformed or not from NómadaLingo.' }),
        version: t({ es: 'Versión de código no reconocida. Pide al asistente que actualice la app.', en: 'Unrecognised code version. Ask the attendee to update the app.' }),
        signature: t({ es: 'La firma no coincide. Este código puede haber sido modificado.', en: 'The signature does not match. This code may have been altered.' }),
      }[result.reason]
    : '';

  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: isValid ? palette.tealLight : palette.coralLight,
        padding: space.xl,
        gap: space.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isValid ? palette.teal : palette.coral,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isValid ? palette.teal : palette.coral,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isValid ? (
          <CheckIcon size={32} c="#fff" strokeWidth={2.6} />
        ) : (
          <ShieldIcon size={28} c="#fff" />
        )}
      </View>

      <Txt
        variant="h2"
        c={isValid ? palette.tealDarker : '#B24632'}
        style={{ textAlign: 'center' }}
      >
        {isValid
          ? t({ es: '¡Acceso válido!', en: 'Valid entry!' })
          : t({ es: 'Código no válido', en: 'Invalid code' })}
      </Txt>

      {result.kind === 'valid' ? (
        <>
          <Txt variant="bodyStrong" style={{ textAlign: 'center' }}>
            {result.holder}
          </Txt>
          <Txt variant="caption" style={{ textAlign: 'center' }}>
            {result.eventId}
          </Txt>
        </>
      ) : (
        <Txt variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
          {reasonText}
        </Txt>
      )}

      <Button
        label={t({ es: 'Escanear otro', en: 'Scan another' })}
        onPress={onReset}
        variant={isValid ? 'primary' : 'secondary'}
        size="md"
        full={false}
      />
    </View>
  );
}

// ── Root ──

export default function ScanScreen() {
  const router = useRouter();
  const t = useT();

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t({ es: 'Verificar entrada', en: 'Check-in scanner' })}
        onBack={() => router.back()}
      />

      {isWeb ? <WebFallback /> : <NativeScanner />}

      <Spacer h={space.xl} />
    </Screen>
  );
}
