/**
 * Admin — venues list + create/edit form.
 *
 * - Lists all venues including unpublished (marked with a Tag).
 * - Tapping a row opens the edit panel inline.
 * - A floating action opens the create panel.
 * - Delete surfaces the API's 409 message verbatim.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import AdminShell, { ErrorBanner, OfflineBanner } from '../../components/AdminShell';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Field,
  PressableScale,
  Row,
  SectionHeader,
  Skeleton,
  Spacer,
  Tag,
  ToggleRow,
  Txt,
} from '../../components/ui';
import { PlusIcon, StarIcon } from '../../components/icons';
import { api } from '../../lib/api';
import { formatNumber, useT, useLang } from '../../lib/i18n';
import { useSync } from '../../lib/content-sync';
import {
  AMENITIES,
  AREA_NAMES,
  VENUE_TYPES,
  amenityEmoji,
  amenityLabel,
  venueTypeEmoji,
  venueTypeLabel,
} from '../../data/reference';
import { color, font, radius, space } from '../../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Venue = {
  id: string;
  name: string;
  type: string;
  area: string;
  rating: number | null;
  sponsorDeal: { es?: string; en?: string } | null;
  amenities: string[];
  blurb: { es?: string; en?: string };
  photoSeed: string;
  published: boolean;
  meetupCount: number;
};

const PHOTO_SEEDS = ['coworking', 'cafe', 'bar', 'beach', 'plaza'] as const;

/* ------------------------------------------------------------------ */
/*  Confirm helper — Alert on native, two-tap on web                   */
/* ------------------------------------------------------------------ */

type ConfirmState = { itemId: string; message: string } | null;

/* ------------------------------------------------------------------ */
/*  Edit form                                                           */
/* ------------------------------------------------------------------ */

type FormData = {
  name: string;
  type: string;
  area: string;
  rating: string;
  photoSeed: string;
  published: boolean;
  sponsorDealEs: string;
  sponsorDealEn: string;
  blurbEs: string;
  blurbEn: string;
  amenities: string[];
};

function blankForm(): FormData {
  return {
    name: '',
    type: 'cafe',
    area: 'Bávaro',
    rating: '',
    photoSeed: 'cafe',
    published: true,
    sponsorDealEs: '',
    sponsorDealEn: '',
    blurbEs: '',
    blurbEn: '',
    amenities: [],
  };
}

function venueToForm(v: Venue): FormData {
  return {
    name: v.name,
    type: v.type,
    area: v.area,
    rating: v.rating != null ? String(v.rating) : '',
    photoSeed: v.photoSeed,
    published: v.published,
    sponsorDealEs: v.sponsorDeal?.es ?? '',
    sponsorDealEn: v.sponsorDeal?.en ?? '',
    blurbEs: v.blurb?.es ?? '',
    blurbEn: v.blurb?.en ?? '',
    amenities: Array.isArray(v.amenities) ? v.amenities : [],
  };
}

