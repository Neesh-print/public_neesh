'use client';

import { useEffect, useState } from 'react';
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

export function useTitlesWithIssues(titleIds: string[]): { loading: boolean; titles: TitleWithIssues[] } {
  const key = [...new Set(titleIds)].sort().join(',');
  const [state, setState] = useState<{ loading: boolean; titles: TitleWithIssues[] }>({ loading: true, titles: [] });

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    const supabase = browserClient();
    if (!supabase || ids.length === 0) {
      setState({ loading: false, titles: [] });
      return;
    }
    let active = true;
    Promise.all([
      supabase
        .from('directory_titles')
        .select('id, name, slug, cover_image_path, publisher:directory_publishers(name)')
        .in('id', ids),
      supabase.from('directory_issues').select(ISSUE_COLUMNS).in('title_id', ids).limit(5000),
    ]).then(([titleRes, issueRes]) => {
      if (!active) return;
      const issues = (issueRes.data ?? []) as Issue[];
      const titles = ((titleRes.data ?? []) as unknown as TitleSummary[])
        .map((t) => ({ ...t, issues: issues.filter((i) => i.title_id === t.id).sort(compareIssues) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
      setState({ loading: false, titles });
    });
    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
