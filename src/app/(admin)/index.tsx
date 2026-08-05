/**
 * Admin overview — business metrics dashboard.
 *
 * Sections:
 *  - Headline stats row
 *  - Signups + revenue last 14 days (SVG bar chart, hand-drawn)
 *  - Current official event capacity
 *  - Top venues and top upcoming meetups
 *  - Recent signups
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import AdminShell, { ErrorBanner, OfflineBanner } from '../../components/AdminShell';
import {
  Card,
  Divider,
  EmptyState,
  ProgressBar,
  Row,
  SectionHeader,
  Skeleton,
  Spacer,
  Stat,
  Txt,
} from '../../components/ui';
import { api } from '../../lib/api';
import { formatLongDate, formatUsd, formatNumber, useT, useLang } from '../../lib/i18n';
import { useSync } from '../../lib/content-sync';
import { color, font, palette, space } from '../../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Types from GET /api/admin/overview                                  */
/* ------------------------------------------------------------------ */

type DaySeries = { day: string; count: number }[];

type Overview = {
  totals: {
    users: number;
    members: number;
    tickets: number;
    revenue: number;
    meetups: number;
    venues: number;
  };
  signupsLast14Days: DaySeries;
  revenueLast14Days: DaySeries;
  topVenues: { id: string; name: string; area: string; meetups: number }[];
  topMeetups: { id: string; title: { es: string; en: string }; going: number; capacity: number; startsAt: string }[];
  currentEvent: {
    id: string;
    title: { es: string; en: string };
    capacity: number;
    sold: number;
    revenue: number;
  } | null;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
};

/* ------------------------------------------------------------------ */
/*  Mini bar chart — hand-drawn in react-native-svg                     */
/* ------------------------------------------------------------------ */

type ChartSeries = {
  label: string;
  values: number[];
  color: string;
  format: (v: number) => string;
};

function DualBarChart({
  days,
  series,
  chartWidth,
}: {
  days: string[];   // YYYY-MM-DD
  series: ChartSeries[];
  chartWidth: number;
}) {
  const H = 110;
  const paddingLeft = 4;
  const paddingRight = 4;
  const paddingTop = 12;
  const paddingBottom = 30;
  const drawH = H - paddingTop - paddingBottom;
  const drawW = chartWidth - paddingLeft - paddingRight;

  const n = days.length;
  if (n === 0) return null;

  // Combined max across all series for a shared y-axis
  const allVals = series.flatMap((s) => s.values);
  const maxVal = Math.max(...allVals, 1);

  // Bar width — when two series, interleave them side-by-side
  const groupW = drawW / n;
  const barW = Math.max(2, groupW / (series.length + 0.6) - 1);
  const groupGap = (groupW - barW * series.length) / 2;

  // Label the first and last day only
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <Svg width={chartWidth} height={H}>
      {/* bars */}
      {series.map((s, si) =>
        days.map((_, di) => {
          const val = s.values[di] ?? 0;
          const barH = Math.max(2, (val / maxVal) * drawH);
          const x = paddingLeft + di * groupW + groupGap + si * (barW + 1);
          const y = paddingTop + drawH - barH;
          return (
            <Rect
              key={`${si}-${di}`}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              fill={s.color}
              opacity={0.85}
            />
          );
        }),
      )}

      {/* x-axis line */}
      <Line
        x1={paddingLeft}
        y1={paddingTop + drawH}
        x2={paddingLeft + drawW}
        y2={paddingTop + drawH}
        stroke={palette.sand2}
        strokeWidth={1}
      />

      {/* axis end labels */}
      <SvgText
        x={paddingLeft}
        y={H - 6}
        fontSize={9}
        fill={palette.muted}
        fontFamily={font.regular}
        textAnchor="start"
      >
        {fmt(days[0])}
      </SvgText>
      <SvgText
        x={paddingLeft + drawW}
        y={H - 6}
        fontSize={9}
        fill={palette.muted}
        fontFamily={font.regular}
        textAnchor="end"
      >
        {fmt(days[n - 1])}
      </SvgText>
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart legend                                                        */
/* ------------------------------------------------------------------ */

function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <Row gap={space.lg} style={{ paddingTop: space.xs }}>
      {series.map((s) => (
        <Row key={s.label} gap={space.xs} align="center">
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
          <Txt variant="micro">{s.label}</Txt>
        </Row>
      ))}
    </Row>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeletons                                                           */
/* ------------------------------------------------------------------ */

function OverviewSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Spacer h={space.md} />
      <Row gap={space.md} style={styles.statsRow} wrap>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={styles.statBox}>
            <Skeleton width="60%" height={22} radius={6} />
            <Skeleton width="80%" height={11} radius={4} style={{ marginTop: 4 }} />
          </View>
        ))}
      </Row>
      <Spacer h={space.lg} />
      <Skeleton width={140} height={16} radius={6} />
      <Spacer h={space.sm} />
      <Skeleton width="100%" height={110} radius={12} />
      <Spacer h={space.lg} />
      <Skeleton width="100%" height={88} radius={12} />
      <Spacer h={space.lg} />
      <Skeleton width="100%" height={200} radius={12} />
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                         */
/* ------------------------------------------------------------------ */

