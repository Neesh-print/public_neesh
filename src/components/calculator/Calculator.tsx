'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type InputHTMLAttributes } from 'react';
import { BANDS, BENCH, BENCH_TYPE_LABEL, HIST, bandFor } from '@/lib/calculator/benchmarks';
import { clamp, fmt, fmtN, pct } from '@/lib/calculator/format';
import {
  BASE, CHF, DEFAULTS, PRESET_NAMES, QUIZ_START, SECPAIRS,
  breakEven, caseSet, cash, clone, deriveCh, estPrint, fromQuiz, heatProfit, leverValues, model,
  perCopy, planSummary, quoteFit, r10, recCandidates, securedState, verdict as verdictFor, youPart,
  type ChannelKey, type FundingKey, type NumericPlanKey, type Plan, type PresetKey, type QuizState,
} from '@/lib/calculator/model';
import { decodePlan, shareUrl } from '@/lib/calculator/share';
import { readFirstTouch } from '@/lib/first-touch';
import {
  trackCalculatorClaimClick, trackCalculatorExampleOpen, trackCalculatorLinkCopied, trackCalculatorPlanEmailed,
  trackCalculatorPlanSaved, trackCalculatorQuizComplete, trackCalculatorTabView,
} from '@/lib/neesh-analytics';
import { CHIPS, DYNAMIC_HINTS, FUNDING_CHIPS, GROUPS, QUIZ_COPY_CHIPS, SCH, isTab, type FieldDef, type Tab } from './fields';
import './calculator.css';

// The magazine calculator page body. A straight port of the approved
// prototype's markup and render functions into one client component. The
// math lives in src/lib/calculator/model.ts; this file only renders it.
// Plans persist in the browser under the prototype's keys; every storage
// read and write is wrapped so the page works with storage blocked.

const CUR_KEY = 'neesh-mag-v4-current';
const SKEY = 'neesh-mag-v4-scenarios';
const QK = 'neesh-mag-quizdone';

type Saved = Record<string, { S: Plan; saved: number }>;
type Mix = { subs: number; stockists: number; sponsor: number; price: number; singles: number };
const MIX0: Mix = { subs: 0, stockists: 0, sponsor: 0, price: 0, singles: 0 };

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** deriveCh plus the confirmed-never-exceeds-planned rule, without mutating the input. */
function normalize(s: Plan): Plan {
  const n: Plan = { ...s, ch: s.ch ? { ...s.ch } : undefined, stash: s.stash ? { ...s.stash } : undefined };
  deriveCh(n);
  (Object.entries(SECPAIRS) as [NumericPlanKey, NumericPlanKey][]).forEach(([a, b]) => {
    if (n[a] > n[b]) n[a] = n[b];
  });
  return n;
}

/* ---------------- number input ---------------- */

type NumInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (v: number) => void;
  /** Show 0 as an empty box and treat an empty box as 0 (printer quotes, quiz). */
  blankZero?: boolean;
  /** Size the box to its contents (the fill-in sentence). */
  fit?: boolean;
};

// Keeps what the reader is typing while the box has focus, so clearing it
// to type a new figure does not snap back to the old one. Matches the
// prototype, which left a focused number box alone until it lost focus.
function NumInput({ value, onChange, blankZero, fit, style, onFocus, onBlur, ...rest }: NumInputProps) {
  const shown = blankZero && !value ? '' : String(value);
  const [text, setText] = useState(shown);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(shown);
  }, [shown]);
  return (
    <input
      type="number"
      {...rest}
      value={text}
      style={fit ? { ...style, width: `${String(text).length + 1.2}ch` } : style}
      onFocus={(e) => { focused.current = true; onFocus?.(e); }}
      onBlur={(e) => { focused.current = false; setText(shown); onBlur?.(e); }}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === '') { if (blankZero) onChange(0); return; }
        const v = +t;
        if (Number.isFinite(v)) onChange(v);
      }}
    />
  );
}

const Html = ({ className, html }: { className?: string; html: string }) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
);

/* ---------------- the page ---------------- */

interface ModalState {
  title: string;
  help: string;
  text: string;
  mode: 'export' | 'import' | 'link';
  filename?: string;
  json?: string;
}

