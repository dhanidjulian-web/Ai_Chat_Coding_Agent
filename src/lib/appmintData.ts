// AppMint data runtime — AUTO-PROVIDED by AppMint. DO NOT EDIT, DO NOT RE-EMIT.
//
// This file is injected into every project automatically. It is the ONE place that
// knows how to persist and read user data correctly, so generated apps never have to.
// Route ALL collection/persisted data through the hooks below and three whole classes
// of bug become impossible — regardless of whether the app is a todo list, a game
// leaderboard, a dashboard, a journal, or anything else:
//
//   1. "I add something and it doesn't show until reload"      -> mutations are reactive.
//   2. "After login I see old data but not the new rows"        -> stores refetch on auth change.
//   3. "User A sees User B's data" / "data vanishes after login" -> every store is user-scoped.
//   4. "It said Saved! but the row was never saved"              -> ANY write that does not land
//      is rolled back and the promise REJECTS — a backend refusal (RLS, bad column, no session)
//      AND a network outage alike. Success UI after `await add/update/remove` can only run when
//      the write actually landed. A network failure used to keep the row locally and "sync
//      later", but nothing ever replayed it and refresh() replaces the mirror with the server
//      list — so the row the user was told had saved silently disappeared. Claiming success and
//      losing the data is worse than an honest failure.
//
// It works ONLINE (Supabase, when window.supabaseConfig is present) and OFFLINE
// (localStorage — an app with no backend configured, where writes genuinely persist locally).
// Reads survive a network drop from the local mirror; WRITES require the backend to be reachable
// on a backend-backed app.
//
// Public API (this is all generated code should ever touch):
//   useCollection<T>(table)  -> { items, loading, error, online, add, update, remove, refresh }
//   useValue<T>(key, initial) -> [value, setValue]            // single reactive value (settings, etc.)
//   useUser()                 -> { user, loading }
//   useRealtime(table, opts, onChange) / subscribeTable(...)  // live rows: chat, feeds, queues
//   signUp / signIn / signInAnonymously / signOut / signInWithGoogle / getClient
//
// Implementation note: the store core is plain JS (no React) so it can be unit-tested
// headlessly; the hooks are thin wrappers over it via useSyncExternalStore.

import { useSyncExternalStore, useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────────
export interface Row { id?: string; [k: string]: any }
export interface CollectionState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  online: boolean;
}
export interface AuthUser { id: string; email?: string | null; isAnonymous?: boolean }

type Listener = () => void;

// Storage abstraction so the core can be tested with an in-memory map (and so a
// device with localStorage disabled never crashes).
interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
function safeLocalStorage(): KV {
  try {
    if (typeof localStorage !== 'undefined') { localStorage.getItem('__amt'); return localStorage as any; }
  } catch (_) { /* disabled / privacy mode */ }
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
}

// ── Config ───────────────────────────────────────────────────────────────────────
function cfg(): any { return (typeof window !== 'undefined' ? (window as any).supabaseConfig : null) || null; }
function appId(): string { return (cfg() && cfg().appId) || 'app'; }
function uid(): string { return _user ? _user.id : 'anon'; }
function mirrorKey(table: string, scope: string): string { return `appmint:${appId()}:${table}:${scope}`; }

// ── Backend (Supabase) singleton ───────────────────────────────────────────────────
let _clientPromise: Promise<any> | null = null;
let _user: AuthUser | null = null;
const _authListeners = new Set<Listener>();
let _authWired = false;

