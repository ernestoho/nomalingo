/**
 * Admin — official events + membership plans.
 *
 * Two sections via SegmentedControl:
 *   - Official events: list + create/edit with includes list, isCurrent toggle.
 *   - Plans: inline edit for each plan.
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
  Divider,
  EmptyState,
  Field,
  PressableScale,
  ProgressBar,
  Row,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Spacer,
  Tag,
  ToggleRow,
  Txt,
} from '../../components/ui';
import { PlusIcon } from '../../components/icons';
import { api } from '../../lib/api';
import { formatLongDate, formatUsd, useT, useLang } from '../../lib/i18n';
import { useSync } from '../../lib/content-sync';
import { color, space } from '../../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type OfficialEvent = {
  id: string;
  title: { es: string; en: string };
  venueId: string;
  venueName: string;
  area: string;
  whenLabel: { es: string; en: string };
  startsAt: string;
  priceUsd: number;
  capacity: number;
  soldSeed: number;
  includes: { es: string; en: string }[];
  blurb: { es: string; en: string };
  isCurrent: boolean;
  published: boolean;
  sold: number;
  revenue: number;
};

type Plan = {
  id: string;
  label: { es: string; en: string };
  priceUsd: number;
  days: number;
  note: { es: string; en: string } | null;
  active: boolean;
  sortOrder: number;
};

type VenueOption = { id: string; name: string; area: string };

/* ------------------------------------------------------------------ */
/*  Date helpers (same as meetups)                                      */
/* ------------------------------------------------------------------ */

