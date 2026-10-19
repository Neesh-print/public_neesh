// Fall 2026 NYC awareness campaign. Each printed piece carries a QR code
// pointing at /go/<line>-<piece>, which redirects to the homepage with UTMs.
// The homepage reads utm_content and shows the matching line above the hero
// headline, so a scan lands on the same words that were on the poster.

export const CAMPAIGN = 'awareness-nyc-fall26';

export const CAMPAIGN_LINES: Record<string, string> = {
  'picture-books': 'Like picture books for grown ups.',
  'fewer-words': 'Fewer words. Better pictures. Same bragging rights.',
  'read-it-or-dont': 'Read it or don’t. It looks good either way.',
  'coffee-table': 'Leave it on the coffee table. We won’t tell.',
  'tired-of-internet': 'For people who are tired of the internet and want everyone to know it.',
  'kept-the-poster': 'read the interview, skipped the essay, kept the poster',
  'screen-time': 'my screen time is embarrassing. my coffee table isn’t.',
  'too-many-interests': 'For people with good taste and too many interests.',
};

export const CAMPAIGN_PIECES = ['poster', 'sticker', 'flyer'] as const;