export function getClient(): Promise<any> | null {
  const c = cfg();
  if (!c || !c.url || !c.anonKey) return null; // offline / not configured
  if (_clientPromise) return _clientPromise; // hot path: every collection op lands here — must stay log-free
  // First creation only: one line with the state that matters for OAuth debugging. Logging on
  // every call flooded logcat/smoke with ~40 identical lines per run and buried real signals.
  // eslint-disable-next-line no-console
  console.log('[appmintData] getClient: creating client, hashLen=' + (typeof window !== 'undefined' && window.location ? (window.location.hash || '').length : -1));
  // OAuth tokens are captured into `window.__appmintOauthTokens` by an inline bootstrap
  // script in <head> — that runs BEFORE React/Router/main.tsx can clear the URL fragment,
  // which we observed happens in this WebView (hashLen=0 by the time getClient runs).
  let _pendingOAuthTokens: { access_token: string; refresh_token: string } | null = null;
  try {
    const captured = (typeof window !== 'undefined') ? (window as any).__appmintOauthTokens : null;
    if (captured && captured.access_token && captured.refresh_token) {
      _pendingOAuthTokens = { access_token: captured.access_token, refresh_token: captured.refresh_token };
      try { delete (window as any).__appmintOauthTokens; } catch {}
      // eslint-disable-next-line no-console
      console.log('[appmintData] CAPTURED OAuth tokens from window.__appmintOauthTokens');
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[appmintData] OAuth token read failed: ' + describeError(e));
  }
  _clientPromise = (async () => {
    // Bundled (vendored in the on-device toolchain) — the published app must never depend
    // on a third-party CDN being up at runtime. Kept as a dynamic import so client creation
    // stays lazy; Vite inlines it into the single-file bundle (inlineDynamicImports).
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(c.url, c.anonKey, {
      db: { schema: c.schema || 'public' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // We do session detection ourselves (see below) — disable supabase-js's own to avoid
        // the silent-fail race we hit in the WebView.
        detectSessionInUrl: false,
        flowType: 'implicit',
        storage: safeLocalStorage() as any,
      },
    });
    if (_pendingOAuthTokens) {
      try {
        // eslint-disable-next-line no-console
        console.log('[appmintData] applying setSession with captured OAuth tokens');
        const r = await client.auth.setSession(_pendingOAuthTokens);
        // eslint-disable-next-line no-console
        console.log('[appmintData] setSession result: err=' + (r?.error ? String(r.error.message || r.error) : 'null') + ' hasSession=' + !!(r?.data?.session));
        try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch {}
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[appmintData] setSession failed: ' + describeError(e));
      }
    }
    // Wire auth once: keep _user fresh and refetch every active store on any change.
    const { data } = await client.auth.getSession();
    _user = mapUser(data?.session?.user);
    // Publish the current access token to a global so generated edge-function calls (Stripe
    // create-checkout, Razorpay create-order) can attach the SIGNED-IN buyer's JWT without the
    // getSession dance the model keeps botching (destructured wrong, OR the anon key hardcoded in
    // the Authorization header → the function sees no buyer → "Sign in to purchase." even when
    // logged in). A build-time transform rewrites `Bearer ${...anonKey}` to prefer this global.
    // Kept fresh on every auth change below; signed out ⇒ null ⇒ callers fall back to the anon key.
    try { (globalThis as any).__amAccessToken = data?.session?.access_token || null; } catch (_) {}
    if (!_authWired) {
      _authWired = true;
      client.auth.onAuthStateChange((_evt: string, session: any) => {
        const next = mapUser(session?.user);
        const changed = (next?.id || null) !== (_user?.id || null);
        _user = next;
        try { (globalThis as any).__amAccessToken = session?.access_token || null; } catch (_) {}
        // Keep the realtime socket's JWT in step with the session (covers TOKEN_REFRESHED
        // too). Vendored supabase-js versions differ on doing this automatically, and a
        // socket carrying a stale/anon token receives NOTHING RLS-protected — the app then
        // looks like "live updates need a manual reload".
        try { client.realtime && client.realtime.setAuth(session?.access_token); } catch (_) {}
        if (changed) onScopeChanged();   // login/logout -> every store re-scopes + refetches
        _authListeners.forEach((l) => l());
      });
    }
    return client;
  })();
  return _clientPromise;
}

function mapUser(u: any): AuthUser | null {
  if (!u) return null;
  return { id: u.id, email: u.email ?? null, isAnonymous: !!u.is_anonymous };
}

// When the signed-in identity changes, the data for the old scope is no longer valid.
// Drop every store so the next render re-creates them under the new scope and refetches.
function onScopeChanged() {
  for (const store of _stores.values()) store.rescope();
  // Live channels were JOINED under the previous identity, and postgres_changes evaluates
  // RLS with the claims presented at join time. A channel joined pre-login therefore streams
  // as anon forever: reload shows the rows (REST uses the fresh token) but nothing arrives
  // live (live failure 2026-07-06, "Alert" chat + newsfeed). Tear down and rejoin every
  // subscription under the new token.
  _rejoiners.forEach((r) => { try { r(); } catch (_) {} });
}

// ── Collection store (plain JS, reactive, optimistic) ───────────────────────────────
class CollectionStore<T extends Row> {
  table: string;
  private state: CollectionState<T> = { items: [], loading: true, error: null, online: false };
  private listeners = new Set<Listener>();
  private kv: KV;
  private started = false;
  private scope = '';
  private backend: Backend;

  constructor(table: string, backend: Backend, kv: KV) {
    this.table = table; this.backend = backend; this.kv = kv;
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    if (!this.started) this.start();
    return () => { this.listeners.delete(l); };
  };
  getSnapshot = (): CollectionState<T> => this.state;

  private set(patch: Partial<CollectionState<T>>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // Read the mirror first (instant render), then refresh from the backend.
  private start() {
    this.started = true;
    this.scope = this.backend.scope();
    const cached = this.readMirror();
    this.state = { items: cached, loading: true, error: null, online: false };
    this.refresh();
    this.startLive();
  }

  // ── Real-time: every collection is LIVE across devices ─────────────────────────────
  // Multi-sided apps (dispatcher queues, chats, order boards) require the OTHER side's
  // writes to appear without user action. Subscribe to Supabase postgres_changes for this
  // table and refresh on any event; RLS still applies (each client only receives rows its
  // JWT may SELECT). Debounced so bursts coalesce into one refetch. No-op offline.
  private liveStarted = false;
  private refreshTimer: any = null;
  private startLive() {
    if (this.liveStarted) return;
    this.liveStarted = true;
    if (!getClient()) return; // offline app — no backend, nothing to subscribe to
    // One permanent live subscription per table, via the shared realtime primitive (unique
    // topic + callback-before-subscribe + clean teardown — see subscribeTable). Debounced so a
    // burst of changes coalesces into a single refetch. The store is a singleton, so we never
    // need the returned unsubscribe.
    subscribeTable(this.table, { event: '*' }, () => {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => { this.refreshTimer = null; this.refresh(); }, 250);
    });
  }

  // Called when the auth identity changes: forget everything and reload under the new scope.
  rescope() {
    this.scope = this.backend.scope();
    this.set({ items: this.readMirror(), loading: true });
    this.refresh();
  }

  /**
   * Monotonic mutation counter. A refetch that STARTED before the latest local mutation may
   * not overwrite state: its rows were read before that mutation committed, so trusting it
   * silently drops a row the user just saved. Measured live 2026-08-10: the runtime's
   * signed-out recovery starts a guest session mid-add; the auth change refetches under the
   * new uid, the read lands before the retried INSERT commits, and the stale empty result
   * then clobbered the note that add() had appended — DB right, screen wrong until reload.
   */
  private mutSeq = 0;
  noteMutation() { this.mutSeq++; }

  refresh = async (): Promise<void> => {
    const startedAt = this.mutSeq;
    try {
      const items = await this.backend.list<T>(this.table);
      if (this.mutSeq !== startedAt) { this.refresh(); return; }  // stale read — go again
      this.writeMirror(items);
      this.set({ items, loading: false, error: null, online: this.backend.isOnline() });
    } catch (e: any) {
      // A backend failure is NOT a crash — we already have the mirror. Stay usable, go offline.
      console.warn(`[appmintData] ${this.table}.refresh fell back to offline: ${describeError(e)}`);
      this.set({ loading: false, online: false });
    }
  };

  // Optimistic: update the in-memory list + mirror + notify SYNCHRONOUSLY so the UI
  // re-renders immediately, then reconcile with the backend in the background.
  add = async (row: Partial<T>): Promise<T> => {
    const optimistic = { ...(row as any), id: (row as any).id || newRowId() } as T;
    this.set({ items: [...this.state.items, optimistic] });
    this.writeMirror(this.state.items);
    try {
      const saved = await this.backend.insert<T>(this.table, optimistic);
      this.noteMutation();  // commit moment — a refetch that started earlier is now stale
      // UPSERT the server row, don't just map-replace. When the backend's signed-out
      // recovery starts a session MID-add, the auth change rescopes this store and wipes the
      // optimistic row before we get here — a map over items then finds nothing to replace
      // and the row the server just accepted never re-enters the list (screen said "No notes"
      // while the DB held the note, live 2026-08-10).
      const present = this.state.items.some((r) => r.id === saved.id || r.id === optimistic.id);
      this.set({
        items: present
          ? this.state.items.map((r) => (r.id === optimistic.id || r.id === saved.id ? saved : r))
          : [...this.state.items, saved],
        online: this.backend.isOnline(),
      });
      this.writeMirror(this.state.items);
      return saved;
    } catch (e: any) {
      if (isQuotaError(e) || isServerRejection(e)) {
        // The write DEFINITIVELY failed — the backend refused it (RLS, bad column, no
        // session) or local storage is full. Keeping the optimistic row would show a
        // phantom "saved" item that vanishes on the next refresh, and resolving would let
        // the caller's success toast fire on a failed save (measured across all five
        // gate-3 apps). Roll the row back, surface the error, and REJECT so
        // `await add(...)` lands in the caller's catch, not its success path.
        this.set({
          items: this.state.items.filter((r) => r.id !== optimistic.id),
          online: this.backend.isOnline(),
          error: isQuotaError(e) ? 'Device storage is full — this item could not be saved.' : writeError('save', e),
        });
        this.writeMirror(this.state.items);
        console.error(`[appmintData] ${this.table}.add failed (rolled back): ${describeError(e)}`);
        throw e;
      }
      // Network outage on a BACKEND-BACKED app. There is no outbox and nothing replays writes
      // on reconnect, while refresh() replaces the mirror wholesale with the server list — so a
      // row "kept offline" is silently destroyed by the next successful refresh, after the UI
      // already told the user it saved. That is the banned shape: claim success, lose the data.
      // (An app with NO backend configured never reaches here — it runs on LocalBackend, whose
      // writes genuinely succeed.) Roll back and reject, exactly like the rejection branch above,
      // so the caller's catch runs and the user is told the truth.
      this.set({
        items: this.state.items.filter((r) => r.id !== optimistic.id),
        online: false,
        error: writeError('save', e),
      });
      this.writeMirror(this.state.items);
      console.error(`[appmintData] ${this.table}.add failed offline (rolled back): ${describeError(e)}`);
      throw e;
    }
  };

  update = async (id: string, patch: Partial<T>): Promise<void> => {
    const prev = this.state.items;
    this.set({ items: prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
    this.writeMirror(this.state.items);
    try {
      await this.backend.update<T>(this.table, id, patch);
      this.noteMutation();
      this.set({ online: this.backend.isOnline() });
    } catch (e: any) {
      if (isQuotaError(e) || isServerRejection(e)) {
        // Definitive failure: restore the pre-edit rows and reject (see add() for why —
        // an optimistic patch that the backend refused must not survive in the UI, and
        // the caller's success path must not run).
        this.set({
          items: prev,
          online: this.backend.isOnline(),
          error: isQuotaError(e) ? 'Device storage is full — this change could not be saved.' : writeError('update', e),
        });
        this.writeMirror(prev);
        console.error(`[appmintData] ${this.table}.update failed (rolled back): ${describeError(e)}`);
        throw e;
      }
      // Network outage on a backend-backed app — same reasoning as add(): nothing replays the
      // edit later and the next refresh overwrites the mirror from the server, so a patch "kept
      // offline" is a change the user was told had saved and which then disappears.
      this.set({
        items: prev,
        online: false,
        error: writeError('update', e),
      });
      this.writeMirror(prev);
      console.error(`[appmintData] ${this.table}.update failed offline (rolled back): ${describeError(e)}`);
      throw e;
    }
  };

  remove = async (id: string): Promise<void> => {
    const prev = this.state.items;
    this.set({ items: prev.filter((r) => r.id !== id) });
    this.writeMirror(this.state.items);
    try {
      await this.backend.remove(this.table, id);
      this.noteMutation();
      this.set({ online: this.backend.isOnline() });
    } catch (e: any) {
      if (isQuotaError(e) || isServerRejection(e)) {
        // Definitive failure: the row is still alive on the backend — put it back and
        // reject so the UI can't show a deletion that didn't happen.
        this.set({
          items: prev,
          online: this.backend.isOnline(),
          error: isQuotaError(e) ? 'Device storage is full — this change could not be saved.' : writeError('delete', e),
        });
        this.writeMirror(prev);
        console.error(`[appmintData] ${this.table}.remove failed (rolled back): ${describeError(e)}`);
        throw e;
      }
      // Network outage on a backend-backed app — same reasoning as add(): the row is still alive
      // on the server, nothing replays the delete, and the next refresh brings it back. Showing a
      // deletion that did not happen is worse than saying it failed.
      this.set({
        items: prev,
        online: false,
        error: writeError('delete', e),
      });
      this.writeMirror(prev);
      console.error(`[appmintData] ${this.table}.remove failed offline (rolled back): ${describeError(e)}`);
      throw e;
    }
  };

  private readMirror(): T[] {
    try { const raw = this.kv.getItem(mirrorKey(this.table, this.scope)); return raw ? JSON.parse(raw) : []; }
    catch (_) { return []; }
  }
  private writeMirror(items: T[]) {
    try { this.kv.setItem(mirrorKey(this.table, this.scope), JSON.stringify(items)); }
    catch (e: any) {
      if (isQuotaError(e)) {
        // Silent swallow here = the change looks saved but dies on reload. Say so.
        console.error(`[appmintData] ${this.table}: storage quota exceeded — local copy NOT saved (oversized media in rows?)`);
        this.set({ error: 'Device storage for this app is full — recent changes may not survive a reload.' });
      }
      /* storage disabled (privacy mode) stays tolerant — the in-memory KV already covers it */
    }
  }
}

function tempId(): string { return 'tmp_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

/**
 * The id a new row gets BEFORE insert — a real UUID, not a placeholder.
 *
 * The old flow minted a `tmp_…` marker, stripped it at insert so the DB assigned the real id,
 * and relied on the RETURNING row to reconcile. But RLS can filter RETURNING on a perfectly
 * successful insert, and then the caller was handed the tmp id as if it were real. Any app that
 * stored that id (in a sheet row, a webhook payload, its own state) could never address the row
 * again — measured live 2026-08-09: a booking's sheet row was permanently "pending" because
 * cancel matched on the real id while column A held tmp_….
 *
 * A client-minted UUID removes the entire class: the id is real from the first optimistic
 * render, the insert carries it, and it is identical everywhere forever. Postgres uuid PKs
 * accept explicit values; tables with non-uuid ids are handled by the insert's retry below.
 */
function newRowId(): string {
  try { return crypto.randomUUID(); } catch (_) { return tempId(); }
}

// A PostgREST/GoTrue rejection carries a `code` (e.g. 42501 RLS) or HTTP `status`; a network
// outage throws a bare fetch TypeError with neither. Only the former means "the backend said no".
function isServerRejection(e: any): boolean {
  return !!(e && (e.code || (typeof e.status === 'number' && e.status >= 400)));
}

// localStorage quota (~5MB/origin on Android WebView). Typical trigger: base64 media stuffed
// into rows/values. Names/codes differ per engine — normalize them all to one predicate.
function isQuotaError(e: any): boolean {
  const name = String(e?.name || '');
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014;
}
function writeError(op: string, e: any): string {
  const msg = String((e && e.message) || 'rejected by server');
  return `Couldn't ${op}: ${msg}`;
}

// WebView console capture flattens object args to "[object Object]", which blinds both the
// user and the fix loop. Supabase rejections are plain {code,message,details,hint} objects
// (not Error instances), so fold every field we have into ONE readable string.
function describeError(e: any): string {
  if (e == null) return 'unknown error';
  if (typeof e === 'string') return e;
  const parts: string[] = [];
  if (e.code) parts.push(`code=${e.code}`);
  if (typeof e.status === 'number') parts.push(`status=${e.status}`);
  if (e.message) parts.push(String(e.message));
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint) parts.push(`hint: ${e.hint}`);
  if (parts.length) return parts.join(' | ');
  try { const j = JSON.stringify(e); if (j && j !== '{}') return j; } catch (_) {}
  const s = String(e);
  return s === '[object Object]' ? 'unrecognized error object (no code/message)' : s;
}

// ── Backend interface + implementations ─────────────────────────────────────────────
interface Backend {
  scope(): string;
  isOnline(): boolean;
  list<T extends Row>(table: string): Promise<T[]>;
  insert<T extends Row>(table: string, row: T): Promise<T>;
  update<T extends Row>(table: string, id: string, patch: Partial<T>): Promise<void>;
  remove(table: string, id: string): Promise<void>;
}

// A DEAD auth session: the stored JWT expired and refresh cannot revive it (anonymous user
// cleaned up server-side, refresh token revoked, auth config changed). supabase-js keeps
// attaching the corpse to every request, so EVERYTHING 401s forever — which is an auth-state
// problem, not "offline" and not RLS (measured live 2026-07-06: an inquiry form kept failing
// after its RLS policy was fixed because the WebView held an expired anonymous session).
function isDeadSession(e: any): boolean {
  const msg = String((e && e.message) || '');
  return e?.status === 401 || e?.code === 'PGRST301' || /jwt\b.*(expired|invalid)/i.test(msg);
}

// Talks to Supabase when configured; the store's mirror is the offline copy. Reads/writes
// are scoped to the signed-in user by the table's RLS policies (auth.uid()), and we also
// stamp user_id on insert so owner-scoped tables work without the model wiring it manually.
class SupabaseBackend implements Backend {
  scope() { return uid(); }
  isOnline() { return true; }
  private async c(): Promise<any> { const p = getClient(); if (!p) throw new Error('offline'); return await p; }
  // On a dead session: try one refresh; if the session cannot be revived, clear it so the
  // retry runs signed-out (public tables then work; owner tables fail with the honest RLS
  // message instead of an eternal 401). Returns true when the caller should retry once.
  private async recoverAuth(client: any, e: any): Promise<boolean> {
    if (!isDeadSession(e)) return false;
    try {
      const { data } = await client.auth.refreshSession();
      if (data?.session) {
        console.warn('[appmintData] auth session refreshed after an expired-JWT rejection — retrying');
        return true;
      }
    } catch (_) {}
    try { await client.auth.signOut(); } catch (_) {}
    console.warn('[appmintData] cleared a dead auth session (expired JWT that could not refresh) — retrying signed-out');
    return true;
  }
  /**
   * Generic signed-out recovery — the runtime's contract is that a generated app never
   * surfaces an error the runtime could have resolved itself, WHATEVER the code.
   *
   * The largest unresolved class was "the model built an owner-scoped table but never signs
   * anyone in": every write then fails (42501 live on notes.add, 2026-08-10 — but the code
   * varies by operation and policy shape). The project always provisions the `anonymous`
   * auth provider, so when ANY operation fails with no session, start a guest session and
   * retry once. If guest sign-in itself is unavailable, the original error surfaces honestly.
   * Deliberately reactive (only after a real failure): proactively signing in every visitor
   * would mint junk auth users for apps whose tables are all public.
   */
  private async recoverNoSession(client: any, e: any, what: string): Promise<boolean> {
    if (_user) return false;            // signed in — this failure is something else
    if (isDeadSession(e)) return false; // recoverAuth's case, already handled
    try {
      const res = await client.auth.signInAnonymously();
      const u = res?.data?.session?.user;
      if (!u) return false;
      _user = mapUser(u);
      console.warn(`[appmintData] ${what} failed signed-out (${e?.code || e?.message}) — started a guest session and retrying`);
      return true;
    } catch (_) { return false; }
  }
  /**
   * THE recovery chain. Every operation retries through here so a whole class of failures is
   * healed in one place instead of whichever op happened to be reported broken this week:
   *   1. dead session (expired JWT)      → refresh, or clear and run signed-out
   *   2. no session on a guarded table   → start a guest session
   *   3. transient transport failures    → brief backoff (fetch aborts, DNS blips, 5xx)
   * Anything else is a REAL error (bad schema, denied policy, missing table) and must surface
   * honestly — retrying those would just hide bugs. Callers bound attempts, so this can never
   * spin forever.
   */
  private async recover(client: any, e: any, what: string): Promise<boolean> {
    if (await this.recoverAuth(client, e)) return true;
    if (await this.recoverNoSession(client, e, what)) return true;
    const msg = String(e?.message || '');
    const transient =
      /failed to fetch|network ?error|load failed|timed? ?out|socket|ECONN|abort/i.test(msg) ||
      (typeof e?.status === 'number' && e.status >= 500);
    if (transient) {
      console.warn(`[appmintData] ${what} hit a transient network error (${e?.code || msg.slice(0, 60)}) — retrying`);
      await new Promise((r) => setTimeout(r, 900));
      return true;
    }
    return false;
  }
  async list<T extends Row>(table: string): Promise<T[]> {
    const client = await this.c();
    let { data, error } = await client.from(table).select('*');
    for (let a = 0; error && a < 3 && await this.recover(client, error, `${table}.list`); a++) {
      ({ data, error } = await client.from(table).select('*'));
    }
    if (error) throw error;
    return (data ?? []) as T[];
  }
  async insert<T extends Row>(table: string, row: T): Promise<T> {
    const client = await this.c();
    const payload: any = { ...row };
    // The client-minted UUID id RIDES ALONG on purpose: with the id decided before insert,
    // the value the caller already holds IS the row's id even when RLS filters the RETURNING
    // row below. Only a legacy tmp_ placeholder is stripped for the DB to assign.
    if (payload.id && String(payload.id).startsWith('tmp_')) delete payload.id;
    const stampedUserId = !!(_user && payload.user_id === undefined);
    if (stampedUserId) payload.user_id = _user!.id;
    let idStripped = false;
    // maybeSingle, not single: when the inserted row is filtered (not raised) by the reader's
    // SELECT policies, zero visible rows is a successful save, not an error.
    let { data, error } = await client.from(table).insert(payload).select().maybeSingle();
    if (error && payload.id && (
      error.code === '22P02' || error.code === '42804' ||
      /invalid input syntax|is of type/i.test(String(error.message || ''))
    )) {
      // This table's id column isn't uuid (bigint identity, etc.) — our pre-minted id can't
      // ride. Let the DB assign; the RETURNING row (when visible) still carries the real id.
      delete payload.id;
      idStripped = true;
      ({ data, error } = await client.from(table).insert(payload).select().maybeSingle());
    }
    if (error && stampedUserId && error.code === 'PGRST204' && String(error.message || '').includes('user_id')) {
      // Our owner-scoping stamp guessed wrong — THIS table has no user_id column (public
      // inbox tables like inquiries). The rejection is ours, not the app's; retry without it.
      delete payload.user_id;
      ({ data, error } = await client.from(table).insert(payload).select().maybeSingle());
    }
    for (let a = 0; error && a < 3 && await this.recover(client, error, `${table}.add`); a++) {
      // Keep the payload's user_id in step with whatever session the recovery left us in:
      // a dead session's uid must not ride into a signed-out retry (it would trip RLS since
      // auth.uid() is now null), and a fresh guest session's uid must be stamped or the retry
      // hits the exact same owner-policy wall that caused the failure.
      if (stampedUserId && !_user) delete payload.user_id;
      if (payload.user_id === undefined && _user) payload.user_id = _user.id;
      ({ data, error } = await client.from(table).insert(payload).select().maybeSingle());
    }
    if (error && (error.code === '42501' || /row-level security/i.test(String(error.message || '')))) {
      // 42501 on `.insert().select()` has TWO indistinguishable causes: (a) the INSERT's own
      // WITH CHECK denied — a real policy problem — or (b) the INSERT passed but `.select()`'s
      // RETURNING row failed the reader's SELECT policies, which ABORTS the whole statement
      // (measured live 2026-07-06: a public inquiries form — anon INSERT `with check (true)`,
      // owner-only SELECT — 42501'd every submit; the identical insert WITHOUT returning
      // committed fine). Retrying with return=minimal separates them: (b) commits cleanly,
      // (a) still fails and surfaces honestly.
      const minimal = await client.from(table).insert(payload);
      if (!minimal.error) {
        console.warn(`[appmintData] ${table}.add saved without representation (write-only table: INSERT allowed, SELECT hidden)`);
        return (row as any) as T;
      }
      error = minimal.error;
    }
    if (error) throw error;
    if (!data && idStripped) {
      // Double edge: non-uuid id column AND RETURNING filtered by RLS — the real id is
      // genuinely unknowable here. Say so instead of letting the caller trust a wrong one.
      console.warn(`[appmintData] ${table}.add: DB assigned the id but RLS hid the returned row — the id in this object is NOT the database id`);
    }
    return (data ?? (row as any)) as T;
  }
  async update<T extends Row>(table: string, id: string, patch: Partial<T>): Promise<void> {
    const client = await this.c();
    let { error } = await client.from(table).update(patch).eq('id', id);
    for (let a = 0; error && a < 3 && await this.recover(client, error, `${table}.update`); a++) {
      ({ error } = await client.from(table).update(patch).eq('id', id));
    }
    if (error) throw error;
  }
  async remove(table: string, id: string): Promise<void> {
    const client = await this.c();
    let { error } = await client.from(table).delete().eq('id', id);
    for (let a = 0; error && a < 3 && await this.recover(client, error, `${table}.remove`); a++) {
      ({ error } = await client.from(table).delete().eq('id', id));
    }
    if (error) throw error;
  }
}

// Pure-localStorage backend: used when there is no Supabase config (fully offline apps).
// Same scope semantics so swapping a backend in later doesn't change behaviour.
class LocalBackend implements Backend {
  private kv: KV;
  constructor(kv: KV) { this.kv = kv; }
  scope() { return uid(); }
  isOnline() { return false; }
  private key(table: string) { return mirrorKey(table, this.scope()); }
  async list<T extends Row>(table: string): Promise<T[]> {
    try { const raw = this.kv.getItem(this.key(table)); return raw ? JSON.parse(raw) : []; } catch (_) { return []; }
  }
  async insert<T extends Row>(table: string, row: T): Promise<T> {
    const items = await this.list<T>(table);
    const saved = { ...(row as any), id: (row as any).id || newRowId() } as T;
    this.kv.setItem(this.key(table), JSON.stringify([...items, saved]));
    return saved;
  }
  async update<T extends Row>(table: string, id: string, patch: Partial<T>): Promise<void> {
    const items = await this.list<T>(table);
    this.kv.setItem(this.key(table), JSON.stringify(items.map((r) => (r.id === id ? { ...r, ...patch } : r))));
  }
  async remove(table: string, id: string): Promise<void> {
    const items = await this.list<Row>(table);
    this.kv.setItem(this.key(table), JSON.stringify(items.filter((r) => r.id !== id)));
  }
}

// ── Store registry ──────────────────────────────────────────────────────────────────
const _stores = new Map<string, CollectionStore<any>>();
function chooseBackend(kv: KV): Backend { return getClient() ? new SupabaseBackend() : new LocalBackend(kv); }

function getStore<T extends Row>(table: string): CollectionStore<T> {
  let s = _stores.get(table);
  if (!s) {
    const kv = safeLocalStorage();
    s = new CollectionStore<T>(table, chooseBackend(kv), kv);
    _stores.set(table, s);
  }
  return s as CollectionStore<T>;
}

// ── React hooks ──────────────────────────────────────────────────────────────────────
/**
 * The ONLY correct way to read/write a list of records in an AppMint app.
 * Reactive: add/update/remove re-render the list automatically. User-scoped and
 * refetch-on-login are handled for you. Works online and offline identically.
 */
export function useCollection<T extends Row = Row>(table: string) {
  const store = getStore<T>(table);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  // getClient() lazily so auth wiring + first scope are resolved as soon as a list mounts.
  useEffect(() => { getClient(); }, []);
  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    online: state.online,
    add: store.add,
    update: store.update,
    remove: store.remove,
    refresh: store.refresh,
  };
}

// ── Real-time subscriptions (filtered / cross-row live feeds: chat, dispatcher queues) ──────
// useCollection already keeps a WHOLE table live. This is the primitive for the harder case: a
// live feed of a SUBSET of rows (per-incident chat, one room's messages, an order's events)
// where the app wants the raw change events, not a full-table refetch.
//
// It lives in the runtime because hand-rolling a channel hits a sharp supabase-js trap:
// `client.channel(name)` RETURNS THE EXISTING channel when `name` repeats, and adding a
// `.on(...)` callback to an already-`.subscribe()`d channel throws
//   "cannot add postgres_changes callbacks for realtime:… after subscribe()".
// React StrictMode double-mounts effects in dev, so ANY reused channel name collides on the
// second mount (live repro 2026-07-06, "Alert" chat). The two facts that make the throw
// impossible — a UNIQUE topic per call and the callback wired BEFORE subscribe() — both live
// here, so no generated app ever has to get them right by hand.
export interface RealtimeOptions {
  /** Which change to listen for. Defaults to all. */
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  /** PostgREST row filter, e.g. `incident_id=eq.${id}` — limits events to matching rows. */
  filter?: string;
}

// Every active subscription registers a rejoin closure here; an auth-identity change
// (onScopeChanged) invokes them all so each channel re-joins under the CURRENT token.
// Without this, a channel joined before login keeps its anon claims and RLS silently
// filters every event it should deliver.
const _rejoiners = new Set<() => void>();

let _rtSeq = 0;
function uniqueTopic(table: string): string {
  _rtSeq += 1;
  const rnd =
    (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2);
  return `amt-rt-${table}-${_rtSeq}-${rnd}`;
}

/**
 * Subscribe to realtime changes on `table` (optionally filtered to a subset of rows). Calls
 * `onChange(payload)` on every matching insert/update/delete and returns an unsubscribe fn.
 * Safe to call repeatedly and under React StrictMode double-mount (each call is its own
 * uniquely-named channel). No-op (returns a no-op unsubscribe) on offline apps. RLS still
 * applies — a client only receives events for rows its JWT may SELECT.
 *
 *   const off = subscribeTable('messages', { filter: 'room_id=eq.' + roomId }, () => reload());
 *   // later: off();
 *
 * In a component, prefer the `useRealtime` hook — it manages this lifecycle for you.
 */
export function subscribeTable(
  table: string,
  opts: RealtimeOptions,
  onChange: (payload: any) => void,
): () => void {
  const p = getClient();
  if (!p) return () => {}; // offline app — no backend, nothing to subscribe to
  let channel: any = null;
  let closed = false;
  const join = () => {
    p.then((client: any) => {
      if (!client || closed) return;
      try {
        // Rejoin path: drop the channel joined under the previous identity first.
        if (channel) { try { client.removeChannel(channel); } catch (_) {} channel = null; }
        const schema =
          (typeof window !== 'undefined' && (window as any).supabaseConfig?.schema) || 'public';
        const changeFilter: any = { event: opts.event || '*', schema, table };
        if (opts.filter) changeFilter.filter = opts.filter;
        // Fresh unique topic + callback BEFORE subscribe(): the two facts that make the
        // "callbacks after subscribe()" throw impossible.
        channel = client
          .channel(uniqueTopic(table))
          .on('postgres_changes', changeFilter, (payload: any) => onChange(payload))
          .subscribe((status: string, err: any) => {
            // A failed join is otherwise SILENT — the app just never updates live, which is
            // indistinguishable from "working but quiet". Log it so field reports of
            // "needs a manual reload" are diagnosable from the console.
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
              console.warn(`[appmintData] realtime ${table}: ${status}${err ? ' — ' + describeError(err) : ''}`);
          });
        // If unsubscribe raced ahead of the client promise resolving, tear down now.
        if (closed) { try { client.removeChannel(channel); } catch (_) {} channel = null; }
      } catch (e: any) {
        // Realtime being unavailable must never crash the app — log and move on.
        console.warn(`[appmintData] realtime subscribe on ${table} failed: ${describeError(e)}`);
      }
    });
  };
  const rejoin = () => join();
  _rejoiners.add(rejoin);
  join();
  return () => {
    closed = true;
    _rejoiners.delete(rejoin);
    const c = channel; channel = null;
    if (c) p.then((client: any) => { try { client && client.removeChannel(c); } catch (_) {} });
  };
}

/**
 * React hook form of subscribeTable: subscribes on mount, unsubscribes on unmount, and
 * re-subscribes when `table`, `event`, or `filter` change. The handler is held in a ref so a
 * fresh inline function on each render does NOT churn the subscription. Call at the top level
 * of a component or custom hook (it IS a hook — Rules of Hooks apply).
 *
 *   useRealtime('messages', { filter: 'room_id=eq.' + roomId }, () => refresh());
 */
export function useRealtime(
  table: string,
  opts: RealtimeOptions,
  onChange: (payload: any) => void,
): void {
  const cb = useRef(onChange);
  cb.current = onChange;
  const event = opts.event || '*';
  const filter = opts.filter || '';
  useEffect(() => {
    const off = subscribeTable(
      table,
      { event: event as RealtimeOptions['event'], filter: filter || undefined },
      (payload) => cb.current(payload),
    );
    return off;
  }, [table, event, filter]);
}

/** A single reactive value backed by localStorage (settings, theme, a counter, etc.). */
export function useValue<T>(key: string, initial: T): [T, (v: T) => void] {
  const kv = safeLocalStorage();
  const full = `appmint:${appId()}:kv:${key}`;
  const [value, setValueState] = useState<T>(() => {
    try { const raw = kv.getItem(full); return raw ? (JSON.parse(raw) as T) : initial; } catch (_) { return initial; }
  });
  const setValue = useCallback((v: T) => {
    setValueState(v);
    try { kv.setItem(full, JSON.stringify(v)); }
    catch (e: any) {
      if (isQuotaError(e)) console.error(`[appmintData] useValue('${key}'): storage quota exceeded — value NOT persisted (oversized media?)`);
    }
  }, [full]);
  return [value, setValue];
}

/** The current signed-in user (or null), reactive to login/logout. */
export function useUser(): {
  user: AuthUser | null; loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
} {
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    const l: Listener = () => { if (alive) force((n) => n + 1); };
    _authListeners.add(l);
    const p = getClient();
    if (p) p.then(() => { if (alive) setLoading(false); }); else setLoading(false);
    return () => { alive = false; _authListeners.delete(l); };
  }, []);
  return { user: _user, loading, signIn: hookSignIn, signUp: hookSignUp, signOut: hookSignOut, signInWithGoogle };
}

