// Cookie consent for the non-essential tracking on the site: Google Tag
// Manager / GA4 (with Google Ads click measurement) and the neesh_ft
// first-touch cookie.
//
// Where the visitor is decides the default:
// - Ask first (EU/EEA, UK, Switzerland, or anywhere we can't tell, or a
//   browser sending Global Privacy Control): nothing non-essential is set
//   until the visitor accepts.
// - Everywhere else (opt-out, the US model): measurement runs by default,
//   a notice offers "Opt out", and opting out stops it and clears its
//   cookies.
// Region comes from the browser's time zone, so cached pages need no
// server work per request. Unknown or UTC time zones count as ask-first.
//
// The choice is stored in neesh_consent, a necessary cookie scoped to
// .neesh.art so the marketing site and the app share it. neesh_consent_v
// marks choices made under the current wording (analytics plus ad-click
// measurement); a grant without it predates that wording and only covers
// analytics. The head script in app/layout.tsx applies all of this before
// GTM would load, and defines window.__neeshLoadAnalytics.

export type Consent = 'granted' | 'denied';

export const CONSENT_COOKIE = 'neesh_consent';
export const CONSENT_VERSION_COOKIE = 'neesh_consent_v';
export const CONSENT_VERSION = '2';
/** Fired on window after a choice is saved; detail is the Consent value. */
export const CONSENT_EVENT = 'neesh:consent';
/** Fire on window to reopen the banner (footer "Cookie settings"). */
export const CONSENT_OPEN_EVENT = 'neesh:consent-open';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

declare global {
  interface Window {
    __neeshLoadAnalytics?: (scope: 'full' | 'analytics') => void;
    __neeshDenyAnalytics?: () => void;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

// Time zones outside Europe/* that sit in the EU/EEA (outermost regions,
// Canaries, Madeira, Azores, Cyprus, Iceland, Faroes, Svalbard).
const ASK_FIRST_ZONES = [
  'Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores', 'Atlantic/Reykjavik',
  'Atlantic/Faroe', 'Africa/Ceuta', 'Arctic/Longyearbyen', 'Asia/Nicosia', 'Asia/Famagusta',
  'America/Guadeloupe', 'America/Martinique', 'America/Cayenne', 'America/Marigot',
  'America/St_Barthelemy', 'Indian/Reunion', 'Indian/Mayotte',
];

/** True when the visitor must opt in before any non-essential cookie. */
export function askFirstFor(timeZone: string, gpc: boolean): boolean {
  if (gpc) return true;
  if (!timeZone || /^(Etc\/)?(UTC|GMT|UCT|Universal|Zulu)/.test(timeZone)) return true;
  return timeZone.startsWith('Europe/') || ASK_FIRST_ZONES.includes(timeZone);
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

export function askFirst(): boolean {
  if (typeof window === 'undefined') return true;
  return askFirstFor(browserTimeZone(), window.navigator?.globalPrivacyControl === true);
}

function sharedDomain(): string {
  const host = window.location.hostname;
  return host === 'neesh.art' || host.endsWith('.neesh.art') ? '; domain=.neesh.art' : '';
}

/** The visitor's stored choice, or null if they haven't made one. */
export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(granted|denied)(?:;|$)`));
  return match ? (match[1] as Consent) : null;
}

/** Whether non-essential measurement may run now: a stored choice, else the region default. */
export function analyticsAllowed(): boolean {
  const stored = readConsent();
  if (stored) return stored === 'granted';
  return !askFirst();
}

// Cookies set by the tracking we gate: GA4 (_ga, _ga_<id>, _gid), Google Ads
// click ids (_gcl_*), first touch, and the collection device id and campaign
// tags. Cleared on opt-out in case they were set earlier.
const GATED_COOKIES = new Set(['neesh_ft', '_gid', '_ga', 'neesh_anon', 'neesh_collect_utm']);

function clearTrackingCookies(): void {
  const names = document.cookie
    .split('; ')
    .map((part) => part.split('=')[0])
    .filter((name) => GATED_COOKIES.has(name) || name.startsWith('_ga_') || name.startsWith('_gcl_'));
  const host = window.location.hostname;
  const domains = ['', `; domain=${host}`, sharedDomain(), '; domain=.' + host.replace(/^www\./, '')];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; max-age=0; path=/${domain}`;
    }
  }
}

function setCookie(name: string, value: string): void {
  document.cookie =
    `${name}=${value}; max-age=${MAX_AGE_SECONDS}; path=/; SameSite=Lax` +
    (window.location.protocol === 'https:' ? '; Secure' : '') +
    sharedDomain();
}

export function writeConsent(consent: Consent): void {
  setCookie(CONSENT_COOKIE, consent);
  setCookie(CONSENT_VERSION_COOKIE, CONSENT_VERSION);
  if (consent === 'granted') {
    window.__neeshLoadAnalytics?.('full');
  } else {
    window.__neeshDenyAnalytics?.();
    clearTrackingCookies();
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
}

// Inline in <head>, before anything else can touch dataLayer. Consent Mode
// starts denied; the script then applies a stored choice or the region
// default (askFirstFor, mirrored inline so it runs before React loads).
// "full" grants analytics plus ad-click measurement (ad_storage,
// ad_user_data); ad_personalization (remarketing) is never granted.
export function consentHeadScript(gtmId: string): string {
  return `(function(w,d){
w.dataLayer=w.dataLayer||[];
function gtag(){w.dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
var loaded=false;
w.__neeshLoadAnalytics=function(scope){
var full=scope==='full';
gtag('consent','update',{analytics_storage:'granted',ad_storage:full?'granted':'denied',ad_user_data:full?'granted':'denied'});
if(loaded)return;loaded=true;
w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${gtmId}';
var f=d.getElementsByTagName('script')[0];f.parentNode.insertBefore(j,f);
};
w.__neeshDenyAnalytics=function(){gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied'});};
var tz='';try{tz=(w.Intl||Intl).DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}
var gpc=!!(w.navigator&&w.navigator.globalPrivacyControl===true);
var zones=${JSON.stringify(ASK_FIRST_ZONES)};
var ask=gpc||!tz||/^(Etc\\/)?(UTC|GMT|UCT|Universal|Zulu)/.test(tz)||tz.indexOf('Europe/')===0||zones.indexOf(tz)>-1;
var m=d.cookie.match(/(?:^|; )${CONSENT_COOKIE}=(granted|denied)(?:;|$)/);
var current=/(?:^|; )${CONSENT_VERSION_COOKIE}=${CONSENT_VERSION}(?:;|$)/.test(d.cookie);
if(m){if(m[1]==='granted')w.__neeshLoadAnalytics(current||!ask?'full':'analytics');}
else if(!ask)w.__neeshLoadAnalytics('full');
})(window,document);`;
}
