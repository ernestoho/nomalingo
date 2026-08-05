/**
 * Connectivity.
 *
 * `isConnected` from the OS is necessary but not sufficient: Punta Cana hotel
 * and café wifi routinely reports a connection while a captive portal eats
 * every request. NetInfo's `isInternetReachable` is the flag that actually
 * matters, so this treats "connected but not reachable" as offline.
 *
 * Deliberately optimistic on unknown: when reachability has not resolved yet,
 * assume online and let the request fail. Blocking writes on an unresolved
 * probe makes the app feel broken on a perfectly good connection.
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetStatus = { online: boolean };

let current = true;
const listeners = new Set<(s: NetStatus) => void>();

function evaluate(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

function emit(next: boolean) {
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn({ online: current });
}

NetInfo.addEventListener((state) => emit(evaluate(state)));

export function isOnline(): boolean {
  return current;
}

/** One-shot check, for deciding whether to attempt a flush. */
export async function checkOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const next = evaluate(state);
    emit(next);
    return next;
  } catch {
    return current;
  }
}

export function subscribeNet(fn: (s: NetStatus) => void): () => void {
  listeners.add(fn);
  fn({ online: current });
  return () => listeners.delete(fn);
}