// Generated components routinely destructure auth actions from useUser() (Clerk-style):
// `const { signIn } = useUser()` used to yield undefined and crash with a minified
// "e is not a function" at tap time (measured live, "Alert" app). The hook therefore ALSO
// carries the auth actions — as THROWING wrappers, because generated UIs wrap them in
// try/catch and render err.message (the module-level fns return {error} instead).
async function hookSignIn(email: string, password: string): Promise<void> {
  if (!getClient()) throw new Error('No backend configured — accounts are unavailable in this app.');
  const res = await signIn(email, password);
  if (res.error) {
    // One-button "Sign In / Sign Up" screens and demo accounts (admin@… + a demo password)
    // expect the account to exist on first use. Collapse to signUp — which itself collapses
    // back to sign-in for existing users — and surface the ORIGINAL error if both refuse
    // (wrong password on an existing account stays a clean failure).
    try {
      const su = await signUp(email, password);
      if (!su.error) return;
    } catch (_) {}
    throw res.error;
  }
}
async function hookSignUp(email: string, password: string): Promise<void> {
  if (!getClient()) throw new Error('No backend configured — accounts are unavailable in this app.');
  const res = await signUp(email, password);
  if (res.error) throw res.error;
}
async function hookSignOut(): Promise<void> {
  if (!getClient()) return;
  const res = await signOut();
  if ((res as any)?.error) throw (res as any).error;
}