function parseDateInput(s: string): string | null {
  const normalised = s.trim().replace(' ', 'T');
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
/*  Includes list editor                                                */
/* ------------------------------------------------------------------ */

function IncludesEditor({
  items,
  onChange,
}: {
  items: { es: string; en: string }[];
  onChange: (v: { es: string; en: string }[]) => void;
}) {
  const t = useT();
  const add = () => onChange([...items, { es: '', en: '' }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, key: 'es' | 'en', val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  return (
    <View>
      <Row justify="space-between" align="center">
        <Txt variant="label" style={{ color: '#3D5771' }}>
          {t({ es: 'Incluye', en: 'Includes' })}
        </Txt>
        <PressableScale onPress={add} hitSlop={8}>
          <Txt variant="label" c={color.accent}>
            {t({ es: '+ Agregar', en: '+ Add' })}
          </Txt>
        </PressableScale>
      </Row>
      <Spacer h={space.xs} />
      {items.map((item, i) => (
        <View key={i} style={{ marginBottom: space.sm }}>
          <Row gap={space.sm} align="center">
            <View style={{ flex: 1, gap: space.xs }}>
              <Field
                value={item.es}
                onChangeText={(v) => update(i, 'es', v)}
                placeholder="ES"
              />
              <Field
                value={item.en}
                onChangeText={(v) => update(i, 'en', v)}
                placeholder="EN"
              />
            </View>
            <PressableScale onPress={() => remove(i)} hitSlop={8}>
              <Txt variant="label" c={color.highlight}>✕</Txt>
            </PressableScale>
          </Row>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Event form                                                          */
/* ------------------------------------------------------------------ */

type EventFormData = {
  titleEs: string;
  titleEn: string;
  venueId: string;
  whenLabelEs: string;
  whenLabelEn: string;
  startsAt: string;
  priceUsd: string;
  capacity: string;
  soldSeed: string;
  includes: { es: string; en: string }[];
  blurbEs: string;
  blurbEn: string;
  isCurrent: boolean;
  published: boolean;
};

function blankEventForm(): EventFormData {
  return {
    titleEs: '',
    titleEn: '',
    venueId: '',
    whenLabelEs: '',
    whenLabelEn: '',
    startsAt: '',
    priceUsd: '0',
    capacity: '100',
    soldSeed: '0',
    includes: [],
    blurbEs: '',
    blurbEn: '',
    isCurrent: false,
    published: true,
  };
}

function eventToForm(e: OfficialEvent): EventFormData {
  return {
    titleEs: e.title?.es ?? '',
    titleEn: e.title?.en ?? '',
    venueId: e.venueId,
    whenLabelEs: e.whenLabel?.es ?? '',
    whenLabelEn: e.whenLabel?.en ?? '',
    startsAt: isoToInput(e.startsAt),
    priceUsd: String(e.priceUsd),
    capacity: String(e.capacity),
    soldSeed: String(e.soldSeed),
    includes: Array.isArray(e.includes) ? e.includes : [],
    blurbEs: e.blurb?.es ?? '',
    blurbEn: e.blurb?.en ?? '',
    isCurrent: e.isCurrent,
    published: e.published,
  };
}

function EventForm({
  initial,
  venues,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  initial: EventFormData;
  venues: VenueOption[];
  onSave: (form: EventFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  isNew: boolean;
}) {
  const t = useT();
  const [form, setForm] = useState<EventFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [venueSearch, setVenueSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k: keyof EventFormData, v: EventFormData[keyof EventFormData]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filteredVenues = venueSearch.trim()
    ? venues.filter((v) => v.name.toLowerCase().includes(venueSearch.toLowerCase()))
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
      setFormError(t({ es: 'Fecha inválida (YYYY-MM-DD HH:MM).', en: 'Invalid date (YYYY-MM-DD HH:MM).' }));
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
        t({ es: 'Eliminar evento', en: 'Delete event' }),
        t({ es: '¿Confirmas la eliminación?', en: 'Confirm deletion?' }),
        [
          { text: t({ es: 'Cancelar', en: 'Cancel' }), style: 'cancel' },
          {
            text: t({ es: 'Eliminar', en: 'Delete' }),
            style: 'destructive',
            onPress: async () => { setDeleting(true); await onDelete(); setDeleting(false); },
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
          ? t({ es: 'Nuevo evento oficial', en: 'New official event' })
          : t({ es: 'Editar evento', en: 'Edit event' })}
      </Txt>
      <Spacer h={space.lg} />

      {formError && <ErrorBanner message={formError} />}

      <Field
        label={t({ es: 'Título (ES)', en: 'Title (ES)' })}
        value={form.titleEs}
        onChangeText={(v) => set('titleEs', v)}
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Título (EN)', en: 'Title (EN)' })}
        value={form.titleEn}
        onChangeText={(v) => set('titleEn', v)}
      />
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
        {filteredVenues.slice(0, 5).map((v) => (
          <PressableScale
            key={v.id}
            onPress={() => { set('venueId', v.id); setVenueSearch(''); }}
            style={[styles.venueOption, form.venueId === v.id && { backgroundColor: color.accentSoft }]}
          >
            <Txt variant="bodyStrong" numberOfLines={1}>{v.name}</Txt>
            <Txt variant="caption">{v.area}</Txt>
          </PressableScale>
        ))}
      </View>
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Etiqueta de fecha (ES)', en: 'When label (ES)' })}
        value={form.whenLabelEs}
        onChangeText={(v) => set('whenLabelEs', v)}
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Etiqueta de fecha (EN)', en: 'When label (EN)' })}
        value={form.whenLabelEn}
        onChangeText={(v) => set('whenLabelEn', v)}
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Inicio (YYYY-MM-DD HH:MM)', en: 'Starts at (YYYY-MM-DD HH:MM)' })}
        value={form.startsAt}
        onChangeText={(v) => set('startsAt', v)}
        placeholder="2026-09-20 19:00"
        keyboardType="numbers-and-punctuation"
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Precio (USD)', en: 'Price (USD)' })}
        value={form.priceUsd}
        onChangeText={(v) => set('priceUsd', v)}
        keyboardType="decimal-pad"
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Capacidad', en: 'Capacity' })}
        value={form.capacity}
        onChangeText={(v) => set('capacity', v)}
        keyboardType="number-pad"
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Boletos simulados (soldSeed)', en: 'Seed tickets sold' })}
        value={form.soldSeed}
        onChangeText={(v) => set('soldSeed', v)}
        keyboardType="number-pad"
      />
      <Spacer h={space.md} />

      <IncludesEditor
        items={form.includes}
        onChange={(v) => set('includes', v)}
      />
      <Spacer h={space.md} />

      <Field
        label={t({ es: 'Descripción (ES)', en: 'Description (ES)' })}
        value={form.blurbEs}
        onChangeText={(v) => set('blurbEs', v)}
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />
      <Spacer h={space.md} />
      <Field
        label={t({ es: 'Descripción (EN)', en: 'Description (EN)' })}
        value={form.blurbEn}
        onChangeText={(v) => set('blurbEn', v)}
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />
      <Spacer h={space.md} />

      <ToggleRow
        title={t({ es: 'Evento actual', en: 'Current event' })}
        subtitle={t({
          es: 'Marcar este evento como "actual" desactiva los demás.',
          en: 'Setting this as current will unset all others.',
        })}
        value={form.isCurrent}
        onValueChange={(v) => set('isCurrent', v)}
      />
      <Divider />
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
              label={t({ es: 'Eliminar evento', en: 'Delete event' })}
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
/*  Plan inline editor                                                  */
/* ------------------------------------------------------------------ */

function PlanEditor({
  plan,
  onSave,
}: {
  plan: Plan;
  onSave: (updated: Partial<Plan> & { id: string }) => Promise<void>;
}) {
  const t = useT();
  const [labelEs, setLabelEs] = useState(plan.label?.es ?? '');
  const [labelEn, setLabelEn] = useState(plan.label?.en ?? '');
  const [priceUsd, setPriceUsd] = useState(String(plan.priceUsd));
  const [days, setDays] = useState(String(plan.days));
  const [noteEs, setNoteEs] = useState(plan.note?.es ?? '');
  const [noteEn, setNoteEn] = useState(plan.note?.en ?? '');
  const [active, setActive] = useState(plan.active);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const hasNote = noteEs.trim() || noteEn.trim();
    await onSave({
      id: plan.id,
      label: { es: labelEs.trim(), en: labelEn.trim() },
      priceUsd: parseFloat(priceUsd) || 0,
      days: parseInt(days, 10) || plan.days,
      note: hasNote ? { es: noteEs.trim(), en: noteEn.trim() } : null,
      active,
    });
    setSaving(false);
    setOpen(false);
  };

  return (
    <Card style={{ marginBottom: space.md }}>
      <PressableScale onPress={() => setOpen((o) => !o)}>
        <Row justify="space-between" align="center">
          <View>
            <Txt variant="bodyStrong">{labelEs || plan.id}</Txt>
            <Txt variant="caption">
              {formatUsd(plan.priceUsd)} · {plan.days} {t({ es: 'días', en: 'days' })}
            </Txt>
          </View>
          <Row gap={space.sm} align="center">
            {!plan.active && <Tag label={t({ es: 'Inactivo', en: 'Inactive' })} tone="sand" />}
            <Txt variant="caption" c={color.accent}>{open ? '▲' : '▼'}</Txt>
          </Row>
        </Row>
      </PressableScale>

      {open && (
        <>
          <Spacer h={space.md} />
          <Divider />
          <Spacer h={space.md} />
          <Field
            label={t({ es: 'Etiqueta (ES)', en: 'Label (ES)' })}
            value={labelEs}
            onChangeText={setLabelEs}
          />
          <Spacer h={space.md} />
          <Field
            label={t({ es: 'Etiqueta (EN)', en: 'Label (EN)' })}
            value={labelEn}
            onChangeText={setLabelEn}
          />
          <Spacer h={space.md} />
          <Field
            label={t({ es: 'Precio (USD)', en: 'Price (USD)' })}
            value={priceUsd}
            onChangeText={setPriceUsd}
            keyboardType="decimal-pad"
          />
          <Spacer h={space.md} />
          <Field
            label={t({ es: 'Duración (días)', en: 'Duration (days)' })}
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
          />
          <Spacer h={space.md} />
          <Field
            label={t({ es: 'Nota (ES)', en: 'Note (ES)' })}
            value={noteEs}
            onChangeText={setNoteEs}
            placeholder={t({ es: 'Opcional', en: 'Optional' })}
          />
          <Spacer h={space.md} />
          <Field
            label={t({ es: 'Nota (EN)', en: 'Note (EN)' })}
            value={noteEn}
            onChangeText={setNoteEn}
            placeholder={t({ es: 'Opcional', en: 'Optional' })}
          />
          <ToggleRow
            title={t({ es: 'Activo', en: 'Active' })}
            value={active}
            onValueChange={setActive}
          />
          <Spacer h={space.sm} />
          <Button
            label={t({ es: 'Guardar plan', en: 'Save plan' })}
            onPress={handleSave}
            loading={saving}
          />
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                         */
/* ------------------------------------------------------------------ */

type Section = 'events' | 'plans';

export default function AdminEvents() {
  const t = useT();
  const { lang } = useLang();
  const { refresh: syncRefresh } = useSync();

  const [section, setSection] = useState<Section>('events');
  const [events, setEvents] = useState<OfficialEvent[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
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
    const [evRes, plRes, vRes] = await Promise.all([
      api.get<OfficialEvent[]>('/api/admin/official'),
      api.get<Plan[]>('/api/admin/plans'),
      api.get<VenueOption[]>('/api/admin/venues'),
    ]);
    if (!mounted.current) return;
    if (evRes.ok) setEvents(evRes.data);
    else if (evRes.kind === 'offline') setOfflineMsg(evRes.message);
    else setError(evRes.message);
    if (plRes.ok) setPlans(plRes.data);
    if (vRes.ok) setVenues(vRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildEventBody = (form: EventFormData) => ({
    title: { es: form.titleEs.trim(), en: form.titleEn.trim() },
    venueId: form.venueId,
    whenLabel: { es: form.whenLabelEs.trim(), en: form.whenLabelEn.trim() },
    startsAt: parseDateInput(form.startsAt) ?? '',
    priceUsd: parseFloat(form.priceUsd) || 0,
    capacity: parseInt(form.capacity, 10) || 100,
    soldSeed: parseInt(form.soldSeed, 10) || 0,
    includes: form.includes,
    blurb: { es: form.blurbEs.trim(), en: form.blurbEn.trim() },
    isCurrent: form.isCurrent,
    published: form.published,
  });

  const handleCreateEvent = async (form: EventFormData) => {
    const res = await api.post<OfficialEvent>('/api/admin/official', buildEventBody(form));
    if (!mounted.current) return;
    if (res.ok) { setPanel('none'); await syncRefresh(); await load(); }
    else setError(res.message);
  };

  const handleEditEvent = async (id: string, form: EventFormData) => {
    const res = await api.put<OfficialEvent>(`/api/admin/official/${id}`, buildEventBody(form));
    if (!mounted.current) return;
    if (res.ok) { setPanel('none'); await syncRefresh(); await load(); }
    else setError(res.message);
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await api.del<{ ok: boolean }>(`/api/admin/official/${id}`);
    if (!mounted.current) return;
    if (res.ok) { setPanel('none'); await syncRefresh(); await load(); }
    else { setError(res.message); setPanel('none'); }
  };

  const handleSavePlan = async (body: Partial<Plan> & { id: string }) => {
    const res = await api.put<Plan>('/api/admin/plans', body);
    if (!mounted.current) return;
    if (res.ok) { await syncRefresh(); await load(); }
    else setError(res.message);
  };

  /* Panel routing */
  if (panel === 'create') {
    return (
      <AdminShell active="events">
        <EventForm
          initial={blankEventForm()}
          venues={venues}
          isNew
          onSave={handleCreateEvent}
          onCancel={() => setPanel('none')}
        />
      </AdminShell>
    );
  }

  if (typeof panel === 'string' && panel !== 'none') {
    const ev = events.find((e) => e.id === panel);
    if (ev) {
      return (
        <AdminShell active="events">
          <EventForm
            initial={eventToForm(ev)}
            venues={venues}
            isNew={false}
            onSave={(form) => handleEditEvent(ev.id, form)}
            onDelete={() => handleDeleteEvent(ev.id)}
            onCancel={() => setPanel('none')}
          />
        </AdminShell>
      );
    }
  }

  return (
    <AdminShell active="events">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Spacer h={space.md} />

        <SegmentedControl
          options={[
            { key: 'events', label: t({ es: 'Eventos', en: 'Events' }) },
            { key: 'plans', label: t({ es: 'Planes', en: 'Plans' }) },
          ]}
          value={section}
          onChange={setSection}
        />
        <Spacer h={space.lg} />

        {offlineMsg && <OfflineBanner message={offlineMsg} onRetry={load} />}
        {error && <ErrorBanner message={error} />}

        {/* ─── Events section ──────────────────────────────────────── */}
        {section === 'events' && (
          <>
            <Row justify="space-between" align="center">
              <SectionHeader
                title={t({ es: 'Eventos oficiales', en: 'Official events' })}
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

            {loading ? (
              [...Array(3)].map((_, i) => (
                <View key={i} style={{ marginBottom: space.md }}>
                  <Skeleton width="100%" height={100} radius={12} />
                </View>
              ))
            ) : events.length === 0 ? (
              <EmptyState
                emoji="🎉"
                title={t({ es: 'Sin eventos', en: 'No events' })}
                body={t({
                  es: 'Crea el primer evento oficial de NómadaLingo.',
                  en: 'Create the first official NómadaLingo event.',
                })}
                actionLabel={t({ es: 'Crear evento', en: 'Create event' })}
                onAction={() => setPanel('create')}
              />
            ) : (
              events.map((ev) => (
                <PressableScale
                  key={ev.id}
                  onPress={() => setPanel(ev.id)}
                  style={{ marginBottom: space.md }}
                >
                  <Card>
                    <Row gap={space.sm} align="center">
                      <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {lang === 'es' ? ev.title?.es : ev.title?.en}
                      </Txt>
                      {ev.isCurrent && (
                        <Tag label={t({ es: 'Actual', en: 'Current' })} tone="accent" />
                      )}
                      {!ev.published && (
                        <Tag label={t({ es: 'Oculto', en: 'Hidden' })} tone="sand" />
                      )}
                    </Row>
                    <Spacer h={space.sm} />
                    <Txt variant="caption">
                      {ev.venueName} · {formatLongDate(ev.startsAt, lang)} · {formatUsd(ev.priceUsd)}
                    </Txt>
                    <Spacer h={space.sm} />
                    <ProgressBar
                      value={ev.capacity > 0 ? ev.sold / ev.capacity : 0}
                      height={6}
                    />
                    <Spacer h={space.xs} />
                    <Row justify="space-between">
                      <Txt variant="caption">
                        {ev.sold}/{ev.capacity} {t({ es: 'vendidos', en: 'sold' })}
                      </Txt>
                      <Txt variant="label" c={color.accent}>
                        {formatUsd(ev.revenue)}
                      </Txt>
                    </Row>
                  </Card>
                </PressableScale>
              ))
            )}
          </>
        )}

        {/* ─── Plans section ───────────────────────────────────────── */}
        {section === 'plans' && (
          <>
            <SectionHeader title={t({ es: 'Planes de membresía', en: 'Membership plans' })} />
            {loading ? (
              [...Array(3)].map((_, i) => (
                <View key={i} style={{ marginBottom: space.md }}>
                  <Skeleton width="100%" height={70} radius={12} />
                </View>
              ))
            ) : plans.length === 0 ? (
              <EmptyState
                emoji="💳"
                title={t({ es: 'Sin planes', en: 'No plans' })}
                body={t({
                  es: 'Los planes de membresía aparecerán aquí.',
                  en: 'Membership plans will appear here.',
                })}
              />
            ) : (
              plans.map((p) => (
                <PlanEditor key={p.id} plan={p} onSave={handleSavePlan} />
              ))
            )}
          </>
        )}

        <Spacer h={space.huge} />
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.base, paddingBottom: space.huge },
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
