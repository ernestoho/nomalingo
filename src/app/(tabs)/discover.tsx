/**
 * Discover / Descubrir
 *
 * Layout:
 *   a) Search field
 *   b) Stacking filters (all combine):
 *      - Toggle chips: Teaches ES, Teaches EN, Locals, Online
 *      - Area select row (horizontal chips)
 *      - Level select row (horizontal chips)
 *      - Active-filter count + Clear action
 *   c) Results: compact PartnerCard rows from rankPartners, filtered.
 *   d) EmptyState when nobody matches.
 */

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  Chip,
  Disclosure,
  EmptyState,
  Field,
  PressableScale,
  Row,
  Screen,
  Spacer,
  Txt,
} from '../../components/ui';
import { SearchIcon } from '../../components/icons';
import PartnerCard from '../../components/PartnerCard';

import { color, space } from '../../theme/tokens';
import { useLang, useT } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { rankPartners } from '../../lib/match';

import { PARTNERS } from '../../data/partners';
import { AREA_NAMES, LEVELS, langLabel } from '../../data/reference';
import type { AreaName, Level } from '../../data/types';

/* ─── filter state ──────────────────────────────────────────────────────────── */

type FilterState = {
  query: string;
  teachesES: boolean;
  teachesEN: boolean;
  localsOnly: boolean;
  onlineOnly: boolean;
  area: AreaName | 'all';
  level: Level | 'any';
};

const DEFAULT_FILTERS: FilterState = {
  query: '',
  teachesES: false,
  teachesEN: false,
  localsOnly: false,
  onlineOnly: false,
  area: 'all',
  level: 'any',
};

function isFiltered(f: FilterState): boolean {
  return (
    f.query.trim() !== '' ||
    f.teachesES ||
    f.teachesEN ||
    f.localsOnly ||
    f.onlineOnly ||
    f.area !== 'all' ||
    f.level !== 'any'
  );
}

function activeCount(f: FilterState): number {
  let n = 0;
  if (f.query.trim()) n++;
  if (f.teachesES) n++;
  if (f.teachesEN) n++;
  if (f.localsOnly) n++;
  if (f.onlineOnly) n++;
  if (f.area !== 'all') n++;
  if (f.level !== 'any') n++;
  return n;
}

/* ─── main screen ───────────────────────────────────────────────────────────── */

