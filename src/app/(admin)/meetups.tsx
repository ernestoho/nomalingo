/**
 * Admin — meetup list + create/edit form.
 *
 * - Lists all meetups with venue name, when, going/capacity, published state.
 * - Create/edit form in inline panel with venue picker, date validation, etc.
 * - Delete with confirmation (Alert on native, two-tap on web).
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
import { PlusIcon } from '../../components/icons';
import { api } from '../../lib/api';
import { formatLongDate, useT, useLang } from '../../lib/i18n';
import { useSync } from '../../lib/content-sync';
import {
  LANGUAGES,
  MEETUP_CATEGORIES,
  categoryEmoji,
  categoryLabel,
  langFlag,
  langLabel,
} from '../../data/reference';
import { color, space } from '../../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Meetup = {
  id: string;
  category: string;
  title: { es: string; en: string };
  venueId: string;
  venueName: string;
  area: string;
  whenLabel: { es: string; en: string };
  startsAt: string;
  capacity: number;
  going: number;
  languages: string[];
  description: { es: string; en: string };
  published: boolean;
};

type VenueOption = {
  id: string;
  name: string;
  area: string;
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                        */
/* ------------------------------------------------------------------ */

/** Parse "YYYY-MM-DD HH:MM" → ISO string, or return null if invalid. */
function parseDateInput(s: string): string | null {
  // Support both "YYYY-MM-DD HH:MM" and "YYYY-MM-DDTHH:MM"
  const normalised = s.trim().replace(' ', 'T');
  // Append seconds if absent
  const withSeconds = /T\d{2}:\d{2}$/.test(normalised) ? `${normalised}:00` : normalised;
  const d = new Date(withSeconds);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isoToInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/*  Form                                                                */
/* ------------------------------------------------------------------ */

type FormData = {
  titleEs: string;
  titleEn: string;
  category: string;
  venueId: string;
  whenLabelEs: string;
  whenLabelEn: string;
  startsAt: string; // "YYYY-MM-DD HH:MM"
  capacity: string;
  languages: string[];
  descriptionEs: string;
  descriptionEn: string;
  published: boolean;
};

function blankForm(): FormData {
  return {
    titleEs: '',
    titleEn: '',
    category: 'Café',
    venueId: '',
    whenLabelEs: '',
    whenLabelEn: '',
    startsAt: '',
    capacity: '20',
    languages: ['ES', 'EN'],
    descriptionEs: '',
    descriptionEn: '',
    published: true,
  };
}

function meetupToForm(m: Meetup): FormData {
  return {
    titleEs: m.title?.es ?? '',
    titleEn: m.title?.en ?? '',
    category: m.category,
    venueId: m.venueId,
    whenLabelEs: m.whenLabel?.es ?? '',
    whenLabelEn: m.whenLabel?.en ?? '',
    startsAt: isoToInput(m.startsAt),
    capacity: String(m.capacity),
    languages: Array.isArray(m.languages) ? m.languages : [],
    descriptionEs: m.description?.es ?? '',
    descriptionEn: m.description?.en ?? '',
    published: m.published,
  };
}

function MeetupForm({
  initial,
  venues,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  initial: FormData;
  venues: VenueOption[];
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
  const [venueSearch, setVenueSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k: keyof FormData, v: FormData[keyof FormData]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleLang = (code: string) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(code)
        ? f.languages.filter((l) => l !== code)
        : [...f.languages, code],
    }));
  };

  const filteredVenues = venueSearch.trim()
    ? venues.filter(
        (v) =>
          v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
          v.area.toLowerCase().includes(venueSearch.toLowerCase()),
      )
    : venues;

  const handleSave = async () => {
    setFormError(null);
    if (!form.titleEs.trim() && !form.titleEn.trim()) {
      setFormError(t({ es: 'El título es obligatorio.', en: 'Title is required.' }));
      return;
    }
    if (!form.venueId) {
      setFormError(t({ es: 'Selecciona un lugar.', en: 'Select a venue.' }));
      return;
    }
    if (!parseDateInput(form.startsAt)) {
      setFormError(t({
        es: 'La fecha debe tener el formato YYYY-MM-DD HH:MM.',
        en: 'Date must be in YYYY-MM-DD HH:MM format.',
      }));
      return;
    }
    const cap = parseInt(form.capacity, 10);
    if (!Number.isFinite(cap) || cap < 2 || cap > 500) {
      setFormError(t({ es: 'La capacidad debe estar entre 2 y 500.', en: 'Capacity must be between 2 and 500.' }));
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
        t({ es: 'Eliminar encuentro', en: 'Delete meetup' }),
        t({ es: '¿Confirmas la eliminación?', en: 'Confirm deletion?' }),
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
      if (!confirmDelete) { setConfirmDelete(true); return; }
      setDeleting(true);
      await onDelete();
      setDeleting(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === form.venueId);

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.formScroll}>
      <Txt variant="h3">
        {isNew
          ? t({ es: 'Nuevo encuentro', en: 'New meetup' })
          : t({ es: 'Editar encuentro', en: 'Edit meetup' })}
      </Txt>
      <Spacer h={space.lg} />

      {formError && <ErrorBanner message={formError} />}

      <Field
        label={t({ es: 'Título (ES)', en: 'Title (ES)' })}
        value={form.titleEs}
        onChangeText={(v) => set('titleEs', v)}
        placeholder="Café de idiomas del martes"
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Título (EN)', en: 'Title (EN)' })}
        value={form.titleEn}
        onChangeText={(v) => set('titleEn', v)}
        placeholder="Tuesday language café"
      />
      <Spacer h={space.md} />

      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Categoría', en: 'Category' })}
      </Txt>
      <Spacer h={space.xs} />
      <Row wrap gap={space.xs}>
        {MEETUP_CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            label={categoryLabel(c.key, lang)}
            emoji={categoryEmoji(c.key)}
            selected={form.category === c.key}
            onPress={() => set('category', c.key)}
            small
          />
        ))}
      </Row>
      <Spacer h={space.md} />

      {/* Venue picker */}
      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Lugar', en: 'Venue' })}
      </Txt>
      {selectedVenue && (
        <Txt variant="caption" c={color.accent} style={{ marginTop: 2, marginBottom: space.xs }}>
          {selectedVenue.name} — {selectedVenue.area}
        </Txt>
      )}
      <Field
        value={venueSearch}
        onChangeText={setVenueSearch}
        placeholder={t({ es: 'Buscar lugar…', en: 'Search venue…' })}
      />
      <View style={styles.venueList}>
        {filteredVenues.slice(0, 6).map((v) => (
          <PressableScale
            key={v.id}
            onPress={() => { set('venueId', v.id); setVenueSearch(''); }}
            style={[styles.venueOption, form.venueId === v.id && { backgroundColor: color.accentSoft }]}
          >
            <Txt variant="bodyStrong" numberOfLines={1}>{v.name}</Txt>
            <Txt variant="caption">{v.area}</Txt>
          </PressableScale>
        ))}
        {filteredVenues.length === 0 && (
          <Txt variant="caption" c={color.textTertiary} style={{ padding: space.md }}>
            {t({ es: 'Sin resultados', en: 'No results' })}
          </Txt>
        )}
      </View>
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Etiqueta de fecha (ES)', en: 'When label (ES)' })}
        value={form.whenLabelEs}
        onChangeText={(v) => set('whenLabelEs', v)}
        placeholder="Martes a las 6 p.m."
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Etiqueta de fecha (EN)', en: 'When label (EN)' })}
        value={form.whenLabelEn}
        onChangeText={(v) => set('whenLabelEn', v)}
        placeholder="Tuesday at 6 PM"
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Inicio (YYYY-MM-DD HH:MM)', en: 'Starts at (YYYY-MM-DD HH:MM)' })}
        value={form.startsAt}
        onChangeText={(v) => set('startsAt', v)}
        placeholder="2026-08-15 18:00"
        keyboardType="numbers-and-punctuation"
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Capacidad (2–500)', en: 'Capacity (2–500)' })}
        value={form.capacity}
        onChangeText={(v) => set('capacity', v)}
        keyboardType="number-pad"
      />
      <Spacer h={space.md} />

      <Txt variant="label" style={styles.fieldLabel}>
        {t({ es: 'Idiomas', en: 'Languages' })}
      </Txt>
      <Spacer h={space.xs} />
      <Row wrap gap={space.xs}>
        {LANGUAGES.map((l) => (
          <Chip
            key={l.code}
            label={langLabel(l.code, lang)}
            emoji={langFlag(l.code)}
            selected={form.languages.includes(l.code)}
            onPress={() => toggleLang(l.code)}
            small
          />
        ))}
      </Row>
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Descripción (ES)', en: 'Description (ES)' })}
        value={form.descriptionEs}
        onChangeText={(v) => set('descriptionEs', v)}
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Descripción (EN)', en: 'Description (EN)' })}
        value={form.descriptionEn}
        onChangeText={(v) => set('descriptionEn', v)}
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />
      <Spacer h={space.md} />

      <ToggleRow
        title={t({ es: 'Publicado', en: 'Published' })}
        subtitle={t({ es: 'Visible en la app de miembros', en: 'Visible in the member app' })}
        value={form.published}
        onValueChange={(v) => set('published', v)}
      />

      <Spacer h={space.xl} />
      <Button
        label={t({ es: 'Guardar', en: 'Save' })}
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
              label={t({ es: 'Eliminar encuentro', en: 'Delete meetup' })}
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