// ── Auth helpers ───────────────────────────────────────────────────────────────────
// AppMint multi-app reality: every app the creator builds against the SAME Supabase project
// shares one `auth.users` table — data is isolated by per-app schema, but identities are not.
// So a user who registered in their "Todo" app and tries to register the same email in their
// "Notes" app would hit "User already registered" from Supabase and be stuck. We collapse
// signUp into a sign-up-or-sign-in: if the account already exists AND the supplied password
// matches, we just sign them in (they're now "registered" in this app — their data lives in
// this app's isolated schema). If the password is wrong, we return that error transparently
// so the UI can route to a real "sign in" / "forgot password" flow.
export async function signUp(email: string, password: string) {
  const client = await getClient()!;
  const res = await client.auth.signUp({ email, password });
  if (res.error) {
    const msg = String((res.error as any).message || '').toLowerCase();
    const code = String((res.error as any).code || '').toLowerCase();
    const status = Number((res.error as any).status || 0);
    const alreadyRegistered =
      code === 'user_already_exists' || code === 'email_exists' ||
      msg.includes('already registered') || msg.includes('already exists') ||
      msg.includes('user already') || status === 422;
    if (alreadyRegistered) {
      // Falling through to sign-in: if THAT fails too (wrong password), it is a real failure the
      // caller must see, not a silent `{ error }` the UI mistakes for success.
      return raiseAuthError(
        await client.auth.signInWithPassword({ email, password }), 'Sign in');
    }
    return raiseAuthError(res, 'Sign up');
  }
  // Anti-enumeration: when "Confirm email" is enabled, Supabase returns success with a
  // synthetic user (empty `identities` array) for an already-registered email rather than
  // leaking the existence of the account. Detect that case and fall through to sign-in.
  const user: any = (res.data as any)?.user;
  if (user && Array.isArray(user.identities) && user.identities.length === 0) {
    const signin = await client.auth.signInWithPassword({ email, password });
    if (!signin.error) return signin;
  }
  return raiseAuthError(res, 'Sign up');
}
/**
 * supabase-js NEVER throws — it returns `{ data, error }`. So `try { await signIn(...) } catch`
 * (which is how every generated app writes it) silently swallowed real auth failures: the catch
 * never ran, the code carried on as if signed in, and the app sat with no session.
 *
 * Measured live 2026-07-31: a chat app called `signInAnonymously()` to auto-join guests. After
 * sign-out the re-join failed, the error was returned rather than thrown, the app set its
 * "ready" flag anyway, and every message query was then denied by RLS — the room hung on loading
 * skeletons forever with no error shown to anyone. Raise it so a failure is a failure, matching
 * the data path, where a write that does not land rejects.
 */
