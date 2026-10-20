'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  anonId,
  browserClient,
  captureUtm,
  clearMarks,
  hasMarks,
  readMarks,
  readUtm,
  writeMarks,
  type LocalMarks,
} from '@/lib/collect/browser';
import { TOAST, type ClientEventType, type CollectionState } from '@/lib/collect/shared';
import { SaveSheet } from './SaveSheet';

// Reader state for every page that shows the site header: who is signed in,
// which issues they own or want, which titles they follow, their home city.
// Signed out, marks live on the device and each change logs an anonymous
// event; signed in, marks write to the reader's own rows (RLS: owner only)
// and database triggers log the events.

export interface TitleFlags {
  following: boolean;
  completing: boolean;
}

export interface HomeCity {
  id: string;
  slug: string;
  name: string;
}

interface EventInput {
  title_id?: string | null;
  issue_id?: string | null;
  store_id?: string | null;
  surface?: string;
}

export type SheetState = 'closed' | 'ask' | 'sent';

interface CollectContextValue {
  ready: boolean;
  session: Session | null;
  email: string | null;
  items: Record<string, CollectionState>;
  itemTitles: Record<string, string>;
  titles: Record<string, TitleFlags>;
  // Owned plus wanted issues, shown in the nav once anything is saved.
  count: number;
  homeCity: HomeCity | null;
  setHomeCity: (city: HomeCity | null) => Promise<boolean>;
  // Own / Want pills: tapping the selected kind clears it; the other kind
  // replaces it. Optimistic, with a toast either way.
  markIssue: (issueId: string, titleId: string, kind: CollectionState, surface: string) => Promise<void>;
  setIssueState: (issueId: string, titleId: string, state: CollectionState | null, surface: string) => Promise<boolean>;
  toggleFollow: (titleId: string, surface: string) => Promise<void>;
  setTitleFlags: (titleId: string, flags: Partial<TitleFlags>, surface: string) => Promise<boolean>;
  logEvent: (type: ClientEventType, input: EventInput) => void;
  track: (event: string, props?: Record<string, unknown>) => void;
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  sheet: SheetState;
  openSheet: () => void;
  setSheet: (state: SheetState) => void;
  notice: (message: string) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CollectContext = createContext<CollectContextValue | null>(null);

export function useCollect(): CollectContextValue {
  const ctx = useContext(CollectContext);
  if (!ctx) throw new Error('useCollect outside CollectProvider');
  return ctx;
}

// For chrome that renders on pages with and without the provider.
export function useCollectOptional(): CollectContextValue | null {
  return useContext(CollectContext);
}

const SHEET_DISMISSED = 'neesh_collect_sheet_dismissed';
const FIRST_MARK = 'neesh_collect_first_mark';
const SHEET_DELAY_MS = 1100;
const TOAST_MS = 2200;

function sessionFlag(key: string, set = false): boolean {
  try {
    if (set) window.sessionStorage.setItem(key, '1');
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function CollectProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Record<string, CollectionState>>({});
  const [itemTitles, setItemTitles] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, TitleFlags>>({});
  const [homeCity, setHomeCityState] = useState<HomeCity | null>(null);
  const [sheet, setSheetState] = useState<SheetState>('closed');
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const claimed = useRef<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const track = useCallback((event: string, props: Record<string, unknown> = {}) => {
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer ?? [];
      w.dataLayer.push({ event, ...props });
    } catch {
      // analytics never breaks the page
    }
  }, []);

  const applyLocal = useCallback((marks: LocalMarks) => {
    const nextItems: Record<string, CollectionState> = {};
    const nextItemTitles: Record<string, string> = {};
    for (const [id, m] of Object.entries(marks.items)) {
      nextItems[id] = m.state;
      nextItemTitles[id] = m.title_id;
    }
    setItems(nextItems);
    setItemTitles(nextItemTitles);
    setTitles({ ...marks.titles });
    setHomeCityState(null);
  }, []);

  // Load the signed-in reader's marks. On the first load of a session, any
  // marks still on the device are claimed into the account first (the union
  // of both; the account wins where they differ), then cleared locally.
  const loadRemote = useCallback(async (s: Session) => {
    const supabase = browserClient();
    if (!supabase) return;
    const local = readMarks();
    if (claimed.current !== s.user.id) {
      const { data: existing } = await supabase
        .from('collectors')
        .select('user_id')
        .eq('user_id', s.user.id)
        .maybeSingle();
      if (!existing || hasMarks(local)) {
        const utm = readUtm();
        const { error } = await supabase.rpc('claim_anonymous_activity', {
          p_anon_id: anonId(),
          p_items: Object.entries(local.items).map(([issue_id, m]) => ({ issue_id, state: m.state })),
          p_titles: Object.entries(local.titles).map(([title_id, f]) => ({ title_id, ...f })),
          p_first_source: utm.utm_campaign ?? null,
        });
        if (!error) clearMarks();
      }
      claimed.current = s.user.id;
    }
    const [itemRes, titleRes, collectorRes] = await Promise.all([
      supabase.from('collection_items').select('issue_id, state, issue:directory_issues(title_id)'),
      supabase.from('collector_titles').select('title_id, following, completing'),
      supabase.from('collectors').select('city:directory_cities(id, slug, name)').eq('user_id', s.user.id).maybeSingle(),
    ]);
    const nextItems: Record<string, CollectionState> = {};
    const nextItemTitles: Record<string, string> = {};
    for (const row of (itemRes.data ?? []) as unknown as {
      issue_id: string;
      state: CollectionState;
      issue: { title_id: string } | null;
    }[]) {
      nextItems[row.issue_id] = row.state;
      if (row.issue) nextItemTitles[row.issue_id] = row.issue.title_id;
    }
    const nextTitles: Record<string, TitleFlags> = {};
    for (const row of (titleRes.data ?? []) as { title_id: string; following: boolean; completing: boolean }[]) {
      nextTitles[row.title_id] = { following: row.following, completing: row.completing };
    }
    setItems(nextItems);
    setItemTitles(nextItemTitles);
    setTitles(nextTitles);
    setHomeCityState((collectorRes.data?.city as unknown as HomeCity | null) ?? null);
  }, []);

  useEffect(() => {
    captureUtm();
    anonId();
    const supabase = browserClient();
    if (!supabase) {
      applyLocal(readMarks());
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadRemote(data.session);
      else applyLocal(readMarks());
      if (active) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_IN' && next) loadRemote(next);
      if (event === 'SIGNED_OUT') {
        claimed.current = null;
        applyLocal(readMarks());
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applyLocal, loadRemote]);

  // One toast at a time; a new one replaces the current.
  const toastKey = useRef(0);
  const notice = useCallback((message: string) => {
    const key = Date.now();
    toastKey.current = key;
    setToast({ message, key });
    setToastVisible(true);
    window.setTimeout(() => {
      if (toastKey.current === key) setToastVisible(false);
    }, TOAST_MS);
  }, []);

  const logEvent = useCallback(
    (type: ClientEventType, input: EventInput) => {
      try {
        const body = JSON.stringify({
          event_type: type,
          title_id: input.title_id ?? null,
          issue_id: input.issue_id ?? null,
          store_id: input.store_id ?? null,
          surface: input.surface ?? null,
          anon_id: anonId(),
          utm: readUtm(),
        });
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session) headers.Authorization = `Bearer ${session.access_token}`;
        fetch('/api/collect/event', { method: 'POST', headers, body, keepalive: true }).catch(() => {});
      } catch {
        // never let counting break the page
      }
    },
    [session]
  );

  const setSheet = useCallback(
    (state: SheetState) => {
      if (state === 'closed') sessionFlag(SHEET_DISMISSED, true);
      if (state === 'ask') {
        track('collect_save_prompt_shown');
        setToastVisible(false);
      }
      setSheetState(state);
    },
    [track]
  );

  // The save sheet: once per visit, 1.1 seconds after the first mark, only
  // while signed out, never again once dismissed.
  const afterFirstMark = useCallback(() => {
    if (session || sessionFlag(FIRST_MARK) || sessionFlag(SHEET_DISMISSED)) return;
    sessionFlag(FIRST_MARK, true);
    window.setTimeout(() => {
      if (!sessionFlag(SHEET_DISMISSED)) setSheet('ask');
    }, SHEET_DELAY_MS);
  }, [session, setSheet]);

  const setIssueState = useCallback(
    async (issueId: string, titleId: string, state: CollectionState | null, surface: string) => {
      const prev = itemsRef.current[issueId] ?? null;
      if (prev === state) return true;
      setItems((cur) => {
        const next = { ...cur };
        if (state) next[issueId] = state;
        else delete next[issueId];
        return next;
      });
      setItemTitles((cur) => ({ ...cur, [issueId]: titleId }));

      const supabase = browserClient();
      if (session && supabase) {
        const { error } = state
          ? await supabase
              .from('collection_items')
              .upsert({ user_id: session.user.id, issue_id: issueId, state }, { onConflict: 'user_id,issue_id' })
          : await supabase.from('collection_items').delete().eq('user_id', session.user.id).eq('issue_id', issueId);
        if (error) {
          setItems((cur) => {
            const next = { ...cur };
            if (prev) next[issueId] = prev;
            else delete next[issueId];
            return next;
          });
          return false;
        }
        return true;
      }

      const marks = readMarks();
      if (state) marks.items[issueId] = { state, title_id: titleId };
      else delete marks.items[issueId];
      writeMarks(marks);
      if (prev) logEvent(`${prev}_removed` as ClientEventType, { title_id: titleId, issue_id: issueId, surface });
      if (state) logEvent(`${state}_added` as ClientEventType, { title_id: titleId, issue_id: issueId, surface });
      return true;
    },
    [session, logEvent]
  );

  const markIssue = useCallback(
    async (issueId: string, titleId: string, kind: CollectionState, surface: string) => {
      const current = itemsRef.current[issueId] ?? null;
      const next = current === kind ? null : kind;
      const ok = await setIssueState(issueId, titleId, next, surface);
      if (!ok) {
        notice(TOAST.failed);
        return;
      }
      track('collect_mark', { kind, state: next ? 'on' : 'off', surface });
      if (next === 'own') notice(TOAST.ownAdded);
      else if (next === 'want') notice(TOAST.wantAdded);
      else notice(kind === 'own' ? TOAST.ownRemoved : TOAST.wantRemoved);
      if (next) afterFirstMark();
    },
    [setIssueState, notice, track, afterFirstMark]
  );

  const setTitleFlags = useCallback(
    async (titleId: string, flags: Partial<TitleFlags>, surface: string) => {
      const prev = titles[titleId] ?? { following: false, completing: false };
      const next = { ...prev, ...flags };
      setTitles((cur) => ({ ...cur, [titleId]: next }));

      const supabase = browserClient();
      if (session && supabase) {
        const { error } = await supabase
          .from('collector_titles')
          .upsert({ user_id: session.user.id, title_id: titleId, ...next }, { onConflict: 'user_id,title_id' });
        if (error) {
          setTitles((cur) => ({ ...cur, [titleId]: prev }));
          return false;
        }
        return true;
      }

      const marks = readMarks();
      marks.titles[titleId] = next;
      writeMarks(marks);
      if (next.following !== prev.following) {
        logEvent(next.following ? 'follow_added' : 'follow_removed', { title_id: titleId, surface });
      }
      if (next.completing !== prev.completing) {
        logEvent(next.completing ? 'complete_on' : 'complete_off', { title_id: titleId, surface });
      }
      return true;
    },
    [titles, session, logEvent]
  );

  const toggleFollow = useCallback(
    async (titleId: string, surface: string) => {
      const following = !(titles[titleId]?.following ?? false);
      const ok = await setTitleFlags(titleId, { following }, surface);
      if (!ok) {
        notice(TOAST.failed);
        return;
      }
      track('collect_follow', { state: following ? 'on' : 'off', surface });
      notice(following ? TOAST.followed : TOAST.unfollowed);
      if (following) afterFirstMark();
    },
    [titles, setTitleFlags, notice, track, afterFirstMark]
  );

  const setHomeCity = useCallback(
    async (city: HomeCity | null) => {
      const supabase = browserClient();
      if (!session || !supabase) return false;
      const prev = homeCity;
      setHomeCityState(city);
      const { error } = await supabase
        .from('collectors')
        .upsert({ user_id: session.user.id, home_city_id: city?.id ?? null }, { onConflict: 'user_id' });
      if (error) {
        setHomeCityState(prev);
        return false;
      }
      return true;
    },
    [session, homeCity]
  );

  const authedFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const supabase = browserClient();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const headers = new Headers(init.headers);
    if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    return fetch(url, { ...init, headers });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = browserClient();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    claimed.current = null;
    applyLocal(readMarks());
  }, [applyLocal]);

  const refresh = useCallback(async () => {
    if (session) await loadRemote(session);
    else applyLocal(readMarks());
  }, [session, loadRemote, applyLocal]);

  const count = Object.keys(items).length;

  const value = useMemo<CollectContextValue>(
    () => ({
      ready,
      session,
      email: session?.user.email ?? null,
      items,
      itemTitles,
      titles,
      count,
      homeCity,
      setHomeCity,
      markIssue,
      setIssueState,
      toggleFollow,
      setTitleFlags,
      logEvent,
      track,
      authedFetch,
      sheet,
      openSheet: () => setSheet('ask'),
      setSheet,
      notice,
      signOut,
      refresh,
    }),
    [
      ready, session, items, itemTitles, titles, count, homeCity, setHomeCity, markIssue, setIssueState,
      toggleFollow, setTitleFlags, logEvent, track, authedFetch, sheet, setSheet, notice, signOut, refresh,
    ]
  );

  return (
    <CollectContext.Provider value={value}>
      {children}
      <SaveSheet />
      <div className={`collect-toast${toastVisible ? ' show' : ''}`} aria-live="polite">
        {toast && <span key={toast.key}>{toast.message}</span>}
      </div>
    </CollectContext.Provider>
  );
}