function VenueForm({
  initial,
  venues,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  initial: FormData;
  venues: Venue[];
  onSave: (form: FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  isNew: boolean;
}) {
  const t = useT();
  const { lang } = useLang();
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k: keyof FormData, v: FormData[keyof FormData]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleAmenity = (key: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(key)
        ? f.amenities.filter((a) => a !== key)
        : [...f.amenities, key],
    }));
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError(t({ es: 'El nombre es obligatorio (mínimo 2 caracteres).', en: 'Name is required (min 2 characters).' }));
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (Platform.OS !== 'web') {
      Alert.alert(
        t({ es: 'Eliminar lugar', en: 'Delete venue' }),
        t({ es: '¿Confirmas que quieres eliminar este lugar?', en: 'Confirm deleting this venue?' }),
        [
          { text: t({ es: 'Cancelar', en: 'Cancel' }), style: 'cancel' },
          {
            text: t({ es: 'Eliminar', en: 'Delete' }),
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            },
          },
        ],
      );
    } else {
      if (!confirmDelete) {
        setConfirmDelete(true);
        return;
      }
      setDeleting(true);
      await onDelete();
      setDeleting(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.formScroll}>
      <Txt variant="h3">
        {isNew
          ? t({ es: 'Nuevo lugar', en: 'New venue' })
          : t({ es: 'Editar lugar', en: 'Edit venue' })}
      </Txt>
      <Spacer h={space.lg} />

      {formError && <ErrorBanner message={formError} />}

      <Field
        label={t({ es: 'Nombre', en: 'Name' })}
        value={form.name}
        onChangeText={(v) => set('name', v)}
        placeholder={t({ es: 'Nombre del lugar', en: 'Venue name' })}
      />
      <Spacer h={space.md} />

      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Tipo', en: 'Type' })}
      </Txt>
      <Spacer h={space.xs} />
      <Row wrap gap={space.xs}>
        {VENUE_TYPES.map((vt) => (
          <Chip
            key={vt.key}
            label={venueTypeLabel(vt.key, lang)}
            emoji={venueTypeEmoji(vt.key)}
            selected={form.type === vt.key}
            onPress={() => set('type', vt.key)}
            small
          />
        ))}
      </Row>
      <Spacer h={space.md} />

      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Zona', en: 'Area' })}
      </Txt>
      <Spacer h={space.xs} />
      <Row wrap gap={space.xs}>
        {AREA_NAMES.map((a) => (
          <Chip
            key={a}
            label={a}
            selected={form.area === a}
            onPress={() => set('area', a)}
            small
          />
        ))}
      </Row>
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Calificación (0–5)', en: 'Rating (0–5)' })}
        value={form.rating}
        onChangeText={(v) => set('rating', v)}
        placeholder={t({ es: 'Opcional', en: 'Optional' })}
        keyboardType="decimal-pad"
      />
      <Spacer h={space.md} />

      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Foto de referencia', en: 'Photo seed' })}
      </Txt>
      <Spacer h={space.xs} />
      <Row wrap gap={space.xs}>
        {PHOTO_SEEDS.map((ps) => (
          <Chip
            key={ps}
            label={ps}
            selected={form.photoSeed === ps}
            onPress={() => set('photoSeed', ps)}
            small
          />
        ))}
      </Row>
      <Spacer h={space.md} />

      <ToggleRow
        title={t({ es: 'Publicado', en: 'Published' })}
        subtitle={t({ es: 'Visible en la app de miembros', en: 'Visible in the member app' })}
        value={form.published}
        onValueChange={(v) => set('published', v)}
      />
      <Divider />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Descripción (ES)', en: 'Description (ES)' })}
        value={form.blurbEs}
        onChangeText={(v) => set('blurbEs', v)}
        multiline
        numberOfLines={3}
        style={styles.multiline}
        placeholder={t({ es: 'Descripción en español', en: 'Spanish description' })}
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Descripción (EN)', en: 'Description (EN)' })}
        value={form.blurbEn}
        onChangeText={(v) => set('blurbEn', v)}
        multiline
        numberOfLines={3}
        style={styles.multiline}
        placeholder={t({ es: 'Descripción en inglés', en: 'English description' })}
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Acuerdo de patrocinio (ES)', en: 'Sponsor deal (ES)' })}
        value={form.sponsorDealEs}
        onChangeText={(v) => set('sponsorDealEs', v)}
        placeholder={t({ es: 'Vacío = sin acuerdo', en: 'Empty = no deal' })}
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Acuerdo de patrocinio (EN)', en: 'Sponsor deal (EN)' })}
        value={form.sponsorDealEn}
        onChangeText={(v) => set('sponsorDealEn', v)}
        placeholder={t({ es: 'Vacío = sin acuerdo', en: 'Empty = no deal' })}
      />
      <Spacer h={space.md} />

      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Servicios', en: 'Amenities' })}
      </Txt>
      <Spacer h={space.xs} />
      <Row wrap gap={space.xs}>
        {AMENITIES.map((a) => (
          <Chip
            key={a.key}
            label={amenityLabel(a.key, lang)}
            emoji={amenityEmoji(a.key)}
            selected={form.amenities.includes(a.key)}
            onPress={() => toggleAmenity(a.key)}
            small
          />
        ))}
      </Row>

      <Spacer h={space.xl} />
      <Button
        label={saving ? t({ es: 'Guardando…', en: 'Saving…' }) : t({ es: 'Guardar', en: 'Save' })}
        onPress={handleSave}
        loading={saving}
      />
      <Spacer h={space.sm} />
      <Button
        label={t({ es: 'Cancelar', en: 'Cancel' })}
        variant="secondary"
        onPress={onCancel}
      />
      {onDelete && (
        <>
          <Spacer h={space.md} />
          <Divider />
          <Spacer h={space.md} />
          {Platform.OS === 'web' && confirmDelete ? (
            <Button
              label={t({ es: 'Confirmar eliminación', en: 'Confirm delete' })}
              variant="danger"
              onPress={handleDelete}
              loading={deleting}
            />
          ) : (
            <Button
              label={t({ es: 'Eliminar lugar', en: 'Delete venue' })}
              variant="danger"
              onPress={handleDelete}
              loading={deleting}
            />
          )}
          {Platform.OS === 'web' && confirmDelete && (
            <PressableScale onPress={() => setConfirmDelete(false)} style={{ marginTop: space.sm, alignSelf: 'center' }}>
              <Txt variant="caption" c={color.textTertiary}>
                {t({ es: 'Cancelar eliminación', en: 'Cancel delete' })}
              </Txt>
            </PressableScale>
          )}
        </>
      )}
      <Spacer h={space.huge} />
    </KeyboardAwareScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                         */
/* ------------------------------------------------------------------ */

export default function AdminVenues() {
  const t = useT();
  const { lang } = useLang();
  const { refresh: syncRefresh } = useSync();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'create' | string>('none'); // string = id
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOfflineMsg(null);
    const res = await api.get<Venue[]>('/api/admin/venues');
    if (!mounted.current) return;
    if (res.ok) {
      setVenues(res.data);
    } else if (res.kind === 'offline') {
      setOfflineMsg(res.message);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buildBody = (form: FormData) => {
    const hasSponsor = form.sponsorDealEs.trim() || form.sponsorDealEn.trim();
    return {
      name: form.name.trim(),
      type: form.type,
      area: form.area,
      rating: form.rating.trim() ? parseFloat(form.rating) : null,
      photoSeed: form.photoSeed,
      published: form.published,
      sponsorDeal: hasSponsor
        ? { es: form.sponsorDealEs.trim(), en: form.sponsorDealEn.trim() }
        : null,
      blurb: { es: form.blurbEs.trim(), en: form.blurbEn.trim() },
      amenities: form.amenities,
    };
  };

  const handleCreate = async (form: FormData) => {
    const res = await api.post<Venue>('/api/admin/venues', buildBody(form));
    if (!mounted.current) return;
    if (res.ok) {
      setPanel('none');
      await syncRefresh();
      await load();
    } else {
      setError(res.message);
    }
  };

  const handleEdit = async (id: string, form: FormData) => {
    const res = await api.put<Venue>(`/api/admin/venues/${id}`, buildBody(form));
    if (!mounted.current) return;
    if (res.ok) {
      setPanel('none');
      await syncRefresh();
      await load();
    } else {
      setError(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.del<{ ok: boolean }>(`/api/admin/venues/${id}`);
    if (!mounted.current) return;
    if (res.ok) {
      setPanel('none');
      await syncRefresh();
      await load();
    } else {
      // Surface verbatim — the 409 explains what to do
      setError(res.message);
      setPanel('none');
    }
  };

  /* Panel rendering */
  if (panel === 'create') {
    return (
      <AdminShell active="venues">
        <VenueForm
          initial={blankForm()}
          venues={venues}
          isNew
          onSave={handleCreate}
          onCancel={() => setPanel('none')}
        />
      </AdminShell>
    );
  }

  if (typeof panel === 'string' && panel !== 'none') {
    const venue = venues.find((v) => v.id === panel);
    if (venue) {
      return (
        <AdminShell active="venues">
          <VenueForm
            initial={venueToForm(venue)}
            venues={venues}
            isNew={false}
            onSave={(form) => handleEdit(venue.id, form)}
            onDelete={() => handleDelete(venue.id)}
            onCancel={() => setPanel('none')}
          />
        </AdminShell>
      );
    }
  }

  return (
    <AdminShell active="venues">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Spacer h={space.md} />
        <Row justify="space-between" align="center">
          <SectionHeader
            title={t({ es: 'Lugares', en: 'Venues' })}
            style={{ marginBottom: 0 }}
          />
          <Button
            label={t({ es: 'Nuevo', en: 'New' })}
            onPress={() => setPanel('create')}
            full={false}
            size="md"
            icon={<PlusIcon size={16} c="#fff" />}
          />
        </Row>
        <Spacer h={space.md} />

        {offlineMsg && (
          <OfflineBanner message={offlineMsg} onRetry={load} />
        )}
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={{ marginBottom: space.md }}>
                <Skeleton width="100%" height={80} radius={12} />
              </View>
            ))}
          </>
        ) : venues.length === 0 ? (
          <EmptyState
            emoji="🏛"
            title={t({ es: 'Sin lugares', en: 'No venues' })}
            body={t({
              es: 'Crea el primer lugar para que los encuentros tengan dónde ocurrir.',
              en: 'Create the first venue so meetups have a place to happen.',
            })}
            actionLabel={t({ es: 'Crear lugar', en: 'Create venue' })}
            onAction={() => setPanel('create')}
          />
        ) : (
          <Card padded={false}>
            {venues.map((v, i) => (
              <View key={v.id}>
                {i > 0 && <Divider />}
                <PressableScale
                  onPress={() => setPanel(v.id)}
                  style={styles.venueRow}
                >
                  <View style={{ flex: 1 }}>
                    <Row gap={space.sm} align="center">
                      <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {v.name}
                      </Txt>
                      {!v.published && (
                        <Tag label={t({ es: 'Oculto', en: 'Hidden' })} tone="sand" />
                      )}
                      {v.sponsorDeal && (
                        <Tag label={t({ es: 'Patrocinado', en: 'Sponsored' })} tone="warm" />
                      )}
                    </Row>
                    <Spacer h={2} />
                    <Row gap={space.md}>
                      <Txt variant="caption">
                        {venueTypeEmoji(v.type as never)} {venueTypeLabel(v.type as never, lang)}
                      </Txt>
                      <Txt variant="caption">{v.area}</Txt>
                      {v.rating != null && (
                        <Row gap={2} align="center">
                          <StarIcon size={11} />
                          <Txt variant="caption">{v.rating}</Txt>
                        </Row>
                      )}
                      <Txt variant="caption">
                        {formatNumber(v.meetupCount, lang)} {t({ es: 'enc.', en: 'meet.' })}
                      </Txt>
                    </Row>
                  </View>
                </PressableScale>
              </View>
            ))}
          </Card>
        )}
        <Spacer h={space.huge} />
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.base,
    paddingBottom: space.huge,
  },
  venueRow: {
    paddingHorizontal: space.base,
    paddingVertical: space.md,
  },
  formScroll: {
    paddingHorizontal: space.base,
    paddingTop: space.lg,
  },
  fieldLabel: {
    color: '#3D5771',
  },
  multiline: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});