function raiseAuthError(res: any, what: string): any {
  const err = res?.error;
  if (err) {
    const e: any = new Error(err.message || `${what} failed`);
    e.status = err.status; e.code = err.code; e.cause = err;
    throw e;
  }
  return res;
}
export async function signIn(email: string, password: string) {
  const client = await getClient()!;
  return raiseAuthError(await client.auth.signInWithPassword({ email, password }), 'Sign in');
}
export async function signInAnonymously() {
  const client = await getClient()!;
  return raiseAuthError(await client.auth.signInAnonymously(), 'Guest sign in');
}
export async function signOut() {
  const client = await getClient()!;
  return raiseAuthError(await client.auth.signOut(), 'Sign out');
}

// ── Google OAuth (WebView-safe) ───────────────────────────────────────────────────────
// Why this lives in the runtime: supabase-js does NOT auto-redirect from inside an Android
// WebView. The standard pattern of just calling `signInWithOAuth(...)` works in a real
// browser but silently no-ops here — the button feels broken. By owning this helper in the
// runtime we:
//   (1) always pass the AppMint redirect URI (the host activity registers the matching
//       intent filter and routes the `?code=` return back into the WebView),
//   (2) capture `data.url` and navigate explicitly via window.location.href so the consent
//       page actually opens,
//   (3) gracefully no-op when Supabase / Google isn't configured so calling the button on
//       an offline app doesn't throw.
// Apps just import and call: `import { signInWithGoogle } from '@/lib/appmintData';
// <button onClick={signInWithGoogle}>Continue with Google</button>`.
export async function signInWithGoogle(): Promise<void> {
  const c = await getClient();
  if (!c) return; // offline / no backend configured — no-op
  const redirectTo =
    (typeof window !== 'undefined' && (window as any).supabaseConfig?.authRedirect) ||
    (typeof location !== 'undefined' ? location.href : undefined);
  const { data, error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) {
    // Surface to the console but don't throw — UI components shouldn't have to wrap this.
    // eslint-disable-next-line no-console
    console.error('[appmintData] signInWithGoogle failed:', error);
    return;
  }
  // The WebView won't auto-navigate; do it ourselves. Same-tab on purpose so the OAuth
  // return (appmintauth://callback) is delivered to THIS WebView, not a new one.
  if (data?.url && typeof window !== 'undefined') window.location.href = data.url;
}

