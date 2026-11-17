# Proposed privacy policy change: cookies

**Status: approved by counsel and applied** (privacy policy effective
October 25, 2026). The cookie paragraph and the two provider entries below
are in `src/lib/legal-content.ts`.

**Open item for counsel.** After the draft was approved, the site also put
two `/collect` cookies behind the same consent: `neesh_anon` (a random
device id, one year, used to count anonymous activity on Your collection
and attach it to an account at sign-in) and `neesh_collect_utm` (the
campaign tags of the first visit, one year). They are not set without
consent, but the policy does not name them. Proposed third bullet:

> **Your collection cookies** (`neesh_anon`, `neesh_collect_utm`, kept for
> one year), which count how people use Your collection before signing in
> and remember the campaign that brought them, so their activity can be
> added to their account when they sign in.

## Why it needs changing

The current policy (Privacy, "Information we collect", "Information collected
automatically") says:

> Our website uses only cookies and similar technologies that are necessary
> for login sessions and site functionality — we do not use advertising or
> cross-site tracking cookies, which is why you do not see a cookie consent
> banner. If we ever add non-essential cookies, we will update this policy
> and add appropriate consent controls first.

That was not accurate before this change: Google Tag Manager loaded Google
Analytics 4 on every page, which sets `_ga` and `_ga_<id>` cookies, and the
site set a 180-day `neesh_ft` first-touch attribution cookie. Both are
non-essential.

As of the consent change, neither is set unless the visitor clicks Accept on
the cookie banner, and "Cookie settings" in the footer lets them change their
mind. The sentence about there being no banner is now wrong the other way.

## Proposed replacement text

> **Cookies.** Our website uses cookies that are necessary for it to work,
> such as remembering your cookie choice and keeping you signed in on
> app.neesh.art. With your permission, we also use:
>
> - **Google Analytics** (loaded through Google Tag Manager), which sets
>   cookies (`_ga`, `_ga_*`) to tell us how the site is used, such as which
>   pages are visited and how people arrive. Google processes this data on
>   our behalf.
> - **A first-touch cookie** (`neesh_ft`, kept for 180 days), which
>   remembers how you first found Neesh, for example a search engine or a
>   campaign link, so we can see which channels bring publishers and spaces
>   to us.
>
> We ask before setting any of these, and nothing is set if you decline. You
> can change your choice at any time with **Cookie settings** at the bottom
> of every page. We also use Vercel Web Analytics and Speed Insights, which
> measure page views and performance without cookies or cross-site
> identifiers. We do not use advertising or cross-site tracking cookies.

Also worth adding to the service-provider list: **Google (Analytics, Tag
Manager)**, **Vercel (hosting, cookieless analytics)**.

Once approved, update the source document and regenerate
`src/lib/legal-content.ts`, and bump the policy's effective date.