export default function AdminMeetups() {
  const t = useT();
  const { lang } = useLang();
  const { refresh: syncRefresh } = useSync();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'create' | string>('none');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOfflineMsg(null);
    const [mRes, vRes] = await Promise.all([
      api.get<Meetup[]>('/api/admin/meetups'),
      api.get<VenueOption[]>('/api/admin/venues'),
    ]);
    if (!mounted.current) return;
    if (mRes.ok) setMeetups(mRes.data);
    else if (mRes.kind === 'offline') setOfflineMsg(mRes.message);
    else setError(mRes.message);
    if (vRes.ok) setVenues(vRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildBody = (form: FormData) => ({
    title: { es: form.titleEs.trim(), en: form.titleEn.trim() },
    category: form.category,
    venueId: form.venueId,
    whenLabel: { es: form.whenLabelEs.trim(), en: form.whenLabelEn.trim() },
    startsAt: parseDateInput(form.startsAt) ?? '',
    capacity: parseInt(form.capacity, 10),
    languages: form.languages,
    description: { es: form.descriptionEs.trim(), en: form.descriptionEn.trim() },
    published: form.published,
  });

  const handleCreate = async (form: FormData) => {
    const res = await api.post<Meetup>('/api/admin/meetups', buildBody(form));
    if (!mounted.current) return;
    if (res.ok) { setPanel('none'); await syncRefresh(); await load(); }
    else setError(res.message);
  };

  const handleEdit = async (id: string, form: FormData) => {
    const res = await api.put<Meetup>(`/api/admin/meetups/${id}`, buildBody(form));
    if (!mounted.current) return;
    if (res.ok) { setPanel('none'); await syncRefresh(); await load(); }
    else setError(res.message);
  };

  const handleDelete = async (id: string) => {
    const res = await api.del<{ ok: boolean }>(`/api/admin/meetups/${id}`);
    if (!mounted.current) return;
    if (res.ok) { setPanel('none'); await syncRefresh(); await load(); }
    else { setError(res.message); setPanel('none'); }
  };

  if (panel === 'create') {
    return (
      <AdminShell active="meetups">
        <MeetupForm
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
    const meetup = meetups.find((m) => m.id === panel);
    if (meetup) {
      return (
        <AdminShell active="meetups">
          <MeetupForm
            initial={meetupToForm(meetup)}
            venues={venues}
            isNew={false}
            onSave={(form) => handleEdit(meetup.id, form)}
            onDelete={() => handleDelete(meetup.id)}
            onCancel={() => setPanel('none')}
          />
        </AdminShell>
      );
    }
  }

  return (
    <AdminShell active="meetups">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Spacer h={space.md} />
        <Row justify="space-between" align="center">
          <SectionHeader
            title={t({ es: 'Encuentros', en: 'Meetups' })}
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

        {offlineMsg && <OfflineBanner message={offlineMsg} onRetry={load} />}
        {error && <ErrorBanner message={error} />}

        {loading ? (
          [...Array(4)].map((_, i) => (
            <View key={i} style={{ marginBottom: space.md }}>
              <Skeleton width="100%" height={80} radius={12} />
            </View>
          ))
        ) : meetups.length === 0 ? (
          <EmptyState
            emoji="🗓"
            title={t({ es: 'Sin encuentros', en: 'No meetups' })}
            body={t({
              es: 'Crea el primer encuentro y empieza a conectar personas.',
              en: 'Create the first meetup and start connecting people.',
            })}
            actionLabel={t({ es: 'Crear encuentro', en: 'Create meetup' })}
            onAction={() => setPanel('create')}
          />
        ) : (
          <Card padded={false}>
            {meetups.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <Divider />}
                <PressableScale onPress={() => setPanel(m.id)} style={styles.meetupRow}>
                  <View style={{ flex: 1 }}>
                    <Row gap={space.sm} align="center">
                      <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {lang === 'es' ? m.title?.es : m.title?.en}
                      </Txt>
                      {!m.published && (
                        <Tag label={t({ es: 'Oculto', en: 'Hidden' })} tone="sand" />
                      )}
                    </Row>
                    <Spacer h={2} />
                    <Row gap={space.md}>
                      <Txt variant="caption">{m.venueName}</Txt>
                      <Txt variant="caption">{formatLongDate(m.startsAt, lang)}</Txt>
                      <Txt variant="caption" c={color.accent}>
                        {m.going}/{m.capacity}
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
  scroll: { paddingHorizontal: space.base, paddingBottom: space.huge },
  meetupRow: { paddingHorizontal: space.base, paddingVertical: space.md },
  formScroll: { paddingHorizontal: space.base, paddingTop: space.lg },
  fieldLabel: { color: '#3D5771' },
  multiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  venueList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    borderRadius: 12,
    marginTop: space.xs,
    overflow: 'hidden',
  },
  venueOption: {
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
});