// ── Headless self-test (called by AppMint's render probe; harmless in production) ─────
// Verifies the core invariants WITHOUT touching the app's own data or UI:
//   (1) add() reflects in the snapshot immediately and notifies subscribers (reactive),
//   (2) a scope change isolates data (no cross-user leakage),
//   (3) the mirror persists across a fresh store (survives reload),
//   (4) the REAL storage medium round-trips (device localStorage: quota, privacy mode),
//   (5) offline apps only: every table the app mounted round-trips add→read→remove on the
//       real persistence path (fresh probe stores, mirror restored byte-identical — the app's
//       own store instances and subscribers never see the probe, so its UI cannot react).
// Online apps skip (5): their end-to-end round-trip is proven against the real backend at
// deploy time (SupabaseSelfTest); a probe row here would write into production data.
// Returns [] on success, or human-readable failures. Exposed on window.__appmintData.
export async function __selftest(): Promise<string[]> {
  const fails: string[] = [];
  const mem = new Map<string, string>();
  const kv: KV = {
    getItem: (k) => (mem.has(k) ? (mem.get(k) as string) : null),
    setItem: (k, v) => { mem.set(k, v); },
    removeItem: (k) => { mem.delete(k); },
  };
  const savedUser = _user;
  try {
    _user = { id: 'userA' };
    const a = new CollectionStore<Row>('selftest', new LocalBackend(kv), kv);
    let notified = 0;
    const unsub = a.subscribe(() => { notified++; });
    await Promise.resolve();
    await a.add({ title: 'one' });
    if (!a.getSnapshot().items.some((r) => r.title === 'one')) fails.push('reactive: add() not reflected in snapshot');
    if (notified < 1) fails.push('reactive: subscribers not notified on add()');
    unsub();

    // (3) persistence: a brand-new store for the same scope reads the mirror back.
    const a2 = new CollectionStore<Row>('selftest', new LocalBackend(kv), kv);
    a2.subscribe(() => {});
    await flush();
    if (!a2.getSnapshot().items.some((r) => r.title === 'one')) fails.push('persistence: data did not survive a fresh store');

    // (2) scoping: switch user; the same table must not show userA rows.
    _user = { id: 'userB' };
    const b = new CollectionStore<Row>('selftest', new LocalBackend(kv), kv);
    b.subscribe(() => {});
    await flush();
    if (b.getSnapshot().items.some((r) => r.title === 'one')) fails.push('scoping: userB sees userA data (scope leak)');
  } catch (e: any) {
    fails.push('selftest threw: ' + (e?.message || e));
  } finally {
    _user = savedUser;
  }

  // (4) real storage medium: the invariants above ran against an in-memory KV (pure logic);
  // this runs against the device's ACTUAL localStorage. A device where storage is broken
  // must fail the smoke, not ship an app that silently loses everything on reload.
  try {
    const realKv = safeLocalStorage();
    const probeKey = `appmint:${appId()}:__amtprobe`;
    realKv.setItem(probeKey, JSON.stringify({ ok: 1 }));
    const echoed = realKv.getItem(probeKey);
    realKv.removeItem(probeKey);
    if (!echoed || JSON.parse(echoed).ok !== 1) fails.push('storage: real localStorage round-trip failed');
  } catch (e: any) {
    fails.push('storage: real localStorage unusable: ' + (e?.message || e));
  }

  // (5) live-table round-trip (offline apps only — see the header note for why).
  if (!getClient()) {
    const tables = Array.from(_stores.keys()).slice(0, 5);
    for (const table of tables) {
      const kvReal = safeLocalStorage();
      const key = mirrorKey(table, uid());
      const rawBefore = kvReal.getItem(key);
      try {
        const probeStore = new CollectionStore<Row>(table, new LocalBackend(kvReal), kvReal);
        probeStore.subscribe(() => {});
        await flush();
        const countBefore = probeStore.getSnapshot().items.length;
        const probe = await probeStore.add({ __amtProbe: true });
        await flush();
        if (!probeStore.getSnapshot().items.some((r) => r.id === probe.id)) {
          fails.push(`round-trip: ${table}.add() did not land in the store`);
        }
        await probeStore.remove(probe.id as string);
        await flush();
        const after = probeStore.getSnapshot().items;
        if (after.some((r) => r.id === probe.id)) fails.push(`round-trip: ${table}.remove() left the probe row behind`);
        if (after.length !== countBefore) fails.push(`round-trip: ${table} row count changed after add+remove (${countBefore} -> ${after.length})`);
      } catch (e: any) {
        fails.push(`round-trip: ${table} probe threw: ` + (e?.message || e));
      } finally {
        // Restore the mirror byte-identical so the probe can never leave residue a user sees.
        try { if (rawBefore === null) kvReal.removeItem(key); else kvReal.setItem(key, rawBefore); } catch (_) { /* KV gone */ }
      }
    }
  }
  return fails;
}

function flush(): Promise<void> { return new Promise((r) => setTimeout(r, 0)); }

// Data-visibility snapshot for the smoke harness (silent-RLS-empty-list detection): which
// backend mode the app runs in, whether anyone is signed in, and how many rows each mounted
// table currently shows. Pure read — never touches data.
export function __visibility(): { online: boolean; signedIn: boolean; tables: Record<string, number> } {
  const tables: Record<string, number> = {};
  try {
    _stores.forEach((store: any, name: string) => {
      try { tables[name] = (store.getSnapshot().items || []).length; } catch (_) { tables[name] = -1; }
    });
  } catch (_) { /* stores map unavailable — report what we have */ }
  return { online: !!getClient(), signedIn: !!_user, tables };
}

// Expose the self-test (and internals for debugging) on window for the render probe.
if (typeof window !== 'undefined') {
  (window as any).__appmintData = { __selftest, __visibility, _stores, getClient };
}