export function Calculator() {
  const [ready, setReady] = useState(false);
  const [S, setSRaw] = useState<Plan>(() => normalize(clone(DEFAULTS.indie)));
  const [preset, setPreset] = useState<PresetKey | null>('indie');
  const [curName, setCurName] = useState('Indie biannual');
  const [plBasis, setPlBasis] = useState<'secured' | 'projected'>('secured');
  const [plTarget, setPlTarget] = useState(0);
  const [plMix, setPlMix] = useState<Mix>(MIX0);
  const [cLow, setCLow] = useState(60);
  const [cHigh, setCHigh] = useState(125);
  const [tab, setTab] = useState<Tab>('do');
  const [quizzing, setQuizzing] = useState(false);
  const [Q, setQ] = useState<QuizState>(QUIZ_START);
  const [qi, setQi] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastOn, setToastOn] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [sc, setSc] = useState<Saved>({});
  const [cmpSel, setCmpSel] = useState<string[]>([]);
  // Email me this plan. Optional, never a gate.
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailOptIn, setMailOptIn] = useState(false);
  const [mailState, setMailState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const utmRef = useRef<Record<string, string>>({});

  const sideRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const tabtopRef = useRef<HTMLDivElement>(null);
  const sentenceRef = useRef<HTMLElement>(null);
  const quizRef = useRef<HTMLElement>(null);
  const qBodyRef = useRef<HTMLDivElement>(null);
  const modalTextRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScroll = useRef<'sentence' | 'quiz' | null>(null);

  const setS = (next: Plan) => setSRaw(normalize(next));

  function toast(msg: string) {
    setToastMsg(msg);
    setToastOn(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 1800);
  }

  /* ---- mount: shared link, stored plan, quiz state, hash ---- */
  useEffect(() => {
    let s: Plan | null = null, name: string | null = null, pr: PresetKey | null = 'indie', quiz = false;
    const params = new URLSearchParams(window.location.search);
    (['source', 'medium', 'campaign', 'term', 'content'] as const).forEach((k) => {
      const v = params.get(`utm_${k}`);
      if (v) utmRef.current[k] = v.slice(0, 200);
    });
    const shared = decodePlan(params.get('p'));
    if (shared) {
      s = shared.S; name = shared.name || 'Your plan'; pr = null;
      try { localStorage.setItem(QK, '1'); } catch { /* storage blocked */ }
    } else {
      const sv = readJSON<{ S: Plan; preset?: PresetKey | null; name?: string }>(CUR_KEY);
      if (sv && sv.S) { s = { ...clone(BASE), ...sv.S }; pr = sv.preset || null; name = sv.name || null; }
      let done = false;
      try { done = !!localStorage.getItem(QK); } catch { /* storage blocked */ }
      if (!done) quiz = true;
    }
    if (s) setSRaw(normalize(s));
    setPreset(pr);
    if (name) setCurName(name);
    setSc(readJSON<Saved>(SKEY) || {});
    const h = window.location.hash.slice(1);
    setTab(isTab(h) ? h : 'do');
    if (quiz) { setQuizzing(true); setPreset(null); }
    setReady(true);
  }, []);

  /* ---- persist the current plan ---- */
  useEffect(() => {
    if (!ready) return;
    writeJSON(CUR_KEY, { S, preset, name: curName });
  }, [S, preset, curName, ready]);

  /* ---- tabs route by hash ---- */
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1);
      const t: Tab = isTab(h) ? h : 'do';
      setTab(t);
      trackCalculatorTabView(t);
      scrollToTabsIfStuck();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const on = tabsRef.current?.querySelector('a.on');
    if (on && window.innerWidth < 961) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  // The marketing header is sticky; its height becomes --calc-top so the
  // tabs, mobile bar and side panel stick below it rather than behind it.
  const rootRef = useRef<HTMLDivElement>(null);
  const headerOffset = () => document.querySelector('.mk-header')?.getBoundingClientRect().height ?? 0;
  useEffect(() => {
    const apply = () => rootRef.current?.style.setProperty('--calc-top', `${headerOffset()}px`);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  function scrollToTabsIfStuck() {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const stickTop = parseFloat(getComputedStyle(tabs).top) || 0;
    if (tabs.getBoundingClientRect().top < stickTop + 60) {
      const top = tabtopRef.current?.getBoundingClientRect().top ?? 0;
      window.scrollTo(0, top + window.scrollY - headerOffset());
    }
  }

  useLayoutEffect(() => {
    const target = pendingScroll.current;
    if (!target) return;
    pendingScroll.current = null;
    const el = target === 'sentence' ? sentenceRef.current : quizRef.current;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - headerOffset() - 60);
  });

  useEffect(() => {
    if (!quizzing) return;
    const f = qBodyRef.current?.querySelector<HTMLInputElement>('input[type=number]');
    if (f && window.innerWidth > 960) f.focus();
  }, [quizzing, qi]);

  /* ---- plan edits ---- */
  function setField(k: NumericPlanKey, v: number) {
    const next: Plan = { ...S, [k]: v };
    const pair = SECPAIRS[k];
    if (pair && next[k] > next[pair]) next[pair] = next[k];
    const inv = (Object.entries(SECPAIRS) as [NumericPlanKey, NumericPlanKey][]).find(([, b]) => b === k);
    if (inv && next[inv[0]] > next[k]) next[inv[0]] = next[k];
    setPreset(null);
    setS(next);
  }
  function setSeg(k: FieldDef['k'], v: string) {
    setPreset(null);
    setS({ ...S, [k]: v });
  }
  function setQuote(i: number, f: 'q' | 'u', v: number) {
    const quotes = S.quotes.map((q, j) => (j === i ? { ...q, [f]: v || 0 } : q));
    setPreset(null);
    setS({ ...S, quotes });
  }
  function toggleCh(k: ChannelKey) {
    const s = normalize(S);
    const ch = { ...s.ch! };
    const stash = { ...s.stash! };
    const on = !ch[k];
    ch[k] = on;
    if (!on) {
      const parked: Record<string, number> = {};
      CHF[k].forEach((f) => { parked[f] = s[f]; s[f] = 0; });
      stash[k] = parked;
    } else {
      const kept = stash[k];
      const src: Record<string, number> = kept && CHF[k].some((f) => (kept[f] ?? 0) > 0) ? kept : (DEFAULTS.indie as unknown as Record<string, number>);
      CHF[k].forEach((f) => { s[f] = src[f]; });
    }
    setPreset(null);
    setS({ ...s, ch, stash });
  }
  function loadPreset(p: PresetKey) {
    setS(clone(DEFAULTS[p]));
    setPreset(p);
    setCurName(PRESET_NAMES[p]);
    setPlMix(MIX0);
    endQuiz();
    trackCalculatorExampleOpen(PRESET_NAMES[p]);
  }

  /* ---- quiz ---- */
  function endQuiz() {
    setQuizzing(false);
    try { localStorage.setItem(QK, '1'); } catch { /* storage blocked */ }
  }
  function startQuiz() {
    setQi(0);
    setQuizzing(true);
  }
  function quizNext() {
    if (qi === 0 && !(Q.price > 0)) return toast('Enter a cover price');
    if (qi === 1 && !(Q.pages > 0 && Q.ipy > 0)) return toast('Enter pages and issues a year');
    if (qi === 2 && !(Q.run >= 50)) return toast('Enter a print run of 50 or more');
    if (qi === 3 && !(['subs', 'single', 'spaces', 'dist'] as ChannelKey[]).some((k) => Q.ch[k])) return toast('Pick at least one way to sell copies');
    if (qi < 5) {
      if (qi === 4) {
        // Entering the last question: default the guess to 65% of the run until touched. The slider runs to the whole run.
        setQ({ ...Q, sold: Math.min(Q.touched ? Q.sold : r10(Q.run * 0.65), Q.run) });
      }
      setQi(qi + 1);
      return;
    }
    setS(fromQuiz(Q));
    setPreset(null);
    setCurName('My magazine');
    setPlMix(MIX0);
    endQuiz();
    setTab('do');
    trackCalculatorQuizComplete({ price: Q.price, pages: Q.pages, run: Q.run, issuesPerYear: Q.ipy, funding: (Object.keys(Q.fund) as FundingKey[]).filter((k) => Q.fund[k]) });
    pendingScroll.current = 'sentence';
  }
  function quizSkip() {
    setS(clone(DEFAULTS.indie));
    setPreset('indie');
    setCurName('Indie biannual');
    endQuiz();
  }
  function requiz() {
    startQuiz();
    pendingScroll.current = 'quiz';
  }

  /* ---- saved plans ---- */
  // Plans stay in memory for the session even when the browser blocks
  // storage; the toast says so and the reader can still Export.
  function saveSc(next: Saved): boolean {
    setSc(next);
    const ok = writeJSON(SKEY, next);
    if (!ok) toast('Saving is blocked in this browser. Use Export.');
    return ok;
  }
  const names = useMemo(() => Object.keys(sc).sort(), [sc]);
  const effSel = useMemo(() => {
    const kept = cmpSel.filter((n) => sc[n]);
    return kept.length ? kept : names.slice(0, 3);
  }, [cmpSel, sc, names]);

  function scenSave() {
    const n = (curName || 'Untitled plan').trim();
    setCurName(n);
    const ok = saveSc({ ...sc, [n]: { S: clone(S), saved: Date.now() } });
    if (!effSel.includes(n)) setCmpSel([...effSel, n].slice(-3));
    if (!ok) return;
    toast('Saved ' + n);
    trackCalculatorPlanSaved();
  }
  function scenDup() {
    let n = (curName || 'Plan') + ' copy', i = 2;
    while (sc[n]) n = (curName || 'Plan') + ' copy ' + i++;
    setCurName(n);
    if (saveSc({ ...sc, [n]: { S: clone(S), saved: Date.now() } })) toast('Duplicated as ' + n);
  }
  function scenLoad(n: string) {
    if (!n || !sc[n]) return;
    setS({ ...clone(BASE), ...clone(sc[n].S) });
    setCurName(n);
    setPreset(null);
  }
  function scenDel() {
    const n = curName.trim();
    if (sc[n]) {
      const next = { ...sc };
      delete next[n];
      if (saveSc(next)) toast('Deleted ' + n);
    } else toast('No saved plan named ' + n);
  }
  function scenExport() {
    const cols: [string, Plan][] = [['Current, ' + curName, S], ...names.map((n): [string, Plan] => [n, { ...clone(BASE), ...sc[n].S }])];
    const sums = cols.map((c) => planSummary(c[1])), keys = Object.keys(sums[0]);
    const csv = ['Metric,' + cols.map((c) => '"' + c[0].replace(/"/g, '""') + '"').join(','), ...keys.map((k) => '"' + k + '",' + sums.map((s) => '"' + s[k] + '"').join(','))].join('\n');
    const json = JSON.stringify({ tool: 'Neesh magazine economics calculator', exported: new Date().toISOString(), plans: [{ name: curName, S }, ...names.map((n) => ({ name: n, S: sc[n].S }))] }, null, 1);
    setModal({ title: 'Export', help: 'Every plan as a CSV. To move plans to another browser, press Show JSON and import that file there.', text: csv, mode: 'export', filename: 'neesh-magazine-plans.csv', json });
  }
  function scenImport() {
    setModal({ title: 'Import plans', help: 'Paste the JSON this calculator exported.', text: '', mode: 'import' });
  }
  function applyImport() {
    try {
      const o = JSON.parse(modal?.text || '') as { plans?: unknown[] } & Record<string, unknown>;
      const next = { ...sc };
      let n = 0;
      ((o.plans || [o]) as { S?: Plan; name?: string }[]).forEach((p) => {
        if (p && p.S) { next[p.name || 'Imported ' + (n + 1)] = { S: p.S, saved: Date.now() }; n++; }
      });
      const ok = saveSc(next);
      setModal(null);
      if (ok) toast(`Imported ${n} plan${n === 1 ? '' : 's'}`);
    } catch {
      toast('Paste the JSON this calculator exported');
    }
  }
  async function copyLink() {
    const url = shareUrl(S, curName);
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
      trackCalculatorLinkCopied();
    } catch {
      setModal({ title: 'Copy link', help: 'Copy this link. It opens your plan on any device.', text: url, mode: 'link' });
    }
  }
  async function modalCopy() {
    try {
      await navigator.clipboard.writeText(modal?.text || '');
      toast('Copied');
    } catch {
      modalTextRef.current?.select();
      toast('Select all and copy');
    }
  }
  const downloadHref = useMemo(() => {
    if (!modal || modal.mode !== 'export' || !modal.filename) return '';
    try {
      return URL.createObjectURL(new Blob([modal.text], { type: modal.filename.endsWith('.csv') ? 'text/csv' : 'application/json' }));
    } catch {
      return '';
    }
  }, [modal]);
  useEffect(() => () => { if (downloadHref) URL.revokeObjectURL(downloadHref); }, [downloadHref]);

  /* ---- email me this plan ---- */
  async function sendPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailTo)) { setMailState('error'); return; }
    setMailState('busy');
    try {
      const { stash: _stash, ...plan } = S;
      void _stash;
      const res = await fetch('/api/calculator/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mailTo, name: curName, plan, newsletter: mailOptIn, utm: utmRef.current, firstTouch: readFirstTouch() ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { sent?: boolean };
      if (res.ok && data.sent) {
        setMailState('done');
        trackCalculatorPlanEmailed(mailOptIn);
      } else setMailState('error');
    } catch {
      setMailState('error');
    }
  }

  /* ---- sheet and refine ---- */
  function refine() {
    if (window.innerWidth < 961) setSheetOpen(true);
    else {
      const sd = sideRef.current;
      if (!sd) return;
      sd.scrollTop = 0;
      sd.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
    }
  }

  /* ---- derived figures ---- */
  const m = model(S), ms = model(securedState(S)), c = cash(S), be = breakEven(S), P = S.price, band = bandFor(S.pages);
  const over = m.allocated - S.run;
  const need = -c.low;
  const est = estPrint(S, S.run), fit = quoteFit(S);
  const perIssue = S.subPrice / Math.max(1, S.ipy), netIssue = perIssue - S.subPost;
  const spaceGross = 1 - S.wPct / 100, spaceNet = (P * spaceGross - S.spaceShip) / P;
  const allPos = P < 20 ? 'below most of' : P > 30 ? 'above most of' : 'in the middle of';
  const hints: Record<string, string> = {
    quoteHint: !fit
      ? 'Enter at least one quote. Two or more let the calculator price any run size.'
      : fit.n === 1
        ? `With one quote, every run is priced at <b>${fmt(fit.a, 2)}</b> a copy. Add a second quantity to capture setup cost.`
        : `From ${fit.n} quotes, about <b>${fmt(fit.b, 0)}</b> setup plus <b>${fmt(fit.a, 2)}</b> a copy. At ${fmtN(S.run)} copies, <b>${fmt(m.pu, 2)}</b> each.`,
    bindHint: S.printMode === 'quotes'
      ? ''
      : (S.binding === 'saddle' && S.pages > 80 ? '<b>Saddle stitch tops out around 64 to 80 pages.</b> Past that, use perfect binding. ' : '') +
        `About <b>${fmt(est.u, 2)}</b> a copy for ${fmtN(S.run)} copies, printed ${est.m}. An estimate until you have a quote.`,
    priceHint: `The median across 156 indie titles on US shelves is <b>$25</b>. Half sit between <b>$20 and $30</b>. You’re ${allPos} the shelf.`,
    subHint: `<b>${fmt(perIssue, 2)}</b> an issue, ${fmt(netIssue, 2)} after postage, ${netIssue <= P ? pct(1 - netIssue / P) + ' under' : pct(netIssue / P - 1) + ' over'} your cover.`,
    wHint: `The median on Neesh is <b>50%</b>. Half sit between 50 and 60%. The space keeps <b>${pct(spaceGross)}</b> of cover, <b>${pct(spaceNet)}</b> after the shipping it pays.`,
    viaHint: S.via === 'neesh' ? 'Neesh takes 10% of each order. Spaces find you there, pay at checkout and pay shipping.' : 'No platform fee. You find the spaces, invoice them and wait to be paid.',
  };
  const warnings: string[] = [];
  if (spaceNet < 0.25 && S.wCopies > 0) warnings.push(`Spaces keep ${pct(spaceNet)} of cover after shipping. Few reorder under 25%. Raise your cover price before you cut wholesale.`);
  if (S.binding === 'saddle' && S.pages > 80 && S.printMode === 'est') warnings.push('Saddle stitch rarely holds past 80 pages. Your print estimate is low.');
  if (S.xCopies > 0 && S.xTerms >= 90) warnings.push(`Distributor money lands around day ${S.xTerms}. Budget your next print deposit without it.`);

  const recs = recCandidates(S);
  const lo = clamp((cLow || 60) / 100, 0, 1), hi = clamp((cHigh || 125) / 100, 1, 3);
  const cases = caseSet(S, lo, hi).map(([n, st]) => {
    const cm = model(st), cc = cash(st);
    return { n, m: cm, need: Math.max(0, -cc.low), sold: cm.sold, unsold: cm.unsold };
  });
  const [loC, exC, hiC] = cases;
  const pc = perCopy(S);
  const sign = (v: number) => (v < 0 ? 'neg' : '');

  const chOn = S.ch!;

  /* ---------------- render helpers ---------------- */

  function renderField(f: FieldDef) {
    const hidden = f.showIf && !f.showIf(S);
    const style = hidden ? { display: 'none' } : undefined;
    if (f.type === 'seg') {
      return (
        <div className="cfield" key={f.k} style={style}>
          <label><span>{f.l}</span></label>
          <div className="seg">
            {f.opts.map(([v, l]) => (
              <button key={v} type="button" className={S[f.k] === v ? 'on' : undefined} onClick={() => setSeg(f.k, v)}>{l}</button>
            ))}
          </div>
          {f.k === 'via' && <div className="hint">{hints.viaHint}</div>}
          {f.k === 'printMode' && <Html className="hint" html={hints.bindHint} />}
        </div>
      );
    }
    if (f.type === 'quotes') {
      return (
        <div className="cfield" key={f.k} style={style}>
          <label><span>{f.l}<span className="tag quote">Yours</span></span></label>
          <table className="qtable">
            <tbody>
              <tr><td className="mono" style={{ fontSize: 10 }}>Copies</td><td className="mono" style={{ fontSize: 10 }}>Per copy $</td></tr>
              {[0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td><NumInput blankZero min={0} step={50} value={S.quotes[i]?.q ?? 0} onChange={(v) => setQuote(i, 'q', v)} aria-label={`Quote ${i + 1} copies`} /></td>
                  <td><NumInput blankZero min={0} step={0.05} value={S.quotes[i]?.u ?? 0} onChange={(v) => setQuote(i, 'u', v)} aria-label={`Quote ${i + 1} per copy`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Html className="hint" html={hints.quoteHint} />
        </div>
      );
    }
    const hint = f.hint ? (DYNAMIC_HINTS.has(f.hint) ? hints[f.hint] : f.hint) : '';
    return (
      <div className="cfield" key={f.k} style={style}>
        <label>
          <span>
            {f.l}
            {f.tag && <span className={`tag ${f.tag}`}>{BENCH_TYPE_LABEL[f.tag]}</span>}
            {f.secured && <span className="tag conf">Confirmed</span>}
          </span>
        </label>
        <div className="row">
          <input type="range" min={f.min} max={f.max} step={f.step} value={S[f.k]} onChange={(e) => setField(f.k, +e.target.value)} aria-label={f.l} />
          <NumInput min={0} step={f.step} value={S[f.k]} onChange={(v) => setField(f.k, v)} aria-label={f.l} />
        </div>
        {hint && <Html className="hint" html={hint} />}
      </div>
    );
  }

  function renderInputs() {
    const issue = GROUPS.find((g) => g.id === 'issue')!;
    return (
      <>
        <div className="setup">
          <span className="mono">The basics</span>
          {issue.fields.map(renderField)}
          <div className="cfield" style={{ marginBottom: 0 }}>
            <label><span>How you sell</span></label>
            {CHIPS.map(([h, cs]) => (
              <div className="chipg" key={h}>
                <span className="mono">{h}</span>
                <div className="chips">
                  {cs.map(([k, l]) => (
                    <button key={k} type="button" className={`cchip ${chOn[k] ? 'on' : ''}`} onClick={() => toggleCh(k)}>{l}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {GROUPS.filter((g) => g.id !== 'issue').map((g) => {
          const adv = g.fields.filter((f) => f.adv);
          return (
            <details key={g.id} open={g.open || undefined} style={g.ch && !chOn[g.ch] ? { display: 'none' } : undefined}>
              <summary>
                <h3>{g.title}</h3>
                <span className="mono">{g.sub} <span className="chev">+</span></span>
              </summary>
              <div className="fbody">
                {g.fields.filter((f) => !f.adv).map(renderField)}
                {adv.length > 0 && (
                  <details className="refine">
                    <summary><span className="chev">+</span> More</summary>
                    {adv.map(renderField)}
                  </details>
                )}
              </div>
            </details>
          );
        })}
      </>
    );
  }

  function renderQuiz() {
    const steps = [
      { h: 'What does one copy cost?', hint: 'Most indie titles on US shelves cost $20 to $30. The median is $25.' },
      { h: 'How many pages, and how many issues a year?', hint: 'Most indie titles come out two to four times a year.' },
      { h: 'How many copies will you print?', hint: 'Most indies start at 1,000 to 2,000.' },
      { h: 'How will you sell it?', hint: 'Pick every one that applies. You can change it later.' },
      { h: 'Where else will money come from?', hint: 'Pick whichever you are planning to see how they affect the run.' },
      { h: 'How many will you sell?', hint: 'Your best guess. You will also see a slow case and a strong one.' },
    ];
    const q = steps[qi];
    const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') quizNext(); };
    const setQk = (k: 'price' | 'pages' | 'ipy' | 'run') => (v: number) => setQ({ ...Q, [k]: v || 0 });
    const mx = Q.run;
    return (
      <section className="quiz" ref={quizRef}>
        <div className="qprog">{steps.map((_, i) => <i key={i} className={i <= qi ? 'on' : undefined} />)}</div>
        <span className="mono acc">Question {qi + 1} of {steps.length}</span>
        <h2>{q.h}</h2>
        <div ref={qBodyRef}>
          {qi === 0 && <label className="qin">$ <NumInput blankZero min={1} step={1} value={Q.price} onChange={setQk('price')} onKeyDown={onKey} /></label>}
          {qi === 1 && (
            <>
              <label className="qin"><NumInput blankZero min={8} step={4} value={Q.pages} onChange={setQk('pages')} onKeyDown={onKey} /> pages</label>
              <label className="qin"><NumInput blankZero min={1} max={12} step={1} value={Q.ipy} onChange={setQk('ipy')} onKeyDown={onKey} /> issues a year</label>
            </>
          )}
          {qi === 2 && <label className="qin"><NumInput blankZero min={50} step={50} value={Q.run} onChange={setQk('run')} onKeyDown={onKey} /> copies</label>}
          {qi === 3 && QUIZ_COPY_CHIPS.map(([h, cs]) => (
            <div className="chipg" key={h}>
              <span className="mono">{h}</span>
              <div className="chips">
                {cs.map(([k, l]) => (
                  <button key={k} type="button" className={`cchip ${Q.ch[k] ? 'on' : ''}`} onClick={() => setQ({ ...Q, ch: { ...Q.ch, [k]: !Q.ch[k] } })}>{l}</button>
                ))}
              </div>
            </div>
          ))}
          {qi === 4 && (
            <>
              <div className="chipg">
                <div className="chips">
                  {FUNDING_CHIPS.map(([k, l]) => (
                    <button key={k} type="button" className={`cchip ${Q.fund[k] ? 'on' : ''}`} onClick={() => setQ({ ...Q, fund: { ...Q.fund, [k]: !Q.fund[k] } })}>{l}</button>
                  ))}
                </div>
              </div>
              {Q.fund.ads && <label className="qin">$ <NumInput blankZero min={0} step={50} value={Q.adRate} onChange={(v) => setQ({ ...Q, adRate: v || 0 })} onKeyDown={onKey} aria-label="Rate per ad page" style={{ width: 130 }} /> per ad page</label>}
              {Q.fund.grants && <label className="qin">$ <NumInput blankZero min={0} step={250} value={Q.grant} onChange={(v) => setQ({ ...Q, grant: v || 0 })} onKeyDown={onKey} aria-label="Confirmed grant money" style={{ width: 130 }} /> in confirmed grants</label>}
            </>
          )}
          {qi === 5 && (
            <>
              <div className="qsold"><b>{fmtN(Q.sold)}</b> copies, <span>{pct(Q.sold / Q.run)}</span> of your run</div>
              <input type="range" min={0} max={mx} step={10} value={Q.sold} style={{ width: '100%' }} aria-label="Copies you will sell" onChange={(e) => setQ({ ...Q, sold: +e.target.value, touched: true })} />
            </>
          )}
        </div>
        <p className="small">{q.hint}</p>
        <div className="qnav">
          {qi > 0 && <button type="button" className="sbtn" onClick={() => setQi(qi - 1)}>Back</button>}
          <button type="button" className="btn" onClick={quizNext}>{qi === steps.length - 1 ? 'See the numbers' : 'Next'}</button>
          <button type="button" className="qskip" onClick={quizSkip}>Skip to an example</button>
        </div>
      </section>
    );
  }

  function renderRecs() {
    return (
      <table>
        <tbody>
          {recs.length ? (
            <>
              <tr><th>Change</th><th>Profit</th><th>Cash needed</th></tr>
              {recs.map((x, i) => (
                <tr key={x.title}>
                  <td className="t"><b>{i + 1}. {x.title}</b><br /><span style={{ color: 'var(--grey)', fontSize: 12.5 }}>{x.why}</span></td>
                  <td><b>+{fmt(x.d)}</b></td>
                  <td className={x.dc >= 0 ? 'pos' : 'neg'}>{Math.abs(x.dc) < 1 ? '' : x.dc > 0 ? '−' + fmt(x.dc) : '+' + fmt(-x.dc)}</td>
                </tr>
              ))}
            </>
          ) : (
            <tr><td className="t">Nothing obvious left to change. Price, run and channels are doing their job.</td></tr>
          )}
        </tbody>
      </table>
    );
  }

  function renderPlanner() {
    const base = plBasis === 'secured' ? securedState(S) : S;
    const mb = model(base), target = plTarget || 0;
    const gap = target - mb.profit, inv = Math.max(0, S.run - mb.allocated), L = leverValues(S);
    const copiesAtCover = mb.copiesBy.single * (1 - S.feePct / 100) + ((mb.copiesBy.space + mb.copiesBy.bulk) * S.wPct / 100) * (S.via === 'neesh' ? 0.9 : 1) + (mb.xSold * S.xPct) / 100;
    // A lever with no figure cannot close the gap (nothing sold at cover yet,
    // or a subscription that loses money per copy), so it is left out rather
    // than shown with a blank number.
    const card = (k: string, val: string, p: string, flag = '') => val ? (
      <div className="card" key={k}><span className="mono">{k}</span><div className="k">{val}</div><p>{p}</p>{flag ? <div className="flag">{flag}</div> : null}</div>
    ) : null;
    let cards: React.ReactNode = null;
    if (gap > 0) {
      const ns = L.sub > 0 ? Math.ceil(gap / L.sub) : Infinity, nst = L.stockist > 0 ? Math.ceil(gap / L.stockist) : Infinity, ng = L.single > 0 ? Math.ceil(gap / L.single) : Infinity;
      const dp = copiesAtCover > 0 ? gap / copiesAtCover : Infinity;
      cards = [
        card('More subscribers', isFinite(ns) ? '+' + fmtN(ns) : '', `Each adds ${fmt(L.sub, 2)} this issue after postage and fees.`, ns > inv ? `Needs ${fmtN(ns - inv)} more copies than you have unsold.` : ''),
        card('More spaces', isFinite(nst) ? '+' + fmtN(nst) : '', `Each order of ${S.wCpo} copies adds ${fmt(L.stockist)}.`, nst * S.wCpo > inv ? `Needs ${fmtN(nst * S.wCpo - inv)} more copies than you have unsold.` : ''),
        card('Sponsorship', fmt(gap), 'Signed ads or partners, dollar for dollar.'),
        card('More single copies', isFinite(ng) ? '+' + fmtN(ng) : '', `Each adds ${fmt(L.single, 2)} after fees and packing.`, ng > inv ? `Needs ${fmtN(ng - inv)} more copies than you have unsold.` : ''),
        card('Higher cover price', isFinite(dp) ? '+' + fmt(dp, 2) : '', `On copies sold at cover or wholesale. Subscriptions stay put.`, isFinite(dp) && dp > P * 0.5 ? `Takes you to ${fmt(P + dp, 2)}. Too far on price alone.` : isFinite(dp) && P + dp > 30 ? `Takes you to ${fmt(P + dp, 2)}, above most of the shelf.` : ''),
      ];
    }
    const s2: Plan = { ...base, subs: base.subs + plMix.subs, wCopies: base.wCopies + plMix.stockists * S.wCpo, dCopies: base.dCopies + plMix.singles, events: base.events, adPages: base.adPages, price: S.price + plMix.price };
    const m2 = model(s2), sponsorProfit = m2.profit + plMix.sponsor;
    const extraCopies = m2.allocated - S.run;
    const sl = (k: keyof Mix, l: string, max: number, step: number, unit?: string) => (
      <div className="cfield" style={{ margin: 0 }} key={k}>
        <label><span>{l}</span><span className="mono" style={{ fontSize: 12 }}>{unit === '$' ? fmt(plMix[k]) : '+' + fmtN(plMix[k])}</span></label>
        <input type="range" min={0} max={max} step={step} value={plMix[k]} style={{ width: '100%' }} aria-label={l} onChange={(e) => setPlMix({ ...plMix, [k]: +e.target.value })} />
      </div>
    );
    return (
      <>
        <div className="row wrapr">
          <div className="seg" style={{ minWidth: 260 }}>
            <button type="button" className={plBasis === 'secured' ? 'on' : undefined} onClick={() => setPlBasis('secured')}>Confirmed money</button>
            <button type="button" className={plBasis === 'projected' ? 'on' : undefined} onClick={() => setPlBasis('projected')}>Full plan</button>
          </div>
          <label className="row inl">Target profit $ <NumInput step={100} value={plTarget} onChange={setPlTarget} /></label>
        </div>
        <p className="lead" style={{ marginTop: 12 }}>
          {gap <= 0 ? (
            <>{plBasis === 'secured' ? 'Confirmed money' : 'The full plan'} already clears your target by <b>{fmt(-gap)}</b>. Use the sliders to test more.</>
          ) : (
            <>{plBasis === 'secured' ? 'On confirmed money' : 'On the full plan'} you’re <b>{fmt(gap)}</b> short of {target ? fmt(target) + ' profit' : 'break-even'}. Any one of these closes the gap. You have <b>{fmtN(inv)}</b> copies unsold.</>
          )}
        </p>
        <div className="cards">{cards}</div>
        <div className="planner">
          <div className="mono" style={{ gridColumn: '1/-1', color: 'var(--grey)', marginBottom: 4 }}>Combine them</div>
          {sl('subs', 'Extra subscribers', 1000, 10)}
          {sl('stockists', 'Extra spaces', 100, 1)}
          {sl('singles', 'Extra single copies', 2000, 10)}
          {sl('sponsor', 'Extra sponsorship', 20000, 250, '$')}
          <div className="cfield" style={{ margin: 0 }}>
            <label><span>Raise cover price</span><span className="mono" style={{ fontSize: 12 }}>+{fmt(plMix.price, 0)}</span></label>
            <input type="range" min={0} max={20} step={1} value={plMix.price} style={{ width: '100%' }} aria-label="Raise cover price" onChange={(e) => setPlMix({ ...plMix, price: +e.target.value })} />
          </div>
          <div className="res">
            <span>
              Profit with these changes{' '}
              <span className="small" style={{ display: 'block', margin: 0 }}>
                {extraCopies > 0 ? <span className="neg">Needs {fmtN(extraCopies)} more copies than you print.</span> : `${fmtN(-extraCopies)} copies still unsold.`}
              </span>
            </span>
            <span className={`num ${sponsorProfit >= target ? 'pos' : 'neg'}`}>{fmt(sponsorProfit)}</span>
          </div>
        </div>
      </>
    );
  }

  function renderCash() {
    return (
      <div className="cash">
        {c.stages.map((st) => (
          <div key={st.n}>
            <span className="mono">{st.n}</span>
            <div className={`amt ${st.total >= 0 ? 'pos' : 'neg'}`}>{st.total >= 0 ? '+' : ''}{fmt(st.total)}</div>
            <div className="cum">Running total {fmt(st.cum)}</div>
            <ul>
              {st.items.length ? st.items.map((i) => <li key={i[0]}><span>{i[0]}</span><span>{fmt(i[1])}</span></li>) : <li>Nothing yet</li>}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  function renderChannels() {
    const rows: [string, keyof typeof m.R][] = [['Subscribers', 'sub'], ['Single copies', 'single'], ['Spaces', 'space'], ['Brand bulk', 'bulk'], ['Distributor', 'dist'], ['Ads', 'ads'], ['Launch partners', 'events'], ['Grants', 'grant']];
    let tot = 0;
    const body: React.ReactNode[] = [];
    rows.forEach(([l, k]) => {
      const rev = m.R[k], cost = m.V[k], copies = (m.copiesBy as Record<string, number>)[k] || 0, pr = copies * m.unit, con = rev - cost - pr;
      if (rev === 0 && copies === 0) return;
      tot += con;
      const cl = k === 'dist' ? `${fmtN(copies)} shipped, ${fmtN(m.xSold)} sold` : fmtN(copies);
      body.push(
        <tr key={k}><td className="t">{l}</td><td>{copies ? cl : ''}</td><td>{fmt(rev)}</td><td>{fmt(-cost)}</td><td>{pr ? fmt(-pr) : ''}</td><td className={sign(con)}>{fmt(con)}</td><td className={sign(con)}>{rev > 0 ? pct(con / rev) : ''}</td></tr>
      );
    });
    const unsoldPrint = (m.run - m.allocated) * m.unit, compsPrint = S.comps * m.unit;
    return (
      <table>
        <tbody>
          <tr><th>Channel</th><th>Copies</th><th>Revenue</th><th>Channel costs</th><th>Print cost</th><th>Left over</th><th>Margin</th></tr>
          {body}
          <tr className="sub"><td className="t">All channels</td><td /><td /><td /><td /><td>{fmt(tot)}</td><td /></tr>
          <tr><td className="t">Copies with no buyer</td><td>{fmtN(m.run - m.allocated)}</td><td /><td /><td>{fmt(-unsoldPrint)}</td><td className="neg">{fmt(-unsoldPrint)}</td><td /></tr>
          <tr><td className="t">Comps and press</td><td>{fmtN(S.comps)}</td><td /><td /><td>{fmt(-compsPrint)}</td><td className="neg">{fmt(-compsPrint)}</td><td /></tr>
          <tr className="sub"><td className="t">Profit before fixed costs</td><td /><td /><td /><td /><td className={sign(m.gross)}>{fmt(m.gross)}</td><td>{m.revenue > 0 ? pct(m.gross / m.revenue) : ''}</td></tr>
          <tr><td className="t">Fixed costs</td><td /><td /><td /><td /><td className="neg">{fmt(-m.fixed)}</td><td /></tr>
          <tr className="total"><td className="t">Profit</td><td /><td /><td /><td /><td className={m.profit < 0 ? 'neg' : 'pos'}>{fmt(m.profit)}</td><td>{m.revenue > 0 ? pct(m.profit / m.revenue) : ''}</td></tr>
        </tbody>
      </table>
    );
  }

  function renderBars() {
    const mx = Math.max(S.price, pc.sub.g);
    const col: Record<string, string> = { print: 'var(--c-print)', fees: 'var(--c-fees)', shop: 'var(--c-shop)', dist: 'var(--c-dist)', you: 'var(--c-you)' };
    const rows: ({ g: string; c: string } | { n: string; note: string; d: typeof pc.sub })[] = [
      { g: 'Sell it yourself', c: 'direct' },
      { n: 'To a subscriber', note: 'one issue of a subscription', d: pc.sub },
      { n: 'To a reader', note: 'one copy from your shop', d: pc.single },
      { n: 'To a space', note: S.via === 'neesh' ? 'through Neesh' : 'invoiced yourself', d: pc.space },
      { g: 'Through a distributor', c: '' },
      { n: 'To a distributor', note: `per copy shipped, at ${S.xSell}% sell-through`, d: pc.dist },
    ];
    return (
      <div className="bars">
        {rows.map((r) => {
          if ('g' in r) return <div className={`bar-group ${r.c}`} key={r.g}>{r.g}</div>;
          const you = youPart(r.d);
          return (
            <div className="bar-row" key={r.n}>
              <div className="lbl">
                <span>{r.n} <span style={{ fontWeight: 400, color: 'var(--grey)' }}>· {r.note}</span></span>
                <span className={sign(you)}>You keep {fmt(you, 2)}</span>
              </div>
              <div className="bar">
                {r.d.parts.filter((p) => p[1] > 0).map(([k, v]) => {
                  const w = (v / mx) * 100;
                  return <div key={k} style={{ width: `${w}%`, background: col[k], color: k === 'shop' || k === 'dist' ? '#333' : '#fff' }}>{w > 9 ? fmt(v, 2) : ''}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderReader() {
    const yr = youPart(pc.sub) * S.ipy, r = S.subRenew / 100, life = yr / (1 - r), one = youPart(pc.single), ratio = one > 0 ? yr / one : null;
    return (
      <div className="callout">
        <div>
          <span className="mono">A subscriber, one year</span>
          <div className={`k ${sign(yr)}`}>{fmt(yr)}</div>
          <p>{S.ipy} issue{S.ipy > 1 ? 's' : ''} after print, postage and fees, paid up front. At {S.subRenew}% renewal, our estimate, that reader is worth about <b>{fmt(life)}</b> over time.</p>
        </div>
        <div>
          <span className="mono">The same reader buying one copy</span>
          <div className={`k ${sign(one)}`}>{fmt(one)}</div>
          <p>
            {ratio && ratio > 1
              ? <>A single sale can keep more per copy. A subscriber earns <b>{ratio.toFixed(1)}×</b> as much in a year, pays first and tells you how many to print.</>
              : 'Raise the subscription price or cut postage until a subscriber beats a single sale over a year.'}
          </p>
        </div>
      </div>
    );
  }

  function renderPrice() {
    const mx = Math.max(...HIST.map((h) => h.n));
    const spaceVerdict = spaceNet >= 0.4 ? 'Healthy. Most spaces expect 40 to 50%.' : spaceNet >= 0.25 ? 'Workable. Most spaces expect 40 to 50%.' : 'Too thin. Few spaces reorder under 25%.';
    return (
      <>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, borderBottom: '1px solid var(--ink)' }}>
            {HIST.map((h) => {
              const me = P >= h.lo && P < h.hi;
              return (
                <div key={h.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ font: "500 10px 'IBM Plex Mono',monospace", textAlign: 'center', marginBottom: 4, color: me ? 'var(--accent)' : 'var(--grey)' }}>{me ? 'YOU · ' : ''}{h.n}</div>
                  <div style={{ height: (h.n / mx) * 120, background: me ? 'var(--accent)' : 'var(--ink)' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {HIST.map((h) => <div key={h.l} style={{ flex: 1, textAlign: 'center', font: "500 10px 'IBM Plex Mono',monospace", color: 'var(--grey)' }}>{h.l}</div>)}
          </div>
        </div>
        <p className="small">Shelf prices of 156 independent titles sold in the US, collected Nov 17, 2026. No mainstream newsstand titles. Your price is marked.</p>
        <div className="sub-h mono">By page count</div>
        <div className="price-guide">
          {BANDS.map((b) => (
            <div className={`pg ${b === band ? 'me' : ''}`} key={b.name}><span className="mono">{b.name}</span><div className="k">{fmt(b.med, b.med % 1 ? 2 : 0)}</div><p>{fmt(b.p25)} to {fmt(b.p75)} · {b.n} listings</p></div>
          ))}
        </div>
        <p className="small">From 41 Neesh listings with page counts. The range is the middle half. Small samples, so use it as a guide.</p>
        <div className="sub-h mono">What a space keeps</div>
        <div className="cards">
          <div className="card"><span className="mono">Space’s share of cover</span><div className="k">{pct(spaceGross)}</div><p>What a space keeps before its costs at {S.wPct}% wholesale.</p></div>
          <div className="card"><span className="mono">After the shipping it pays</span><div className={`k ${spaceNet < 0.25 ? 'neg' : ''}`}>{pct(spaceNet)}</div><p>{spaceVerdict}</p></div>
          <div className="card"><span className="mono">What you keep per copy</span><div className="k">{fmt(youPart(pc.space), 2)}</div><p>After print, freight, fees and packing.</p></div>
        </div>
      </>
    );
  }

  function renderChart() {
    const W = 700, H = 260, L = 64, R = 16, T = 16, B = 36;
    const sellable = S.run - S.comps;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([t * sellable, heatProfit(S, S.run, t)]); }
    const ys = pts.map((p) => p[1]);
    const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 0), span = yMax - yMin || 1;
    const xs = (v: number) => L + Math.min(1, v / Math.max(1, sellable)) * (W - L - R), yy = (v: number) => T + ((yMax - v) / span) * (H - T - B);
    const cross = pts.findIndex((p) => p[1] >= 0);
    let bx: number | null = null;
    if (cross > 0) { const a = pts[cross - 1], b = pts[cross]; bx = a[0] + ((0 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]); }
    const cx = xs(m.sold), cy = yy(m.profit);
    return (
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Profit as more copies sell">
        <line x1={L} x2={W - R} y1={yy(0)} y2={yy(0)} stroke="#000" />
        {([[yMax, '#5c5c5c'], [yMin, '#5c5c5c'], [0, '#000']] as [number, string][]).map(([v, c2], i) => (
          <text key={i} x={L - 8} y={yy(v) + 4} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={10} fill={c2}>{fmt(v)}</text>
        ))}
        <text x={L} y={H - 10} fontFamily="IBM Plex Mono" fontSize={10} fill="#5c5c5c">0 SOLD</text>
        <text x={W - R} y={H - 10} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={10} fill="#5c5c5c">{fmtN(sellable)} SOLD, EVERY COPY YOU CAN SELL</text>
        {bx !== null && (
          <>
            <line x1={xs(bx)} x2={xs(bx)} y1={T} y2={H - B} stroke="#7D3BBF" strokeDasharray="3 3" />
            <text x={xs(bx) + 6} y={T + 10} fontFamily="IBM Plex Mono" fontSize={10} fill="#7D3BBF">BREAK-EVEN {fmtN(bx)}</text>
          </>
        )}
        <path d={pts.map((p, i) => (i ? 'L' : 'M') + xs(p[0]).toFixed(1) + ' ' + yy(p[1]).toFixed(1)).join(' ')} fill="none" stroke="#000" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={5} fill="#7D3BBF" />
        <text x={Math.min(cx + 8, W - 110)} y={cy + 18} fontFamily="IBM Plex Mono" fontSize={10}>YOUR PLAN</text>
      </svg>
    );
  }

  function renderHeat() {
    const runs = [...new Set([500, 1000, 1500, 2000, 3000, 5000, S.run])].sort((a, b) => a - b);
    const cur = Math.min(1, m.sold / Math.max(1, S.run - S.comps));
    const cols = [...new Set([0.3, 0.5, 0.7, 0.9].filter((x) => Math.abs(x - cur) > 0.005).concat([cur]))].sort((a, b) => a - b);
    const vals = runs.map((r) => cols.map((t) => heatProfit(S, r, t)));
    const mx = Math.max(1, ...vals.flat().map(Math.abs));
    return (
      <table className="heat">
        <tbody>
          <tr><th>Print run</th>{cols.map((t) => <th key={t}>{Math.round(t * 100)}% sold{t === cur ? ' · plan' : ''}</th>)}</tr>
          {runs.map((r, i) => (
            <tr key={r}>
              <td>{fmtN(r)}{r === S.run ? ' · plan' : ''}</td>
              {cols.map((t, j) => {
                const v = vals[i][j], a = Math.min(1, Math.abs(v) / mx) * 0.55 + 0.06;
                return (
                  <td key={t} className={r === S.run && t === cur ? 'cur' : undefined} style={{ background: v >= 0 ? `rgba(0,0,0,${a})` : '#fff', color: v < 0 ? '#5c5f6b' : a > 0.42 ? '#fff' : '#000' }}>{fmt(v)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderPL() {
    const R: [string, keyof typeof m.R][] = [['Subscribers', 'sub'], ['Single copies', 'single'], ['Spaces', 'space'], ['Brand bulk', 'bulk'], ['Distributor, sold copies only', 'dist'], ['Ads', 'ads'], ['Launch partners', 'events'], ['Grants', 'grant']];
    const V: [string, keyof typeof m.V][] = [['Subscriber fees and postage', 'sub'], ['Single copy fees, packing and shipping', 'single'], [S.via === 'neesh' ? 'Neesh fee and fulfillment' : 'Card fees and packing for spaces', 'space'], ['Packing brand order', 'bulk'], ['Freight to distributor', 'dist']];
    const row = (l: string, a: number, b: number, cls = '') => (
      <tr className={cls || undefined} key={l}><td className="t">{l}</td><td className={sign(a)}>{fmt(a)}</td><td className={sign(b)}>{fmt(b)}</td></tr>
    );
    return (
      <table>
        <tbody>
          <tr><th /><th>Full plan</th><th>Confirmed only</th></tr>
          <tr className="sec"><td colSpan={3}>Revenue</td></tr>
          {R.filter(([, k]) => m.R[k] || ms.R[k]).map(([l, k]) => row(l, m.R[k], ms.R[k]))}
          {row('Total revenue', m.revenue, ms.revenue, 'sub')}
          <tr className="sec"><td colSpan={3}>Selling costs</td></tr>
          {V.filter(([, k]) => m.V[k] || ms.V[k]).map(([l, k]) => row(l, -m.V[k], -ms.V[k]))}
          <tr className="sec"><td colSpan={3}>Printing the whole run</td></tr>
          {row(`Printing, ${fmtN(m.run)} at ${fmt(m.pu, 2)}`, -m.pu * m.run, -ms.pu * ms.run)}
          {row('Freight in', -S.freight * m.run, -S.freight * ms.run)}
          {row('Profit before fixed costs', m.gross, ms.gross, 'sub')}
          <tr className="sec"><td colSpan={3}>Fixed costs</td></tr>
          {row('Editorial, design, photo', -S.editorial, -S.editorial)}
          {row('Launch, marketing, software', -S.otherFixed, -S.otherFixed)}
          {row('Profit', m.profit, ms.profit, 'total')}
        </tbody>
      </table>
    );
  }

  function renderCompare() {
    if (names.length < 1) return <p className="lead">Save two or more plans to compare them side by side.</p>;
    const cols: [string, Plan][] = [['Current', S], ...effSel.slice(0, 3).map((n): [string, Plan] => [n, { ...clone(BASE), ...sc[n].S }])];
    const sums = cols.map((col) => planSummary(col[1])), keys = Object.keys(sums[0]);
    const onTick = (n: string, checked: boolean) => setCmpSel(checked ? [...effSel.filter((x) => x !== n), n].slice(-3) : effSel.filter((x) => x !== n));
    return (
      <>
        <p className="lead">
          Tick up to three saved plans. Your current plan is always the first column.{' '}
          {names.map((n) => (
            <label key={n} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={effSel.includes(n)} onChange={(e) => onTick(n, e.target.checked)} /> {n}
            </label>
          ))}
        </p>
        <div className="scroll">
          <table>
            <tbody>
              <tr><th /><th>Current</th>{cols.slice(1).map((col) => <th key={col[0]}>{col[0]}</th>)}</tr>
              {keys.map((k) => (
                <tr key={k}><td className="t">{k}</td>{sums.map((s, i) => <td key={i} className={String(s[k]).startsWith('-') ? 'neg' : undefined}>{s[k]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderBench() {
    return (
      <table className="bench">
        <tbody>
          <tr><th>Benchmark</th><th>Value</th><th>Sample</th><th>Type</th><th>Source</th><th>Collected</th></tr>
          {BENCH.map((b) => (
            <tr key={b[0]}><td className="t"><b>{b[0]}</b></td><td className="t">{b[1]}</td><td>{b[2]}</td><td><span className={`tag ${b[3]}`} style={{ margin: 0 }}>{BENCH_TYPE_LABEL[b[3]]}</span></td><td className="t" style={{ color: 'var(--grey)', minWidth: 220 }}>{b[4]}</td><td>{b[5]}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }

  const tabLink = (t: Tab, label: React.ReactNode, cls = '') => (
    <a href={`#${t}`} className={`${cls} ${tab === t ? 'on' : ''}`.trim() || undefined} onClick={() => requestAnimationFrame(scrollToTabsIfStuck)}>{label}</a>
  );

  /* ---------------- markup ---------------- */

  return (
    <div className={`calc${quizzing ? ' quizzing' : ''}`} ref={rootRef}>
      {ready && !quizzing && (
        <div className="mbar">
          <span>Profit <b>{fmt(m.profit)}</b></span>
          <span>Confirmed <b>{fmt(ms.profit)}</b></span>
          <span>Cash <b>{need > 0 ? fmt(need) : '$0'}</b></span>
          <button type="button" className="sbtn dark" onClick={() => setSheetOpen(true)}>Edit</button>
        </div>
      )}
      <div className="wrap">
        <section className="hero">
          <span className="mono acc">The magazine calculator</span>
          <h1>Know what your issue makes before you print.</h1>
          <p>Answer a few questions. See your profit, the cash you need up front and what to change. Built on a year of buying, selling and shipping indie magazines.</p>
          <div className="presets">
            <span className="mono" style={{ alignSelf: 'center', color: 'var(--grey)' }}>Or start from an example</span>
            {(['zine', 'indie', 'annual', 'creator'] as PresetKey[]).map((p) => (
              <button key={p} type="button" className={`cpill ${preset === p ? 'on' : ''}`} onClick={() => loadPreset(p)}>{PRESET_NAMES[p]}</button>
            ))}
          </div>
        </section>

        {ready && quizzing && renderQuiz()}

        {ready && (
          <div className="shell">
            <div className={`backdrop ${sheetOpen ? 'open' : ''}`} onClick={() => setSheetOpen(false)} />
            <aside className={`side ${sheetOpen ? 'open' : ''} ${flash ? 'flash' : ''}`} ref={sideRef}>
              <div className="sheet-head"><span className="mono">Your numbers</span><button type="button" className="sbtn dark" onClick={() => setSheetOpen(false)}>Done</button></div>
              <div>{renderInputs()}</div>
            </aside>

            <main className={`main ${over > 0 ? 'invalid' : ''}`}>
              {over > 0 && (
                <div className="alert" style={{ display: 'block' }}>
                  <b>This plan needs {fmtN(m.allocated)} copies. You’re printing {fmtN(S.run)}.</b> Sales and comps run {fmtN(over)} copies over. Results stay hidden until the plan fits.<br />
                  <button type="button" className="sbtn dark" onClick={() => { setPreset(null); setS({ ...S, run: Math.ceil(m.allocated / 50) * 50 }); }}>Set print run to {fmtN(Math.ceil(m.allocated / 50) * 50)}</button>
                </div>
              )}
              <div className="dimmable">
                <section className="sent" ref={sentenceRef}>
                  <div className="rule" />
                  <div className="dateline"><span className="mono acc">Your magazine</span><button type="button" className="linkb mono" onClick={requiz}>Retake the quiz</button></div>
                  <p className="sline">
                    I’m printing <NumInput fit value={S.run} onChange={(v) => { if (v > 0) setField('run', v); }} aria-label="Print run" /> copies of a <NumInput fit value={S.pages} onChange={(v) => { if (v > 0) setField('pages', v); }} aria-label="Pages" />-page magazine at $<NumInput fit value={S.price} onChange={(v) => { if (v > 0) setField('price', v); }} aria-label="Cover price" />, <NumInput fit value={S.ipy} onChange={(v) => { if (v > 0) setField('ipy', v); }} aria-label="Issues a year" /> times a year, selling to{' '}
                    <span>
                      {SCH.map(([k, l], i) => (
                        <span key={k}>{i > 0 && ', '}<button type="button" className={`sch ${chOn[k] ? '' : 'off'}`} onClick={() => toggleCh(k)}>{l}</button></span>
                      ))}
                    </span>.
                  </p>
                  <div className="row wrapr"><span className="small" style={{ margin: 0 }}>Edit any number or tap a channel. Everything below updates.</span><button type="button" className="sbtn" onClick={refine}>Edit every number</button></div>
                </section>

                <section className="answer">
                  <div className="dateline" style={{ marginTop: 30 }}><span className="mono acc">The answer</span><span className="mono">{curName || 'Your plan'}</span></div>
                  <p className="verdict">{verdictFor(S)}</p>
                  <div className="figs">
                    <div className="fig"><span className="mono">Profit</span><div className={`num ${m.profit >= 0 ? 'pos' : 'neg'}`} id="o-profit">{fmt(m.profit)}</div><div className="sub">{fmt(loC.m.profit)} to {fmt(hiC.m.profit)}, slow to strong</div></div>
                    <div className="fig"><span className="mono">Confirmed only</span><div className={`num ${ms.profit >= 0 ? 'pos' : 'neg'}`}>{fmt(ms.profit)}</div><div className="sub">if no new sales come in</div></div>
                    <div className="fig"><span className="mono">Cash needed</span><div className="num">{need > 0 ? fmt(need) : '$0'}</div><div className="sub">{need > 0 ? 'before sales pay it back' : 'confirmed money covers costs'}</div></div>
                    <div className="fig"><span className="mono">Break-even</span><div className="num">{isFinite(be.copies) ? fmtN(be.copies) : 'Never'}</div><div className="sub">{!isFinite(be.copies) ? 'each copy loses money' : be.feasible ? 'copies, at your mix' : 'copies, more than you print'}</div></div>
                  </div>
                  <div className="toprec">
                    {recs[0] && (
                      <>
                        <span><span className="mono" style={{ color: 'var(--grey)', marginRight: 8 }}>Best next move</span><b>{recs[0].title}</b>, worth +{fmt(recs[0].d)}</span>
                        <a href="#do" onClick={() => requestAnimationFrame(scrollToTabsIfStuck)}>All {recs.length} moves</a>
                      </>
                    )}
                  </div>
                  <div className="mailplan">
                    {mailState === 'done' ? (
                      <span className="small" style={{ margin: 0 }} role="status">Sent. Your plan is in your inbox.</span>
                    ) : !mailOpen ? (
                      <button type="button" className="linkb mono" onClick={() => setMailOpen(true)}>Email me this plan</button>
                    ) : (
                      <form className="mailform" onSubmit={sendPlan}>
                        <input type="email" value={mailTo} onChange={(e) => { setMailTo(e.target.value); if (mailState === 'error') setMailState('idle'); }} placeholder="you@yourmagazine.com" aria-label="Email address" required autoFocus />
                        <button type="submit" className="sbtn dark" disabled={mailState === 'busy'}>Send</button>
                        <label><input type="checkbox" checked={mailOptIn} onChange={(e) => setMailOptIn(e.target.checked)} /> Join Indexed, the Neesh newsletter</label>
                        {mailState === 'error' && <span className="small" style={{ margin: 0, width: '100%' }} role="alert">That didn’t go through. Check the address and try again.</span>}
                      </form>
                    )}
                  </div>
                  {warnings.length > 0 && (
                    <div className="alert amber" style={{ display: 'block' }}>
                      {warnings.map((w, i) => <span key={i}>{i > 0 && <br />}{w}</span>)}
                    </div>
                  )}
                </section>

                <div ref={tabtopRef} />
                <nav className="tabs" ref={tabsRef}>
                  {tabLink('do', <><i>01</i>What to do</>)}
                  {tabLink('cash', <><i>02</i>Cash</>)}
                  {tabLink('channels', <><i>03</i>Channels</>)}
                  {tabLink('pricing', <><i>04</i>Pricing</>)}
                  {tabLink('scenarios', <><i>05</i>Scenarios</>)}
                  <span className="gap" />
                  {tabLink('statement', 'Statement', 'back')}
                  {tabLink('sources', 'Sources', 'back')}
                </nav>

                <section className={`tab ${tab === 'do' ? 'on' : ''}`}>
                  <header className="th"><span className="mono">01 / 05</span><h2>What to do next</h2><p>The changes that add the most profit, then what it takes to break even.</p></header>
                  <div className="sub-h mono">Ranked by profit added</div>
                  <div className="scroll">{renderRecs()}</div>
                  <div className="sub-h mono">Break-even planner</div>
                  {renderPlanner()}
                </section>

                <section className={`tab ${tab === 'cash' ? 'on' : ''}`}>
                  <header className="th">
                    <span className="mono">02 / 05</span><h2>Cash before you print</h2>
                    <p>
                      {need > 0
                        ? <>At the lowest point you’re <b>{fmt(need)}</b> out of pocket. Have that saved, raised or presold before you book the printer.</>
                        : 'Confirmed money covers every cost as it lands. You never go below zero.'}
                    </p>
                  </header>
                  {renderCash()}
                  <p className="small">Subscription money counts for this issue’s share only. Projected sales arrive after the printer is paid, so confirmed money matters most.</p>
                </section>

                <section className={`tab ${tab === 'channels' ? 'on' : ''}`}>
                  <header className="th"><span className="mono">03 / 05</span><h2>Where the money comes from</h2><p>What one copy earns by how it sells, then what each channel leaves after its own costs and the print cost of its copies.</p></header>
                  <div className="sub-h mono">What one copy earns</div>
                  {renderBars()}
                  <div className="legend">
                    <span><i style={{ background: 'var(--c-print)' }} />Print and freight</span>
                    <span><i style={{ background: 'var(--c-fees)' }} />Fees, postage, packing</span>
                    <span><i style={{ background: 'var(--c-shop)' }} />The space’s margin</span>
                    <span><i style={{ background: 'var(--c-dist)' }} />Distributor and unsold</span>
                    <span><i style={{ background: 'var(--c-you)' }} />Yours</span>
                  </div>
                  <div className="sub-h mono">What each channel leaves</div>
                  <div className="scroll">{renderChannels()}</div>
                  <div className="sub-h mono">What a reader is worth in a year</div>
                  {renderReader()}
                </section>

                <section className={`tab ${tab === 'pricing' ? 'on' : ''}`}>
                  <header className="th">
                    <span className="mono">04 / 05</span><h2>What to charge</h2>
                    <p>The median price across 156 indie titles on US shelves is <b>$25</b>. Half sit between <b>$20 and $30</b>. Price for what the object is worth to your reader, then set wholesale at <b>50 to 60%</b> of cover. At {fmt(P)} that is <b>{fmt(P * 0.5, 2)} to {fmt(P * 0.6, 2)}</b>.</p>
                  </header>
                  {renderPrice()}
                </section>

                <section className={`tab ${tab === 'scenarios' ? 'on' : ''}`}>
                  <header className="th">
                    <span className="mono">05 / 05</span><h2>If sales miss or beat the plan</h2>
                    <p>
                      From a slow launch to a strong one, this issue lands between <b className={sign(loC.m.profit)}>{fmt(loC.m.profit)}</b> and <b>{fmt(hiC.m.profit)}</b>.{' '}
                      {loC.m.profit < 0 && exC.m.profit >= 0 ? 'It works only if sales land near plan. Confirm more money before you print.' : loC.m.profit >= 0 ? 'Even the slow case covers its costs.' : 'Even the expected case loses money. Fix the plan before you print.'}
                    </p>
                  </header>
                  <div className="row wrapr" style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    <label className="row inl">Slow case, projected sales at <NumInput value={cLow} onChange={setCLow} min={0} max={100} step={5} style={{ width: 70 }} blankZero />%</label>
                    <label className="row inl">Strong case <NumInput value={cHigh} onChange={setCHigh} min={100} max={300} step={5} style={{ width: 70 }} blankZero />%</label>
                  </div>
                  <div className="scroll">
                    <table>
                      <tbody>
                        <tr><th />{cases.map((cs) => <th key={cs.n}>{cs.n}</th>)}</tr>
                        <tr><td className="t">Copies sold</td>{cases.map((cs) => <td key={cs.n}>{fmtN(cs.sold)}</td>)}</tr>
                        <tr><td className="t">Unsold or returned</td>{cases.map((cs) => <td key={cs.n}>{fmtN(cs.unsold)}</td>)}</tr>
                        <tr><td className="t">Revenue</td>{cases.map((cs) => <td key={cs.n}>{fmt(cs.m.revenue)}</td>)}</tr>
                        <tr><td className="t">Profit before fixed costs</td>{cases.map((cs) => <td key={cs.n} className={sign(cs.m.gross)}>{fmt(cs.m.gross)}</td>)}</tr>
                        <tr className="total"><td className="t">Profit</td>{cases.map((cs) => <td key={cs.n} className={cs.m.profit < 0 ? 'neg' : 'pos'}>{fmt(cs.m.profit)}</td>)}</tr>
                        <tr><td className="t">Cash needed</td>{cases.map((cs) => <td key={cs.n}>{fmt(cs.need)}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="small">Confirmed money is the same in every case. Distributor sell-through drops 15 points in the slow case and rises 10 in the strong one. Sales never exceed the print run.</p>
                  <div className="sub-h mono">Profit as copies sell</div>
                  {renderChart()}
                  <div className="sub-h mono">Print run by share sold</div>
                  <div className="scroll">{renderHeat()}</div>
                  <p className="small">Profit at each print run and share of copies sold. Darker means more profit. Distributor copies count when they sell. The outlined cell is your plan.</p>
                  <div className="sub-h mono">Saved plans</div>
                  <div className="scen">
                    <input type="text" value={curName} onChange={(e) => setCurName(e.target.value)} aria-label="Plan name" placeholder="Plan name" />
                    <button type="button" className="sbtn dark" onClick={scenSave}>Save</button>
                    <button type="button" className="sbtn" onClick={copyLink}>Copy link</button>
                    <button type="button" className="sbtn" onClick={scenDup}>Duplicate</button>
                    <select aria-label="Saved plans" value="" onChange={(e) => scenLoad(e.target.value)}>
                      <option value="">Saved plans</option>
                      {names.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button type="button" className="sbtn" onClick={scenDel}>Delete</button>
                    <button type="button" className="sbtn" onClick={scenExport}>Export</button>
                    <button type="button" className="sbtn" onClick={scenImport}>Import</button>
                  </div>
                  {renderCompare()}
                </section>

                <section className={`tab ${tab === 'statement' ? 'on' : ''}`}>
                  <header className="th"><span className="mono">Back matter</span><h2>The issue, line by line</h2><p>The full plan beside confirmed money.</p></header>
                  <div className="scroll">{renderPL()}</div>
                </section>

                <section className={`tab ${tab === 'sources' ? 'on' : ''}`}>
                  <header className="th"><span className="mono">Back matter</span><h2>Where the numbers come from</h2><p>Observed numbers come from listings and catalogs we counted. Quoted numbers are terms publishers and distributors gave us. Estimates are ours, and yours to replace. Publishers stay unnamed because they shared their terms in private.</p></header>
                  <div className="scroll">{renderBench()}</div>
                </section>
              </div>
            </main>
          </div>
        )}

        <section className="cta">
          <div>
            <span className="mono acc">Spaces are the new newsstands</span>
            <h2 style={{ marginTop: 10 }}>Neesh is where shops, cafés and hotels order from you direct.</h2>
          </div>
          <Link className="btn" href="/auth/publisher" onClick={() => trackCalculatorClaimClick()}>Claim your title</Link>
        </section>
        <div className="foot">
          <span>Planning estimates. Get real quotes before you print.</span>
        </div>
      </div>

      {modal && (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="box">
            <h3 style={{ fontSize: 24, marginBottom: 10 }}>{modal.title}</h3>
            <p className="small" style={{ margin: '0 0 10px' }}>{modal.help}</p>
            <textarea ref={modalTextRef} value={modal.text} spellCheck={false} readOnly={modal.mode !== 'import'} onChange={(e) => setModal({ ...modal, text: e.target.value })} aria-label={modal.title} />
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="sbtn dark" onClick={modalCopy}>Copy</button>
              {modal.mode === 'export' && downloadHref && <a className="sbtn" style={{ textDecoration: 'none' }} href={downloadHref} download={modal.filename}>Download</a>}
              {modal.mode === 'import' && <button type="button" className="sbtn" onClick={applyImport}>Import</button>}
              {modal.mode === 'export' && modal.json && (
                <button type="button" className="sbtn" onClick={() => setModal({ ...modal, text: modal.json!, filename: 'neesh-magazine-plans.json', json: undefined })}>Show JSON</button>
              )}
              <button type="button" className="sbtn" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <div className={`toast ${toastOn ? 'show' : ''}`} role="status">{toastMsg}</div>
    </div>
  );
}
