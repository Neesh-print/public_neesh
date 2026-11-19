// Number formatting shared by the calculator model and its UI. Ported from
// the approved prototype (neesh-magazine-calculator.html); keep the output
// identical, the acceptance checks compare formatted strings.

export const fmt = (n: number, d = 0): string =>
  (n < 0 ? '-' : '') +
  '$' +
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtN = (n: number): string => Math.round(n).toLocaleString('en-US');

export const pct = (n: number): string => (isFinite(n) ? (n * 100).toFixed(0) : '0') + '%';

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
