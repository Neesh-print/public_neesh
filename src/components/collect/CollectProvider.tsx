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
import type { ClientEventType, CollectionState } from '@/lib/collect/shared';
import { SavePrompt } from './SavePrompt';

// Reader state for every directory page: who is signed in, which issues
// they own or want, which titles they follow. Signed out, marks live on the
// device and each change logs an anonymous event; signed in, marks write to
// the reader's own rows (RLS: owner only) and database triggers log events.

export interface TitleFlags {
  following: boolean;
  completing: boolean;
}

interface EventInput {
  title_id?: string | null;
  issue_id?: string | null;
  store_id?: string | null;
  surface?: string;
}

interface CollectContextValue {
  ready: boolean;
  session: Session | null;
  email: string | null;
  items: Record<string, CollectionState>;
  itemTitles: Record<string, string>;
  titles: Record<string, TitleFlags>;
  setIssueState: (
    issueId: string,
    titleId: string,
    state: CollectionState | null,
    surface: string
  ) => Promise<boolean>;
  setTitleFlags: (titleId: string, flags: Partial<TitleFlags>, surface: string) => Promise<boolean>;
  logEvent: (type: ClientEventType, input: EventInput) => void;
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  openSavePrompt: () => void;
  // Short confirmation line at the bottom of the screen.
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

const PROMPT_SEEN_KEY = 'neesh_collect_prompted';

export function CollectProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Record<string, CollectionState>>({});
  const [itemTitles, setItemTitles] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, TitleFlags>>({});
  const [promptOpen, setPromptOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
  const claimed = useRef<string | null>(null);

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
  }, []);

  // Load the signed-in reader's marks. On the first load of a session, any
  // marks still on the device are claimed into the account first, so
  // nothing marked before sign-in is lost.
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
    const [itemRes, titleRes] = await Promise.all([
      supabase.from('collection_items').select('issue_id, state, issue:directory_issues(title_id)'),
      supabase.from('collector_titles').select('title_id, following, completing'),
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

  const maybePrompt = useCallback(() => {
    if (session) return;
    try {
      if (window.localStorage.getItem(PROMPT_SEEN_KEY)) return;
      window.localStorage.setItem(PROMPT_SEEN_KEY, '1');
    } catch {
      // storage blocked: still show it once this page view
    }
    setPromptOpen(true);
  }, [session]);

  const setIssueState = useCallback(
    async (issueId: string, titleId: string, state: CollectionState | null, surface: string) => {
      const prev = items[issueId] ?? null;
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
      if (state) maybePrompt();
      return true;
    },
    [items, session, logEvent, maybePrompt]
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
      if (next.following && !prev.following) maybePrompt();
      return true;
    },
    [titles, session, logEvent, maybePrompt]
  );

  const authedFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const supabase = browserClient();
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const headers = new Headers(init.headers);
      if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
      return fetch(url, { ...init, headers });
    },
    []
  );

  const notice = useCallback((message: string) => {
    const key = Date.now();
    setToast({ message, key });
    window.setTimeout(() => setToast((cur) => (cur?.key === key ? null : cur)), 2800);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = browserClient();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    applyLocal(readMarks());
  }, [applyLocal]);

  const refresh = useCallback(async () => {
    if (session) await loadRemote(session);
    else applyLocal(readMarks());
  }, [session, loadRemote, applyLocal]);

  const value = useMemo<CollectContextValue>(
    () => ({
      ready,
      session,
      email: session?.user.email ?? null,
      items,
      itemTitles,
      titles,
      setIssueState,
      setTitleFlags,
      logEvent,
      authedFetch,
      openSavePrompt: () => setPromptOpen(true),
      notice,
      signOut,
      refresh,
    }),
    [ready, session, items, itemTitles, titles, setIssueState, setTitleFlags, logEvent, authedFetch, notice, signOut, refresh]
  );

  return (
    <CollectContext.Provider value={value}>
      {children}
      {promptOpen && !session && <SavePrompt onClose={() => setPromptOpen(false)} />}
      {toast && (
        <div className="collect-toast" role="status" key={toast.key}>
          {toast.message}
        </div>
      )}
    </CollectContext.Provider>
  );
}