export default function AdminOverview() {
  const t = useT();
  const { lang } = useLang();
  const { refresh: syncRefresh } = useSync();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    setOfflineMsg(null);
    const res = await api.get<Overview>('/api/admin/overview');
    if (!mounted.current) return;
    if (res.ok) {
      setData(res.data);
    } else if (res.kind === 'offline') {
      setOfflineMsg(res.message);
    } else {
      setError(res.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncRefresh();
    await load(true);
  }, [load, syncRefresh]);

  /* wide-screen chart width */
  const isWide = width >= 720;
  const chartWidth = Math.min(width, 900) - space.base * 2 - space.md * 2;

  /* ---- loading ---- */
  if (loading && !data) {
    return (
      <AdminShell active="index">
        <OverviewSkeleton />
      </AdminShell>
    );
  }

  /* ---- chart data ---- */
  const signupSeries: ChartSeries = {
    label: t({ es: 'Registros', en: 'Signups' }),
    values: (data?.signupsLast14Days ?? []).map((d) => d.count),
    color: color.accent,
    format: (v) => String(v),
  };
  const revenueSeries: ChartSeries = {
    label: t({ es: 'Ingresos', en: 'Revenue' }),
    values: (data?.revenueLast14Days ?? []).map((d) => d.count),
    color: palette.gold,
    format: formatUsd,
  };
  const chartDays = (data?.signupsLast14Days ?? []).map((d) => d.day);

  return (
    <AdminShell active="index">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.accent}
          />
        }
      >
        <Spacer h={space.md} />

        {/* Error / offline banners */}
        {offlineMsg && (
          <OfflineBanner message={offlineMsg} onRetry={() => load()} />
        )}
        {error && <ErrorBanner message={error} />}

        {/* ─── Headline stats ─────────────────────────────────────────── */}
        {data && (
          <>
            <Row gap={space.sm} wrap style={styles.statsRow}>
              <View style={styles.statBox}>
                <Stat
                  value={formatNumber(data.totals.users, lang)}
                  label={t({ es: 'Miembros', en: 'Users' })}
                />
              </View>
              <View style={styles.statBox}>
                <Stat
                  value={formatNumber(data.totals.members, lang)}
                  label={t({ es: 'Socios activos', en: 'Active members' })}
                />
              </View>
              <View style={styles.statBox}>
                <Stat
                  value={formatNumber(data.totals.tickets, lang)}
                  label={t({ es: 'Boletos', en: 'Tickets' })}
                />
              </View>
              <View style={styles.statBox}>
                <Stat
                  value={formatUsd(data.totals.revenue)}
                  label={t({ es: 'Ingresos', en: 'Revenue' })}
                />
              </View>
              <View style={styles.statBox}>
                <Stat
                  value={formatNumber(data.totals.meetups, lang)}
                  label={t({ es: 'Encuentros', en: 'Meetups' })}
                />
              </View>
              <View style={styles.statBox}>
                <Stat
                  value={formatNumber(data.totals.venues, lang)}
                  label={t({ es: 'Lugares', en: 'Venues' })}
                />
              </View>
            </Row>

            <Spacer h={space.xl} />

            {/* ─── Activity chart ──────────────────────────────────────── */}
            <SectionHeader
              title={t({ es: 'Últimos 14 días', en: 'Last 14 days' })}
            />
            <Card>
              <ChartLegend series={[signupSeries, revenueSeries]} />
              <Spacer h={space.sm} />
              <DualBarChart
                days={chartDays}
                series={[signupSeries, revenueSeries]}
                chartWidth={chartWidth}
              />
            </Card>

            <Spacer h={space.xl} />

            {/* ─── Current event ───────────────────────────────────────── */}
            {data.currentEvent && (
              <>
                <SectionHeader
                  title={t({ es: 'Evento actual', en: 'Current event' })}
                />
                <Card>
                  <Txt variant="bodyStrong">
                    {lang === 'es'
                      ? data.currentEvent.title.es
                      : data.currentEvent.title.en}
                  </Txt>
                  <Spacer h={space.sm} />
                  <ProgressBar
                    value={
                      data.currentEvent.capacity > 0
                        ? data.currentEvent.sold / data.currentEvent.capacity
                        : 0
                    }
                    height={8}
                  />
                  <Spacer h={space.sm} />
                  <Row justify="space-between">
                    <Txt variant="caption">
                      {t({
                        es: `${data.currentEvent.sold} / ${data.currentEvent.capacity} vendidos`,
                        en: `${data.currentEvent.sold} / ${data.currentEvent.capacity} sold`,
                      })}
                    </Txt>
                    <Txt variant="label" c={color.accent}>
                      {formatUsd(data.currentEvent.revenue)}
                    </Txt>
                  </Row>
                </Card>
                <Spacer h={space.xl} />
              </>
            )}

            {/* ─── Top venues ──────────────────────────────────────────── */}
            {data.topVenues.length > 0 && (
              <>
                <SectionHeader
                  title={t({ es: 'Mejores lugares', en: 'Top venues' })}
                />
                <Card padded={false}>
                  {data.topVenues.map((v, i) => (
                    <View key={v.id}>
                      {i > 0 && <Divider />}
                      <Row
                        justify="space-between"
                        style={{ paddingHorizontal: space.base, paddingVertical: space.md }}
                      >
                        <Row gap={space.md}>
                          <Txt variant="label" c={color.textTertiary}>
                            {i + 1}
                          </Txt>
                          <View>
                            <Txt variant="bodyStrong" numberOfLines={1}>
                              {v.name}
                            </Txt>
                            <Txt variant="caption">{v.area}</Txt>
                          </View>
                        </Row>
                        <Txt variant="label" c={color.accent}>
                          {formatNumber(v.meetups, lang)}{' '}
                          {t({ es: 'enc.', en: 'meet.' })}
                        </Txt>
                      </Row>
                    </View>
                  ))}
                </Card>
                <Spacer h={space.xl} />
              </>
            )}

            {/* ─── Top upcoming meetups ────────────────────────────────── */}
            {data.topMeetups.length > 0 && (
              <>
                <SectionHeader
                  title={t({ es: 'Próximos encuentros', en: 'Upcoming meetups' })}
                />
                <Card padded={false}>
                  {data.topMeetups.map((m, i) => (
                    <View key={m.id}>
                      {i > 0 && <Divider />}
                      <Row
                        justify="space-between"
                        style={{ paddingHorizontal: space.base, paddingVertical: space.md }}
                      >
                        <Row gap={space.md} style={{ flex: 1 }}>
                          <Txt variant="label" c={color.textTertiary}>
                            {i + 1}
                          </Txt>
                          <View style={{ flex: 1 }}>
                            <Txt variant="bodyStrong" numberOfLines={1}>
                              {lang === 'es' ? m.title.es : m.title.en}
                            </Txt>
                            <Txt variant="caption">
                              {formatLongDate(m.startsAt, lang)}
                            </Txt>
                          </View>
                        </Row>
                        <Txt variant="label" c={color.accent}>
                          {m.going}/{m.capacity}
                        </Txt>
                      </Row>
                    </View>
                  ))}
                </Card>
                <Spacer h={space.xl} />
              </>
            )}

            {/* ─── Recent signups ──────────────────────────────────────── */}
            {data.recentUsers.length > 0 && (
              <>
                <SectionHeader
                  title={t({ es: 'Registros recientes', en: 'Recent signups' })}
                />
                <Card padded={false}>
                  {data.recentUsers.map((u, i) => (
                    <View key={u.id}>
                      {i > 0 && <Divider />}
                      <Row
                        justify="space-between"
                        style={{ paddingHorizontal: space.base, paddingVertical: space.md }}
                      >
                        <View style={{ flex: 1 }}>
                          <Txt variant="bodyStrong" numberOfLines={1}>
                            {u.name}
                          </Txt>
                          <Txt variant="caption" numberOfLines={1}>
                            {u.email}
                          </Txt>
                        </View>
                        <Txt variant="caption" c={color.textTertiary}>
                          {formatLongDate(u.createdAt, lang)}
                        </Txt>
                      </Row>
                    </View>
                  ))}
                </Card>
              </>
            )}

            {!data.topVenues.length &&
              !data.topMeetups.length &&
              !data.recentUsers.length && (
                <EmptyState
                  emoji="📊"
                  title={t({ es: 'Sin datos aún', en: 'No data yet' })}
                  body={t({
                    es: 'Los indicadores aparecerán aquí cuando haya actividad.',
                    en: 'Metrics will appear here once there is activity.',
                  })}
                />
              )}

            <Spacer h={space.huge} />
          </>
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.base,
    paddingBottom: space.huge,
  },
  statsRow: {
    gap: space.sm,
  },
  statBox: {
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: space.base,
    alignItems: 'center',
    flex: 1,
    minWidth: 90,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
});
