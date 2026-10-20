'use client';

import { useCollect } from './CollectProvider';

// Follow a title for new issues, without committing to the back catalogue.
export function FollowButton({ titleId }: { titleId: string }) {
  const { titles, setTitleFlags, notice } = useCollect();
  const following = titles[titleId]?.following ?? false;

  async function toggle() {
    const ok = await setTitleFlags(titleId, { following: !following }, 'title_page');
    if (!ok) notice('That didn’t save. Try again.');
    else if (!following) notice('You’re following this magazine on Neesh');
  }

  return (
    <button type="button" className={`btn ${following ? 'solid' : 'ghost'} follow-btn`} aria-pressed={following} onClick={toggle}>
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
