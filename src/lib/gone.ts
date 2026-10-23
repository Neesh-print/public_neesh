// Whether a profile row should answer 410 Gone (spec 6.3). Shared by the
// middleware and its tests.
export interface ProfileFlags {
  removed?: boolean;
  status?: string;
  eligible?: boolean;
  publisher?: { removed?: boolean; eligible?: boolean } | null;
}

export function isGone(kind: 'titles' | 'publishers', row: ProfileFlags): boolean {
  if (kind === 'titles') {
    return Boolean(
      row.removed ||
        row.status === 'ceased' ||
        row.publisher?.removed ||
        row.publisher?.eligible === false
    );
  }
  return Boolean(row.removed || row.eligible === false);
}
