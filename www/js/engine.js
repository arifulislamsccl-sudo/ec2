/* EngCalc spreadsheet engine – evaluates the workbook formulas (compiled to JS) offline.
   Values: null (blank), number, string, boolean, XErr, Arr (2-D array). */
(function (root) {
  'use strict';

  class XErr { constructor(code) { this.code = code; } toString() { return this.code; } }
  const E = {
    DIV0: new XErr('#DIV/0!'), VALUE: new XErr('#VALUE!'), NA: new XErr('#N/A'),
    NUM: new XErr('#NUM!'), REF: new XErr('#REF!'), NAME: new XErr('#NAME?'),
  };
  const ERR = (c) => Object.values(E).find((e) => e.code === c) || new XErr(c);
  const isErr = (v) => v instanceof XErr;

  class Arr {
    constructor(h, w, d) { this.h = h; this.w = w; this.d = d; }
    get(r, c) { return this.d[r * this.w + c]; }
    map(f) { return new Arr(this.h, this.w, this.d.map(f)); }
  }
  const isArr = (v) => v instanceof Arr;
  const MISSING = { missing: true };

  /* ------------------------------------------------------------------ workbook state */
  let SHEETS = [];        // [{name, cells:{key:{v|f}}}]
  let FORMULAS = {};      // "s:r:c" -> function
  const inputs = {};      // "s:r:c" -> user value (overrides constant/formula)
  let memo = new Map();
  const evaluating = new Set();

  function key(s, r, c) { return s + ':' + r + ':' + c; }

  function C(s, r, c) {
    const k = key(s, r, c);
    if (Object.prototype.hasOwnProperty.call(inputs, k)) return inputs[k];
    if (memo.has(k)) return memo.get(k);
    const f = FORMULAS[k];
    let v;
    if (f) {
      if (evaluating.has(k)) return E.REF; // circular guard
      evaluating.add(k);
      try { v = f(); } catch (e) { v = (e instanceof XErr) ? e : E.VALUE; if (!(e instanceof XErr)) console.error(k, e); }
      evaluating.delete(k);
      if (isArr(v)) v = v.d.length ? v.d[0] : null;
      if (v === MISSING) v = null;
      if (typeof v === 'number' && !isFinite(v)) v = E.NUM;
      // a formula that points at a blank cell shows 0
      if (v === null) v = 0;
    } else {
      const cell = SHEETS[s] && SHEETS[s].cells[r + ',' + c];
      v = cell === undefined ? null : cell;
    }
    memo.set(k, v);
    return v;
  }

  function R(s, r1, c1, r2, c2) {
    const h = r2 - r1 + 1, w = c2 - c1 + 1, d = new Array(h * w);
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) d[i * w + j] = C(s, r1 + i, c1 + j);
    return new Arr(h, w, d);
  }

  /* ------------------------------------------------------------------ coercion */
  function round15(x) { return x === 0 || !isFinite(x) ? x : Number(x.toPrecision(15)); }

  function toNum(v) {
    if (v === null || v === MISSING) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (isErr(v)) throw v;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t === '') throw E.VALUE;
      let m;
      if ((m = t.match(/^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)%$/))) return Number(m[1]) / 100;
      const n = Number(t.replace(/,/g, ''));
      if (!isNaN(n)) return n;
      throw E.VALUE;
    }
    if (isArr(v)) return toNum(v.d[0]);
    throw E.VALUE;
  }

  function numStr(x) {
    if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
    let s = String(round15(x));
    if (s.includes('e')) {
      const [m, e] = s.split('e');
      const ex = Number(e);
      s = m + 'E' + (ex < 0 ? '-' : '+') + String(Math.abs(ex)).padStart(2, '0');
    }
    return s;
  }

  function toStr(v) {
    if (v === null || v === MISSING) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return numStr(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (isErr(v)) throw v;
    if (isArr(v)) return toStr(v.d[0]);
    return String(v);
  }

  function toBool(v) {
    if (v === null || v === MISSING) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (isErr(v)) throw v;
    if (typeof v === 'string') {
      const u = v.toUpperCase();
      if (u === 'TRUE') return true;
      if (u === 'FALSE') return false;
      throw E.VALUE;
    }
    if (isArr(v)) return toBool(v.d[0]);
    throw E.VALUE;
  }

  /* element-wise helpers (dynamic-array semantics) */
  function lift2(a, b, f) {
    if (isArr(a) || isArr(b)) {
      const A = isArr(a) ? a : null, B = isArr(b) ? b : null;
      const h = Math.max(A ? A.h : 1, B ? B.h : 1), w = Math.max(A ? A.w : 1, B ? B.w : 1);
      const pick = (X, x, i, j) => {
        if (!X) return x;
        const ii = X.h === 1 ? 0 : i, jj = X.w === 1 ? 0 : j;
        if (ii >= X.h || jj >= X.w) return E.NA;
        return X.get(ii, jj);
      };
      const d = [];
      for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) d.push(safe(() => f(pick(A, a, i, j), pick(B, b, i, j))));
      return new Arr(h, w, d);
    }
    return safe(() => f(a, b));
  }
  function lift1(a, f) { return isArr(a) ? a.map((x) => safe(() => f(x))) : safe(() => f(a)); }
  function safe(fn) { try { return fn(); } catch (e) { if (e instanceof XErr) return e; throw e; } }
  function chk(v) { if (isErr(v)) throw v; return v; }
  function num(x) { if (!isFinite(x) || isNaN(x)) throw E.NUM; return x; }

  /* ------------------------------------------------------------------ operators */
  const ADD = (a, b) => lift2(a, b, (x, y) => num(toNum(x) + toNum(y)));
  const SUB = (a, b) => lift2(a, b, (x, y) => num(toNum(x) - toNum(y)));
  const MUL = (a, b) => lift2(a, b, (x, y) => num(toNum(x) * toNum(y)));
  const DIV = (a, b) => lift2(a, b, (x, y) => { const d = toNum(y), n = toNum(x); if (d === 0) throw E.DIV0; return num(n / d); });
  const POW = (a, b) => lift2(a, b, (x, y) => {
    const p = toNum(x), q = toNum(y);
    if (p === 0 && q === 0) throw E.NUM;
    const r = Math.pow(p, q);
    if (isNaN(r)) throw E.NUM;
    return num(r);
  });
  const CAT = (a, b) => lift2(a, b, (x, y) => toStr(x) + toStr(y));
  const NEG = (a) => lift1(a, (x) => -toNum(x));
  const POS = (a) => a;
  const PCT = (a) => lift1(a, (x) => toNum(x) / 100);

  function typeRank(v) { return typeof v === 'number' ? 1 : typeof v === 'string' ? 2 : typeof v === 'boolean' ? 3 : 0; }
  function cmp(x, y) {
    chk(x); chk(y);
    if (x === MISSING) x = null;
    if (y === MISSING) y = null;
    if (x === null && y === null) return 0;
    if (x === null) x = typeof y === 'string' ? '' : typeof y === 'boolean' ? false : 0;
    if (y === null) y = typeof x === 'string' ? '' : typeof x === 'boolean' ? false : 0;
    const tx = typeRank(x), ty = typeRank(y);
    if (tx !== ty) return tx < ty ? -1 : 1;
    if (tx === 2) {
      const a = x.toLowerCase(), b = y.toLowerCase();
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (tx === 1) { const a = round15(x), b = round15(y); return a < b ? -1 : a > b ? 1 : 0; }
    return x === y ? 0 : (x ? 1 : -1);
  }
  const EQ = (a, b) => lift2(a, b, (x, y) => cmp(x, y) === 0);
  const NE = (a, b) => lift2(a, b, (x, y) => cmp(x, y) !== 0);
  const LT = (a, b) => lift2(a, b, (x, y) => cmp(x, y) < 0);
  const GT = (a, b) => lift2(a, b, (x, y) => cmp(x, y) > 0);
  const LE = (a, b) => lift2(a, b, (x, y) => cmp(x, y) <= 0);
  const GE = (a, b) => lift2(a, b, (x, y) => cmp(x, y) >= 0);

  /* ------------------------------------------------------------------ number formatting */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function serialToDate(n) { return new Date(Math.round((n - 25569) * 86400000)); }
  function dateToSerial(d) { return Math.floor(d.getTime() / 86400000 - d.getTimezoneOffset() / 1440) + 25569; }

  function roundHalfAway(x, dp) {
    const p = Math.pow(10, dp);
    const y = Number((Math.abs(x) * p).toPrecision(15));
    return Math.sign(x) * Math.round(y) / p;
  }

  function fmtGeneral(x) {
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax >= 1e11 || ax < 1e-9) {
      const s = x.toExponential(5).replace(/\.?0+e/, 'e');
      const [m, e] = s.split('e');
      return m + 'E' + (Number(e) < 0 ? '-' : '+') + String(Math.abs(Number(e))).padStart(2, '0');
    }
    const intDigits = Math.max(1, Math.floor(Math.log10(ax)) + 1);
    const dp = Math.max(0, 10 - intDigits);
    let s = roundHalfAway(x, dp).toFixed(dp);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }

  function fmtNumber(x, fmt) {
    if (fmt == null || fmt === '' || /^general$/i.test(fmt)) return fmtGeneral(x);
    if (fmt === '@') return fmtGeneral(x);
    const sections = splitSections(fmt);
    let f = sections[0];
    if (x < 0 && sections.length > 1) { f = sections[1]; x = -x; }
    else if (x === 0 && sections.length > 2) f = sections[2];
    // dates
    if (/[dy]/i.test(f.replace(/"[^"]*"/g, '')) && !/[0#]/.test(f)) return fmtDate(x, f);
    let prefix = '', suffix = '';
    // literal text
    const lit = [];
    f = f.replace(/"([^"]*)"/g, (_, t) => { lit.push(t); return '\u0001' + (lit.length - 1) + '\u0002'; });
    f = f.replace(/\\(.)/g, (_, ch) => { lit.push(ch); return '\u0001' + (lit.length - 1) + '\u0002'; });
    const m = f.match(/^([^0#?.,%Ee]*)([0#?,.]+(?:[Ee][+-]0+)?%?)(.*)$/);
    if (!m) return fmtGeneral(x);
    prefix = m[1]; let core = m[2]; suffix = m[3];
    const corePct = core.endsWith('%');
    let pct = corePct || suffix.includes('%');
    core = core.replace('%', '');
    if (pct) x = x * 100;
    let out;
    const em = core.match(/^(.*?)[Ee]([+-])(0+)$/);
    if (em) {
      const dp = (em[1].split('.')[1] || '').length;
      const s = x.toExponential(dp);
      const [mm, ee] = s.split('e');
      const ev = Number(ee);
      out = mm + 'E' + (ev < 0 ? '-' : '+') + String(Math.abs(ev)).padStart(em[3].length, '0');
    } else {
      const parts = core.split('.');
      const intPart = parts[0], decPart = parts[1] || '';
      const dpMax = decPart.length, dpMin = (decPart.match(/0/g) || []).length;
      const comma = intPart.includes(',');
      let s = roundHalfAway(x, dpMax).toFixed(dpMax);
      let [ip, dp] = s.split('.');
      let neg = ip.startsWith('-'); if (neg) ip = ip.slice(1);
      if (dp && dpMin < dpMax) { dp = dp.replace(/0+$/, ''); while (dp.length < dpMin) dp += '0'; }
      const minInt = (intPart.replace(/,/g, '').match(/0/g) || []).length;
      if (ip === '0' && minInt === 0) ip = '';
      if (comma) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      out = (neg ? '-' : '') + ip + (dp ? '.' + dp : (decPart && dpMin > 0 ? '.' : ''));
      if (/^-0?(\.0*)?$/.test(out)) out = out.slice(1);
    }
    let res = prefix + out + (corePct ? '%' : '') + suffix;
    res = res.replace(/\u0001(\d+)\u0002/g, (_, i) => lit[Number(i)]);
    return res;
  }

  function splitSections(fmt) {
    const out = []; let cur = '', q = false;
    for (const ch of fmt) {
      if (ch === '"') q = !q;
      if (ch === ';' && !q) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function fmtDate(serial, f) {
    const d = serialToDate(serial);
    const Y = d.getUTCFullYear(), M = d.getUTCMonth(), D = d.getUTCDate();
    return f.replace(/"([^"]*)"/g, '$1').replace(/\\(.)/g, '$1')
      .replace(/yyyy/gi, String(Y)).replace(/yy/gi, String(Y).slice(2))
      .replace(/mmmm/gi, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][M])
      .replace(/mmm/gi, MONTHS[M]).replace(/mm/gi, String(M + 1).padStart(2, '0'))
      .replace(/dd/gi, String(D).padStart(2, '0')).replace(/(^|[^a-z])d(?![a-z])/gi, '$1' + D);
  }

  /* ------------------------------------------------------------------ helpers for functions */
  function flat(args, opts) {
    // values for aggregate functions: ranges/arrays skip text/bools/blanks; direct args coerced
    const out = [];
    for (const a of args) {
      if (a === MISSING) continue;
      if (isArr(a)) {
        for (const v of a.d) {
          if (isErr(v)) throw v;
          if (typeof v === 'number') out.push(v);
        }
      } else {
        if (isErr(a)) throw a;
        if (a === null) { if (opts && opts.blankZero) out.push(0); continue; }
        if (typeof a === 'string' && opts && opts.skipText) { const n = Number(a); if (a.trim() !== '' && !isNaN(n)) out.push(n); continue; }
        out.push(toNum(a));
      }
    }
    return out;
  }

  function wildcardRe(pat) {
    let s = '';
    for (let i = 0; i < pat.length; i++) {
      const ch = pat[i];
      if (ch === '~' && i + 1 < pat.length) { s += pat[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); continue; }
      if (ch === '*') s += '.*'; else if (ch === '?') s += '.'; else s += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return s;
  }

  function criteria(c) {
    if (typeof c === 'number' || typeof c === 'boolean') return (v) => cmp(v, c) === 0 && typeRank(v) === typeRank(c);
    c = toStr(c);
    const m = c.match(/^(<=|>=|<>|=|<|>)?(.*)$/s);
    const op = m[1] || '=', rhs = m[2];
    const n = rhs.trim() !== '' && !isNaN(Number(rhs)) ? Number(rhs) : null;
    if (n !== null) {
      return (v) => {
        if (typeof v !== 'number') return op === '<>';
        const r = cmp(v, n);
        return { '=': r === 0, '<>': r !== 0, '<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0 }[op];
      };
    }
    if (op === '=' || op === '<>') {
      const re = new RegExp('^' + wildcardRe(rhs) + '$', 'i');
      return (v) => {
        const ok = rhs === '' ? (v === null || v === '') : (typeof v === 'string' && re.test(v));
        return op === '=' ? ok : !ok;
      };
    }
    return (v) => {
      if (typeof v !== 'string') return false;
      const r = cmp(v, rhs);
      return { '<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0 }[op];
    };
  }

  function argOr(a, d) { return a === undefined || a === MISSING ? d : a; }
  function asArr(a) { return isArr(a) ? a : new Arr(1, 1, [a]); }

  /* ------------------------------------------------------------------ functions */
  const F = {
    IF(c, t, f) {
      const cv = c;
      if (isArr(cv)) {
        const tv = t ? t() : true, fv = f ? f() : false;
        return lift2(cv, lift2(tv, fv, (x, y) => [x, y]), (cc, pair) => (toBool(cc) ? pair[0] : pair[1]));
      }
      if (isErr(cv)) return cv;
      let b;
      try { b = toBool(cv); } catch (e) { return e; }
      if (b) return t ? norm(t()) : true;
      return f ? norm(f()) : false;
    },
    IFERROR(v, alt) {
      const x = v();
      if (isArr(x)) { let a = null; return x.map((e) => (isErr(e) ? (a === null ? (a = norm(alt())) : a) : e)); }
      return isErr(x) ? norm(alt()) : norm(x);
    },
    ISERROR(v) { return lift1(v, (x) => isErr(x)) },
    ISNUMBER(v) { return isArr(v) ? v.map((x) => typeof x === 'number') : typeof v === 'number'; },
    AND(...a) { let r = true, any = false; for (const x of a) { if (isArr(x)) { for (const v of x.d) { chk(v); if (typeof v === 'boolean' || typeof v === 'number') { any = true; r = r && toBool(v); } } } else { if (x === MISSING) continue; any = true; r = r && toBool(x); } } if (!any) throw E.VALUE; return r; },
    OR(...a) { let r = false, any = false; for (const x of a) { if (isArr(x)) { for (const v of x.d) { chk(v); if (typeof v === 'boolean' || typeof v === 'number') { any = true; r = r || toBool(v); } } } else { if (x === MISSING) continue; any = true; r = r || toBool(x); } } if (!any) throw E.VALUE; return r; },
    NOT(v) { return lift1(v, (x) => !toBool(x)); },
    TRUE() { return true; },
    FALSE() { return false; },
    PI() { return Math.PI; },
    N(v) { if (isArr(v)) v = v.d[0]; if (isErr(v)) return v; return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0; },
    VALUE(v) { return lift1(v, (x) => (typeof x === 'number' ? x : toNum(toStr(x)))); },
    SQRT(v) { return lift1(v, (x) => { const n = toNum(x); if (n < 0) throw E.NUM; return Math.sqrt(n); }); },
    EXP(v) { return lift1(v, (x) => num(Math.exp(toNum(x)))); },
    LN(v) { return lift1(v, (x) => { const n = toNum(x); if (n <= 0) throw E.NUM; return Math.log(n); }); },
    LOG10(v) { return lift1(v, (x) => { const n = toNum(x); if (n <= 0) throw E.NUM; return Math.log10(n); }); },
    ABS(v) { return lift1(v, (x) => Math.abs(toNum(x))); },
    SIN(v) { return lift1(v, (x) => Math.sin(toNum(x))); },
    COS(v) { return lift1(v, (x) => Math.cos(toNum(x))); },
    TAN(v) { return lift1(v, (x) => Math.tan(toNum(x))); },
    ASIN(v) { return lift1(v, (x) => { const n = toNum(x); if (n < -1 || n > 1) throw E.NUM; return Math.asin(n); }); },
    ACOS(v) { return lift1(v, (x) => { const n = toNum(x); if (n < -1 || n > 1) throw E.NUM; return Math.acos(n); }); },
    ATAN(v) { return lift1(v, (x) => Math.atan(toNum(x))); },
    RADIANS(v) { return lift1(v, (x) => toNum(x) * Math.PI / 180); },
    DEGREES(v) { return lift1(v, (x) => toNum(x) * 180 / Math.PI); },
    ROUND(v, d) { return lift2(v, argOr(d, 0), (x, n) => roundHalfAway(toNum(x), Math.trunc(toNum(n)))); },
    ROUNDUP(v, d) {
      return lift2(v, argOr(d, 0), (x, n) => {
        const k = Math.trunc(toNum(n)), p = Math.pow(10, k), a = toNum(x);
        const y = Number((Math.abs(a) * p).toPrecision(15));
        return Math.sign(a) * Math.ceil(y) / p;
      });
    },
    CEILING(v, s) {
      return lift2(v, argOr(s, 1), (x, sg) => {
        const a = toNum(x), g = toNum(sg);
        if (g === 0) return 0;
        if (a > 0 && g < 0) throw E.NUM;
        const q = Number((a / g).toPrecision(15));
        return Math.ceil(q) * g;
      });
    },
    MAX(...a) { const v = flat(a); return v.length ? Math.max(...v) : 0; },
    MIN(...a) { const v = flat(a); return v.length ? Math.min(...v) : 0; },
    SUM(...a) { return flat(a).reduce((s, x) => s + x, 0); },
    COUNT(...a) {
      let n = 0;
      for (const x of a) {
        if (x === MISSING) continue;
        if (isArr(x)) { for (const v of x.d) if (typeof v === 'number') n++; }
        else if (typeof x === 'number' || typeof x === 'boolean') n++;
        else if (typeof x === 'string' && x.trim() !== '' && !isNaN(Number(x))) n++;
      }
      return n;
    },
    COUNTIF(rng, crit) {
      const f = criteria(isArr(crit) ? crit.d[0] : crit);
      let n = 0; for (const v of asArr(rng).d) if (!isErr(v) && f(v)) n++;
      return n;
    },
    SUMIF(rng, crit, sumRng) {
      const f = criteria(isArr(crit) ? crit.d[0] : crit);
      const A = asArr(rng), S = sumRng === undefined || sumRng === MISSING ? A : asArr(sumRng);
      let s = 0; A.d.forEach((v, i) => { if (!isErr(v) && f(v)) { const x = S.d[i]; if (typeof x === 'number') s += x; } });
      return s;
    },
    INDEX(arr, r, c) {
      const A = asArr(arr);
      if (isErr(arr)) return arr;
      let ri = r === undefined || r === MISSING ? 0 : toNum(isArr(r) ? r.d[0] : r);
      let ci = c === undefined || c === MISSING ? null : toNum(isArr(c) ? c.d[0] : c);
      ri = Math.trunc(ri); if (ci !== null) ci = Math.trunc(ci);
      if (ci === null) {
        if (A.h === 1) { ci = ri; ri = 1; } // 1-row: index walks the row
        else if (A.w === 1) ci = 1;
        else ci = 0;
      }
      if (ri < 0 || ci < 0 || ri > A.h || ci > A.w) throw E.REF;
      if (ri === 0 && ci === 0) return A;
      if (ri === 0) { const d = []; for (let i = 0; i < A.h; i++) d.push(A.get(i, ci - 1)); return new Arr(A.h, 1, d); }
      if (ci === 0) { const d = []; for (let j = 0; j < A.w; j++) d.push(A.get(ri - 1, j)); return new Arr(1, A.w, d); }
      return A.get(ri - 1, ci - 1);
    },
    MATCH(look, arr, type) {
      if (isArr(look)) look = look.d[0];
      chk(look);
      const A = asArr(arr).d;
      const t = type === undefined || type === MISSING ? 1 : toNum(type);
      if (look === null) look = 0;
      if (t === 0) {
        if (typeof look === 'string' && /[*?~]/.test(look)) {
          const re = new RegExp('^' + wildcardRe(look) + '$', 'i');
          for (let i = 0; i < A.length; i++) if (typeof A[i] === 'string' && re.test(A[i])) return i + 1;
          throw E.NA;
        }
        for (let i = 0; i < A.length; i++) {
          const v = A[i];
          if (v === null || isErr(v)) continue;
          if (typeRank(v) === typeRank(look) && cmp(v, look) === 0) return i + 1;
        }
        throw E.NA;
      }
      let pos = -1;
      for (let i = 0; i < A.length; i++) {
        const v = A[i];
        if (v === null || isErr(v) || typeRank(v) !== typeRank(look)) continue;
        const r = cmp(v, look);
        if (t > 0) { if (r <= 0) pos = i; else break; }
        else { if (r >= 0) pos = i; else break; }
      }
      if (pos < 0) throw E.NA;
      return pos + 1;
    },
    VLOOKUP(look, table, col, approx) {
      const T = asArr(table), ci = Math.trunc(toNum(col));
      if (ci < 1 || ci > T.w) throw E.REF;
      const firstCol = new Arr(T.h, 1, Array.from({ length: T.h }, (_, i) => T.get(i, 0)));
      const exact = approx !== undefined && approx !== MISSING && !toBool(approx);
      const pos = F.MATCH(look, firstCol, exact ? 0 : 1);
      if (isErr(pos)) return pos;
      return T.get(pos - 1, ci - 1);
    },
    LEFT(s, n) { return lift2(s, argOr(n, 1), (x, k) => toStr(x).slice(0, Math.max(0, Math.trunc(toNum(k))))); },
    MID(s, st, n) { const a = toStr(s), b = Math.trunc(toNum(st)), c = Math.trunc(toNum(n)); if (b < 1 || c < 0) throw E.VALUE; return a.substr(b - 1, c); },
    LEN(s) { return lift1(s, (x) => toStr(x).length); },
    LOWER(s) { return lift1(s, (x) => toStr(x).toLowerCase()); },
    SEARCH(find, within, start) {
      return lift2(find, within, (f, w) => {
        const fs = toStr(f), ws = toStr(w), st = Math.trunc(toNum(argOr(start, 1)));
        if (st < 1 || st > ws.length + 1) throw E.VALUE;
        const re = new RegExp(wildcardRe(fs), 'i');
        const m = re.exec(ws.slice(st - 1));
        if (!m) throw E.VALUE;
        return m.index + st;
      });
    },
    TEXT(v, f) {
      return lift2(v, f, (x, ff) => {
        const fmt = toStr(ff);
        if (typeof x === 'string') { const n = Number(x); if (x.trim() === '' || isNaN(n)) return x; x = n; }
        return fmtNumber(toNum(x), fmt);
      });
    },
    TEXTJOIN(delim, ignoreEmpty, ...items) {
      const d = toStr(delim), ign = toBool(ignoreEmpty), parts = [];
      for (const it of items) { const vs = isArr(it) ? it.d : [it]; for (const v of vs) { const s = toStr(v); if (!(ign && s === '')) parts.push(s); } }
      return parts.join(d);
    },
    TODAY() { return dateToSerial(new Date()); },
    GAMMALN(v) {
      return lift1(v, (x) => {
        let z = toNum(x); if (z <= 0) throw E.NUM;
        const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - F.GAMMALN(1 - z);
        z -= 1; let a = c[0]; const t = z + g + 0.5;
        for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
      });
    },
    NORMSINV(v) {
      return lift1(v, (x) => {
        const p = toNum(x); if (p <= 0 || p >= 1) throw E.NUM;
        const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
        const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
        const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
        const pl = 0.02425; let q, r, z;
        if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
        else if (p <= 1 - pl) { q = p - 0.5; r = q * q; z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
        else { q = Math.sqrt(-2 * Math.log(1 - p)); z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
        // one Halley refinement step
        const e = 0.5 * erfc(-z / Math.SQRT2) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(z * z / 2);
        return z - u / (1 + z * u / 2);
      });
    },
    RATE(nper, pmt, pv, fv, type, guess) {
      const n = toNum(nper), p = toNum(pmt), v = toNum(pv), f = toNum(argOr(fv, 0)), t = toNum(argOr(type, 0));
      const g0 = toNum(argOr(guess, 0.1));
      const y = (r) => {
        if (Math.abs(r) < 1e-12) return v + p * n + f;
        const q = Math.pow(1 + r, n);
        return v * q + p * (1 + r * t) * (q - 1) / r + f;
      };
      // Newton with numerical derivative, kept inside (-1, ∞)
      let r = g0;
      for (let i = 0; i < 60; i++) {
        const h = Math.max(1e-7, Math.abs(r) * 1e-6);
        const fy = y(r), d = (y(r + h) - y(r - h)) / (2 * h);
        if (!isFinite(fy) || !isFinite(d) || d === 0) break;
        let nr = r - fy / d;
        if (nr <= -1) nr = (r - 1) / 2;
        if (Math.abs(nr - r) < 1e-12) { r = nr; if (Math.abs(y(r)) < 1e-6 * Math.max(1, Math.abs(v), Math.abs(p * n))) return r; break; }
        r = nr;
      }
      // fallback: bracket around the guess and bisect
      const grid = [];
      for (let k = -0.99; k <= 10; k += 0.01) grid.push(k);
      grid.sort((a, b) => Math.abs(a - g0) - Math.abs(b - g0));
      for (const a of grid) {
        const b = a + 0.01, ya = y(a), yb = y(b);
        if (isFinite(ya) && isFinite(yb) && ya * yb <= 0) {
          let lo = a, hi = b, flo = ya;
          for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2, fm = y(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
          return (lo + hi) / 2;
        }
      }
      throw E.NUM;
    },
    INDIRECT(ref) {
      const s = toStr(ref);
      const nm = root.ENGCALC_NAMES && root.ENGCALC_NAMES[s];
      if (nm) return R(nm[0], nm[1], nm[2], nm[3], nm[4]);
      throw E.REF;
    },
  };
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function norm(v) { return v === MISSING ? null : v; }

  /* wrap every function so thrown XErr become values */
  for (const k of Object.keys(F)) {
    const fn = F[k];
    F[k] = (...a) => { try { return fn(...a); } catch (e) { if (e instanceof XErr) return e; throw e; } };
  }

  /* ------------------------------------------------------------------ public API */
  const Engine = {
    E, XErr, Arr, isErr, isArr, MISSING, F, C, R, ERR,
    ops: { ADD, SUB, MUL, DIV, POW, CAT, NEG, POS, PCT, EQ, NE, LT, GT, LE, GE },
    load(model) {
      SHEETS = model.sheets;
      FORMULAS = model.formulas;
      memo = new Map();
    },
    get: (s, r, c) => C(s, r, c),
    range: (s, r1, c1, r2, c2) => R(s, r1, c1, r2, c2),
    setInput(s, r, c, v) { inputs[key(s, r, c)] = v; memo = new Map(); },
    clearInput(s, r, c) { delete inputs[key(s, r, c)]; memo = new Map(); },
    hasInput: (s, r, c) => Object.prototype.hasOwnProperty.call(inputs, key(s, r, c)),
    inputs,
    invalidate() { memo = new Map(); },
    format(v, fmt) {
      if (v === null || v === undefined) return '';
      if (isErr(v)) return v.code;
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (typeof v === 'number') return fmtNumber(v, fmt);
      return String(v);
    },
    fmtNumber,
  };
  root.Engine = Engine;
  // globals used by compiled formulas
  root.C = C; root.R = R; root.F = F; root.MISSING = MISSING; root.ERR = ERR;
  Object.assign(root, Engine.ops);
})(typeof window !== 'undefined' ? window : globalThis);
