// Cookie consent for the non-essential tracking on the site: Google Tag
// Manager / GA4 and the neesh_ft first-touch cookie. Nothing non-essential
// is set until the visitor accepts; the choice itself is stored in
// neesh_consent, a necessary cookie scoped to .neesh.art so the marketing
// site and the app share it. The head script in app/layout.tsx reads the
// same cookie before GTM would load, and defines window.__neeshLoadAnalytics.

export type Consent = 'granted' | 'denied';

export const CONSENT_COOKIE = 'neesh_consent';
/** Fired on window after a choice is saved; detail is the Consent value. */
export const CONSENT_EVENT = 'neesh:consent';
/** Fire on window to reopen the banner (footer "Cookie settings"). */
export const CONSENT_OPEN_EVENT = 'neesh:consent-open';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

declare global {
  interface Window {
    __neeshLoadAnalytics?: () => void;
    __neeshDenyAnalytics?: () => void;
  }
}

function sharedDomain(): string {
  const host = window.location.hostname;
  return host === 'neesh.art' || host.endsWith('.neesh.art') ? '; domain=.neesh.art' : '';
}

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(granted|denied)(?:;|$)`));
  return match ? (match[1] as Consent) : null;
}

// Cookies set by the tracking we gate: GA4 (_ga, _ga_<id>, _gid) and first
// touch. Cleared on decline in case an earlier visit had accepted.
function clearTrackingCookies(): void {
  const names = document.cookie
    .split('; ')
    .map((part) => part.split('=')[0])
    .filter((name) => name === 'neesh_ft' || name === '_gid' || name === '_ga' || name.startsWith('_ga_'));
  const host = window.location.hostname;
  const domains = ['', `; domain=${host}`, sharedDomain(), '; domain=.' + host.replace(/^www\./, '')];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; max-age=0; path=/${domain}`;
    }
  }
}

export function writeConsent(consent: Consent): void {
  document.cookie =
    `${CONSENT_COOKIE}=${consent}; max-age=${MAX_AGE_SECONDS}; path=/; SameSite=Lax` +
    (window.location.protocol === 'https:' ? '; Secure' : '') +
    sharedDomain();
  if (consent === 'granted') {
    window.__neeshLoadAnalytics?.();
  } else {
    window.__neeshDenyAnalytics?.();
    clearTrackingCookies();
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
}

// Inline in <head>, before anything else can touch dataLayer. Consent Mode
// defaults to denied; GTM itself is only fetched once consent is granted,
// either from a stored choice here or from the banner.
export function consentHeadScript(gtmId: string): string {
  return `(function(w,d){
w.dataLayer=w.dataLayer||[];
function gtag(){w.dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
var loaded=false;
w.__neeshLoadAnalytics=function(){
gtag('consent','update',{analytics_storage:'granted'});
if(loaded)return;loaded=true;
w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${gtmId}';
var f=d.getElementsByTagName('script')[0];f.parentNode.insertBefore(j,f);
};
w.__neeshDenyAnalytics=function(){gtag('consent','update',{analytics_storage:'denied'});};
if(/(?:^|; )${CONSENT_COOKIE}=granted(?:;|$)/.test(d.cookie))w.__neeshLoadAnalytics();
})(window,document);`;
}
