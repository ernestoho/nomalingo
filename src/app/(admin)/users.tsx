/**
 * Admin — member list + role management.
 *
 * - Debounced search field hitting ?q=
 * - List: name, email, role, isMember, ticketCount, joined date
 * - Role toggle per user calling PUT /api/admin/users
 * - Self-demotion 409 message surfaced verbatim
 * - No password fields ever
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import AdminShell, { ErrorBanner, OfflineBanner } from '../../components/AdminShell';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  PressableScale,
  Row,
  SectionHeader,
  Skeleton,
  Spacer,
  Tag,
  Txt,
} from '../../components/ui';
import { SearchIcon } from '../../components/icons';
import { api } from '../../lib/api';
import { formatLongDate, formatNumber, useT, useLang } from '../../lib/i18n';
import { useSync } from '../../lib/content-sync';
import { useAuth } from '../../lib/auth';
import { color, space } from '../../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type User = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  onboarded: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  isMember: boolean;
  ticketCount: number;
};

/* ------------------------------------------------------------------ */
/*  Debounce hook                                                       */
/* ------------------------------------------------------------------ */

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Role badge                                                          */
/* ------------------------------------------------------------------ */

function RoleBadge({ role }: { role: string }) {
  const t = useT();
  if (role === 'admin') return <Tag label={t({ es: 'Admin', en: 'Admin' })} tone="accent" />;
  return <Tag label={t({ es: 'Usuario', en: 'User' })} tone="sand" />;
}

/* ------------------------------------------------------------------ */
/*  User row                                                            */
/* ------------------------------------------------------------------ */

function UserRow({
  user,
  currentUserId,
  onToggleRole,
  busy,
}: {
  user: User;
  currentUserId: string;
  onToggleRole: (user: User) => Promise<void>;
  busy: boolean;
}) {
  const t = useT();
  const { lang } = useLang();
  const isSelf = user.id === currentUserId;

  return (
    <View style={styles.userRow}>
      <View style={{ flex: 1 }}>
        <Row gap={space.sm} align="center">
          <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {user.name}
          </Txt>
          <RoleBadge role={user.role} />
          {user.isMember && (
            <Tag label={t({ es: 'Socio', en: 'Member' })} tone="warm" />
          )}
        </Row>
        <Spacer h={2} />
        <Txt variant="caption" numberOfLines={1}>{user.email}</Txt>
        <Spacer h={2} />
        <Row gap={space.md}>
          <Txt variant="caption">
            {formatLongDate(user.createdAt, lang)}
          </Txt>
          {user.ticketCount > 0 && (
            <Txt variant="caption">
              {formatNumber(user.ticketCount, lang)} {t({ es: 'boleto(s)', en: 'ticket(s)' })}
            </Txt>
          )}
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Button
          label={
            user.role === 'admin'
              ? t({ es: 'Quitar admin', en: 'Remove admin' })
              : t({ es: 'Hacer admin', en: 'Make admin' })
          }
          variant={user.role === 'admin' ? 'danger' : 'secondary'}
          size="md"
          full={false}
          disabled={busy || isSelf}
          onPress={() => onToggleRole(user)}
          style={{ minWidth: 110 }}
        />
        {/*
          Say why rather than leaving a dead button. Removing your own admin
          role is blocked on the server too — it is the one change that could
          lock everyone out of this dashboard.
        */}
        {isSelf ? (
          <Txt variant="caption" style={{ marginTop: 4, maxWidth: 150, textAlign: 'right' }}>
            {t({ es: 'No puedes cambiar tu propio rol', en: 'You cannot change your own role' })}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                         */
/* ------------------------------------------------------------------ */

export default function AdminUsers() {
  const t = useT();
  const { lang } = useLang();
  const { user: currentUser } = useAuth();
  const { refresh: syncRefresh } = useSync();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    setOfflineMsg(null);
    const path = q ? `/api/admin/users?q=${encodeURIComponent(q)}` : '/api/admin/users';
    const res = await api.get<User[]>(path);
    if (!mounted.current) return;
    if (res.ok) setUsers(res.data);
    else if (res.kind === 'offline') setOfflineMsg(res.message);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(debouncedSearch || undefined);
  }, [debouncedSearch, load]);

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin';
    setTogglingId(user.id);
    setError(null);
    const res = await api.put<{ ok: boolean; userId: string; role: string }>(
      '/api/admin/users',
      { userId: user.id, role: newRole },
    );
    if (!mounted.current) return;
    setTogglingId(null);
    if (res.ok) {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole as 'member' | 'admin' } : u)),
      );
      await syncRefresh();
    } else {
      // Surface the message verbatim (especially the self-demotion 409)
      setError(res.message);
    }
  };

  return (
    <AdminShell active="users">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Spacer h={space.md} />

        <SectionHeader title={t({ es: 'Miembros', en: 'Members' })} />

        <Field
          value={search}
          onChangeText={setSearch}
          placeholder={t({ es: 'Buscar por nombre o correo…', en: 'Search by name or email…' })}
          returnKeyType="search"
        />
        <Spacer h={space.md} />

        {offlineMsg && <OfflineBanner message={offlineMsg} onRetry={() => load(debouncedSearch || undefined)} />}
        {error && <ErrorBanner message={error} />}

        {loading ? (
          [...Array(5)].map((_, i) => (
            <View key={i} style={{ marginBottom: space.md }}>
              <Skeleton width="100%" height={80} radius={12} />
            </View>
          ))
        ) : users.length === 0 ? (
          <EmptyState
            emoji="👥"
            title={t({ es: 'Sin miembros', en: 'No members' })}
            body={
              search
                ? t({ es: 'Ningún usuario coincide con tu búsqueda.', en: 'No users match your search.' })
                : t({ es: 'Los usuarios aparecerán aquí cuando se registren.', en: 'Users will appear here once they sign up.' })
            }
          />
        ) : (
          <>
            <Txt variant="caption" c={color.textTertiary} style={{ marginBottom: space.sm }}>
              {formatNumber(users.length, lang)}{' '}
              {t({ es: 'resultado(s)', en: 'result(s)' })}
            </Txt>
            <Card padded={false}>
              {users.map((u, i) => (
                <View key={u.id}>
                  {i > 0 && <Divider />}
                  <UserRow
                    user={u}
                    currentUserId={currentUser?.id ?? ''}
                    onToggleRole={handleToggleRole}
                    busy={togglingId === u.id}
                  />
                </View>
              ))}
            </Card>
          </>
        )}
        <Spacer h={space.huge} />
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.base, paddingBottom: space.huge },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
  },
});
