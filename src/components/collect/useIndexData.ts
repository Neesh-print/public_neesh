'use client';

import { useCallback, useEffect, useState } from 'react';
import { browserClient } from '@/lib/collect/browser';
import { compareIssues, ISSUE_COLUMNS, type Issue } from '@/lib/collect/shared';

// Index data for the reader pages: titles plus every visible issue of each,
// read with the public key (RLS hides removed, merged and rejected rows).

export interface TitleSummary {
  id: string;
  name: string;
  slug: string;
  cover_image_path: string | null;
  publisher: { name: string } | null;
}

export interface TitleWithIssues extends TitleSummary {
  issues: Issue[];
}

interface State {
  loading: boolean;
  error: boolean;
  titles: TitleWithIssues[];
}

export function useTitlesWithIssues(
  titleIds: string[],
  bySlug?: string
): State & { retry: () => void } {
  const key = bySlug ? `slug:${bySlug}` : [...new Set(titleIds)].sort().join(',');
  const [state, setState] = useState<State>({ loading: true, error: false, titles: [] });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const supabase = browserClient();
    const ids = key && !key.startsWith('slug:') ? key.split(',') : [];
    if (!supabase || (!key.startsWith('slug:') && ids.length === 0)) {
      setState({ loading: false, error: false, titles: [] });
      return;
    }
    let active = true;
    setState((cur) => ({ ...cur, loading: true, error: false }));
    (async () => {
      const titleQuery = supabase
        .from('directory_titles')
        .select('id, name, slug, cover_image_path, publisher:directory_publishers(name)');
      const titleRes = key.startsWith('slug:')
        ? await titleQuery.eq('slug', key.slice(5))
        : await titleQuery.in('id', ids);
      if (titleRes.error) throw titleRes.error;
      const titleRows = (titleRes.data ?? []) as unknown as TitleSummary[];
      const found = titleRows.map((t) => t.id);
      const issueRes = found.length
        ? await supabase.from('directory_issues').select(ISSUE_COLUMNS).in('title_id', found).limit(5000)
        : { data: [], error: null };
      if (issueRes.error) throw issueRes.error;
      const issues = (issueRes.data ?? []) as Issue[];
      const titles = titleRows
        .map((t) => ({ ...t, issues: issues.filter((i) => i.title_id === t.id).sort(compareIssues) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
      if (active) setState({ loading: false, error: false, titles });
    })().catch(() => {
      if (active) setState({ loading: false, error: true, titles: [] });
    });
    return () => {
      active = false;
    };
  }, [key, attempt]);

  return { ...state, retry };
}