export default function DiscoverScreen() {
  const t = useT();
  const { lang } = useLang();
  const { ready, profile } = useStore();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearAll() {
    setFilters(DEFAULT_FILTERS);
  }

  /* ── ranked + filtered ── */
  const ranked = useMemo(
    () => (ready ? rankPartners(PARTNERS, profile, lang) : []),
    [ready, profile, lang],
  );

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return ranked.filter(({ partner, reasons }) => {
      // Search: name, role text, area, language
      if (q) {
        const roleText = (lang === 'es' ? partner.role.es : partner.role.en).toLowerCase();
        const teachCodes = partner.teaches.map((ls) =>
          langLabel(ls.code, lang).toLowerCase(),
        );
        const learnCodes = partner.learning.map((ls) =>
          langLabel(ls.code, lang).toLowerCase(),
        );
        const haystack = [
          partner.name.toLowerCase(),
          roleText,
          partner.area.toLowerCase(),
          ...teachCodes,
          ...learnCodes,
        ].join(' ');
        if (!haystack.includes(q)) return false;
      }

      // Toggle chips
      if (filters.teachesES && !partner.teaches.some((ls) => ls.code === 'ES')) return false;
      if (filters.teachesEN && !partner.teaches.some((ls) => ls.code === 'EN')) return false;
      if (filters.localsOnly && partner.kind !== 'local') return false;
      if (filters.onlineOnly && !partner.online) return false;

      // Area
      if (filters.area !== 'all' && partner.area !== filters.area) return false;

      // Level — check if they teach at that level or are learning at that level
      if (filters.level !== 'any') {
        const lvlMatch =
          partner.teaches.some((ls) => ls.level === filters.level) ||
          partner.learning.some((ls) => ls.level === filters.level);
        if (!lvlMatch) return false;
      }

      return true;
    });
  }, [ranked, filters, lang]);

  const filterActive = isFiltered(filters);
  const count = activeCount(filters);

  /* ── area chips ── */
  const areaOptions: { key: AreaName | 'all'; label: string }[] = [
    { key: 'all', label: t({ es: 'Todas', en: 'All' }) },
    ...AREA_NAMES.map((a) => ({ key: a as AreaName, label: a })),
  ];

  /* ── level chips ── */
  const levelOptions: { key: Level | 'any'; label: string }[] = [
    { key: 'any', label: t({ es: 'Cualquiera', en: 'Any' }) },
    ...LEVELS.map((l) => ({ key: l, label: l })),
  ];

  /* ── header component for FlatList ── */
  const ListHeader = (
    <View>
      {/* Search */}
      <View style={{ paddingHorizontal: space.base, paddingTop: space.lg, paddingBottom: space.md }}>
        <Txt variant="h2" style={{ marginBottom: space.base }}>
          {t({ es: 'Descubrir', en: 'Discover' })}
        </Txt>
        <View style={{ position: 'relative' }}>
          <Field
            value={filters.query}
            onChangeText={(v) => set('query', v)}
            placeholder={t({ es: 'Buscar por nombre, zona o idioma…', en: 'Search by name, area or language…' })}
            returnKeyType="search"
            autoCorrect={false}
            style={{ paddingLeft: 44 }}
          />
          <View
            style={{
              position: 'absolute',
              left: space.base,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            <SearchIcon size={18} c={color.textTertiary} />
          </View>
        </View>
      </View>

      {/* Toggle chips */}
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.base, gap: space.sm, paddingBottom: space.sm }}
      >
        <Chip
          label={t({ es: 'Enseña ES', en: 'Teaches Spanish' })}
          selected={filters.teachesES}
          onPress={() => set('teachesES', !filters.teachesES)}
          emoji="🇩🇴"
        />
        <Chip
          label={t({ es: 'Enseña EN', en: 'Teaches English' })}
          selected={filters.teachesEN}
          onPress={() => set('teachesEN', !filters.teachesEN)}
          emoji="🇺🇸"
        />
        <Chip
          label={t({ es: 'Locales', en: 'Locals' })}
          selected={filters.localsOnly}
          onPress={() => set('localsOnly', !filters.localsOnly)}
        />
        <Chip
          label={t({ es: 'En línea', en: 'Online' })}
          selected={filters.onlineOnly}
          onPress={() => set('onlineOnly', !filters.onlineOnly)}
        />
      </ScrollView>

      {/* Area chips */}
      <View style={{ paddingHorizontal: space.base, marginBottom: 6 }}>
        <Txt variant="micro" c={color.textTertiary} style={{ marginBottom: space.sm }}>
          {t({ es: 'ZONA', en: 'AREA' })}
        </Txt>
      </View>
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.base, gap: space.sm, paddingBottom: space.sm }}
      >
        {areaOptions.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            selected={filters.area === opt.key}
            onPress={() => set('area', opt.key)}
            small
          />
        ))}
      </ScrollView>

      {/* Level chips */}
      <View style={{ paddingHorizontal: space.base, marginBottom: 6, marginTop: space.sm }}>
        <Txt variant="micro" c={color.textTertiary} style={{ marginBottom: space.sm }}>
          {t({ es: 'NIVEL', en: 'LEVEL' })}
        </Txt>
      </View>
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.base, gap: space.sm, paddingBottom: space.sm }}
      >
        {levelOptions.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            selected={filters.level === opt.key}
            onPress={() => set('level', opt.key)}
            small
          />
        ))}
      </ScrollView>

      {/* Active filter count + Clear */}
      {filterActive ? (
        <Row
          justify="space-between"
          align="center"
          style={{
            paddingHorizontal: space.base,
            paddingVertical: space.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: color.border,
            marginTop: space.sm,
          }}
        >
          <Txt variant="caption" c={color.textTertiary}>
            {count === 1
              ? t({ es: '1 filtro activo', en: '1 filter active' })
              : t({ es: `${count} filtros activos`, en: `${count} filters active` })}
            {results.length > 0
              ? t({
                  es: ` · ${results.length} resultado${results.length === 1 ? '' : 's'}`,
                  en: ` · ${results.length} result${results.length === 1 ? '' : 's'}`,
                })
              : ''}
          </Txt>
          <PressableScale onPress={clearAll} hitSlop={8}>
            <Txt variant="label" c={color.accent}>
              {t({ es: 'Limpiar', en: 'Clear' })}
            </Txt>
          </PressableScale>
        </Row>
      ) : (
        <View style={{ height: space.base }} />
      )}

      {/* Illustrative personas note */}
      <View style={{ paddingHorizontal: space.base, marginBottom: space.sm }}>
        <Disclosure
          text={t({
            es: 'Los perfiles son personas ilustrativas, no personas reales. Muestran qué produce el sistema de coincidencias con datos representativos.',
            en: 'Profiles are illustrative personas, not real people. They show what the matching system produces with representative data.',
          })}
        />
      </View>
      <Spacer h={space.sm} />
    </View>
  );

  return (
    <Screen edges={['top']}>
      {results.length === 0 && filterActive ? (
        /* Empty state */
        <>
          {ListHeader}
          <EmptyState
            emoji="🔍"
            title={t({ es: 'Nadie coincide con eso', en: 'Nobody matches that' })}
            body={t({
              es: 'Prueba quitando un filtro — empezá por la zona o el nivel.',
              en: 'Try removing a filter — start with the area or level.',
            })}
            actionLabel={t({ es: 'Limpiar filtros', en: 'Clear filters' })}
            onAction={clearAll}
          />
        </>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.partner.id)}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{
            paddingHorizontal: space.base,
            paddingBottom: space.huge + space.xl,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PartnerCard
              result={item}
              compact
              onPress={() => router.push(`/chat/${item.partner.id}`)}
            />
          )}
          ListEmptyComponent={
            !filterActive ? (
              <EmptyState
                emoji="👋"
                title={t({ es: 'Aquí aparecen tu coro', en: 'Your matches appear here' })}
                body={t({
                  es: 'Completa tu perfil para ver a quiénes te conectamos.',
                  en: 'Complete your profile to see who we match you with.',
                })}
                actionLabel={t({ es: 'Editar perfil', en: 'Edit profile' })}
                onAction={() => router.push('/edit-profile')}
              />
            ) : null
          }
        />
      )}
    </Screen>
  );
}
