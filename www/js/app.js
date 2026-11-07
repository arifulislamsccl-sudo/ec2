/* EngCalc – app shell, navigation and calculator rendering */
(function () {
  'use strict';
  const E = window.Engine;
  const UI = window.ENGCALC_UI;
  E.load(window.ENGCALC_MODEL);

  const AUTHOR = 'Md. Ariful Islam';
  const STORE = 'engcalc.v1.inputs';
  const $app = document.getElementById('app');
  const $nav = document.getElementById('bottomnav');

  const CATS = UI.cats;
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const ORDER = CATS.flatMap((c) => c.items);
  const calc = (si) => UI.calcs[si];

  /* ------------------------------------------------------------ persistence */
  function loadInputs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      for (const [k, v] of Object.entries(saved)) {
        const [s, r, c] = k.split(':').map(Number);
        E.setInput(s, r, c, v);
      }
    } catch (e) { /* storage unavailable */ }
  }
  function saveInputs() {
    try { localStorage.setItem(STORE, JSON.stringify(E.inputs)); } catch (e) { /* ignore */ }
  }
  loadInputs();

  /* ------------------------------------------------------------ helpers */
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const val = (si, o) => E.get(si, o.r, o.c);
  function txt(si, o) {
    if (!o) return '';
    const v = val(si, o);
    if (v === null || v === undefined) return '';
    return E.format(v, o.f && o.f !== '@' ? o.f : null);
  }
  function status(s) {
    const t = String(s).trim();
    if (/^(✔|✓|☑)/.test(t)) return 'st-ok';
    if (/^(⚠|❗)/.test(t)) return 'st-warn';
    if (/^(✖|✗|❌|⛔|✘)/.test(t)) return 'st-bad';
    return '';
  }
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1600);
  }
  const catOf = (si) => calc(si).cat;

  /* ------------------------------------------------------------ bottom nav */
  function renderNav(active) {
    const items = [{ id: 'home', label: 'Home', icon: 'home', href: '#/' }]
      .concat(CATS.map((c) => ({ id: c.id, label: c.label, icon: c.icon, href: '#/cat/' + c.id })))
      .concat([{ id: 'data', label: 'Data', icon: 'data', href: '#/data' }]);
    $nav.innerHTML = items.map((i) => `<a href="${i.href}" class="${i.id === active ? 'on' : ''}" data-id="${i.id}"><span class="bub">${icon(i.icon)}</span>${esc(i.label)}</a>`).join('');
    const on = $nav.querySelector('a.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ------------------------------------------------------------ home */
  let homeQuery = '';
  let allOpen = false;
  function itemHTML(si, showCat) {
    const c = calc(si);
    return `<a class="item" href="#/calc/${si}">${icon(CAT[c.cat].icon)}<div class="t"><b>${esc(c.name)}</b><span>${esc(showCat ? CAT[c.cat].label + ' · ' + c.desc : c.desc)}</span></div>${c.code ? `<span class="code">${esc(c.code)}</span>` : ''}${icon('next', 'go')}</a>`;
  }

  function renderHome() {
    renderNav('home');
    const tiles = CATS.map((c) => `<a class="tile" href="#/cat/${c.id}">${icon(c.icon)}<b>${esc(c.label)}</b><span>${c.items.length}</span></a>`).join('')
      + `<a class="tile" href="#/data">${icon('data')}<b>Data</b><span>tables</span></a>`;
    const all = CATS.map((c) => `<div class="group-label">${esc(c.label)}</div>` + c.items.map((si) => itemHTML(si)).join('')).join('');
    $app.innerHTML = `
      <header class="brand">${LOGO}<div><h1>EngCalc <small>Design &amp; Developed by ${esc(AUTHOR)}</small></h1><div class="sub">${UI.nCalc} calculators + converter · offline</div></div></header>
      <label class="search ${homeQuery ? 'has' : ''}">${icon('search')}<input id="q" type="search" placeholder="Search pump, pipe, H2SO4, tank..." autocomplete="off" value="${esc(homeQuery)}"><button class="clear" type="button" aria-label="Clear">${icon('x')}</button></label>
      <div id="homebody"></div>
      <p class="foot">For preliminary design, screening and maintenance decisions. Check pressure equipment, lifting gear and relief systems against the current code edition and a qualified engineer.</p>`;
    const body = document.getElementById('homebody');
    const draw = () => {
      if (homeQuery.trim()) { body.innerHTML = searchHTML(homeQuery); return; }
      body.innerHTML = `<div class="grid">${tiles}</div>
        <section class="panel ${allOpen ? 'open' : ''}" id="allp"><div class="panel-head">${icon('home')}<b>All calculators</b><span class="count">${ORDER.length}</span><span class="chev">${icon('down')}</span></div><div class="panel-body">${all}</div></section>`;
      body.querySelector('#allp .panel-head').onclick = () => { allOpen = !allOpen; body.querySelector('#allp').classList.toggle('open', allOpen); };
    };
    draw();
    const q = document.getElementById('q'), lab = q.closest('.search');
    q.addEventListener('input', () => { homeQuery = q.value; lab.classList.toggle('has', !!homeQuery); draw(); });
    lab.querySelector('.clear').onclick = (e) => { e.preventDefault(); homeQuery = ''; q.value = ''; lab.classList.remove('has'); draw(); q.focus(); };
  }

  /* ------------------------------------------------------------ search */
  const norm = (s) => String(s).toLowerCase().replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d))).replace(/[^a-z0-9%²³]+/g, ' ');
  const INDEX = ORDER.map((si) => {
    const c = calc(si);
    return { si, head: norm([c.name, c.code, CAT[c.cat].label].join(' ')), body: norm([c.desc, c.title, c.subtitle, c.text].join(' ')) };
  });
  function searchHTML(q) {
    const terms = norm(q).split(' ').filter(Boolean);
    const res = [];
    for (const it of INDEX) {
      let score = 0, ok = true;
      for (const t of terms) {
        if (it.head.includes(t)) score += 5;
        else if (it.body.includes(t)) score += 1;
        else { ok = false; break; }
      }
      if (ok) res.push([score, it.si]);
    }
    res.sort((a, b) => b[0] - a[0]);
    if (!res.length) return `<div class="panel"><div class="empty">No calculator found for “${esc(q)}”.</div></div>`;
    return `<div class="panel open"><div class="panel-head">${icon('search')}<b>Results</b><span class="count">${res.length}</span></div><div class="panel-body">${res.map(([, si]) => itemHTML(si, true)).join('')}</div></div>`;
  }

  /* ------------------------------------------------------------ category */
  function renderCat(id) {
    const c = CAT[id];
    if (!c) return renderHome();
    renderNav(id);
    $app.innerHTML = `
      <div class="topbar"><a class="iconbtn" href="#/" aria-label="Home">${icon('back')}</a><div class="ttl"><b>${esc(c.label)}</b><span>${c.items.length} calculator${c.items.length > 1 ? 's' : ''}</span></div></div>
      <div class="panel open" style="margin-top:0"><div class="panel-body">${c.items.map((si) => itemHTML(si)).join('')}</div></div>`;
  }

  /* ------------------------------------------------------------ calculator */
  let bound = [];   // {kind, el, si, o, ...}
  let curSi = null;

  function dvOptions(si, o) {
    let v;
    try { v = UI.dv[o.dv](); } catch (e) { return []; }
    if (typeof v === 'string') return v.split(',').map((s) => s.trim());
    if (E.isArr(v)) return v.d.filter((x) => x !== null && x !== '' && !E.isErr(x)).map((x) => (typeof x === 'number' ? E.format(x) : String(x)));
    return [];
  }

  function isPct(o) { return o.f && /%/.test(o.f); }
  function isDate(o) { return o.f && /yy/i.test(o.f) && !/[0#]/.test(o.f); }

  function inputDisplay(si, o) {
    const v = val(si, o);
    if (v === null || v === undefined || v === '') return '';
    if (E.isErr(v)) return '';
    if (typeof v === 'number') {
      if (isDate(o)) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
      if (isPct(o)) return E.format(v * 100) + '%';
      return E.format(v);
    }
    return String(v);
  }

  function parseInput(raw, o) {
    const t = raw.trim();
    if (t === '') return null;
    if (isDate(o)) { const d = new Date(t + 'T00:00:00Z'); if (!isNaN(d)) return Math.round(d.getTime() / 86400000) + 25569; }
    const pct = t.endsWith('%');
    const n = Number(t.replace(/,/g, '').replace(/%$/, ''));
    if (t !== '' && !isNaN(n)) return (pct || isPct(o)) ? n / 100 : n;
    return t;
  }

  function fieldHTML(si, o, label) {
    const id = `f_${o.r}_${o.c}`;
    const changed = E.hasInput(si, o.r, o.c) ? ' changed' : '';
    if (o.dv !== undefined) {
      return `<select class="fld${changed}" id="${id}" data-r="${o.r}" data-c="${o.c}" aria-label="${esc(label || '')}"></select>`;
    }
    const cur = val(si, o);
    const isText = typeof cur === 'string' && cur !== '' && isNaN(Number(cur));
    const ph = /blank|optional/i.test(label || '') ? 'auto' : '';
    const type = isDate(o) ? 'date' : 'text';
    return `<input class="fld${isText ? ' txt' : ''}${changed}" id="${id}" type="${type}" ${isText || type === 'date' ? '' : 'inputmode="decimal"'} data-r="${o.r}" data-c="${o.c}" placeholder="${ph}" aria-label="${esc(label || '')}" autocomplete="off" enterkeyhint="done">`;
  }

  function outHTML(kind) { return `<span class="out" data-k="${kind}"></span>`; }

  function renderCalc(si) {
    const c = calc(si);
    if (!c) return renderHome();
    curSi = si;
    renderNav(c.cat);
    bound = [];
    const idx = ORDER.indexOf(si);
    const prev = ORDER[idx - 1], next = ORDER[idx + 1];

    let html = `
      <div class="topbar"><a class="iconbtn" href="#/cat/${c.cat}" aria-label="Back">${icon('back')}</a>
        <div class="ttl"><b>${esc(c.name)}</b><span>${c.code ? `<span class="chip">${esc(c.code)}</span>` : ''}${esc(CAT[c.cat].label)}</span></div>
        <button class="iconbtn" id="reset" title="Reset inputs" aria-label="Reset inputs">${icon('reset')}</button></div>
      <div class="sheet-title">${esc(c.title)}</div>
      ${c.subtitle ? `<p class="sheet-sub">${esc(c.subtitle.replace(/^\[[A-Z0-9]+\]\s*/, ''))}</p>` : ''}
      <div class="legend"><span><i style="background:#ffe08a"></i>Input – tap to change</span><span><i style="background:#fff"></i>Result – updates instantly</span></div>`;

    // group blocks into sections
    const secs = [];
    let cur = null;
    const blocks = c.blocks;
    blocks.forEach((b, i) => {
      if (b.t === 'h') { cur = { head: b.text, items: [] }; secs.push(cur); return; }
      if (b.t === 'table' && cur && cur.items.length && cur.items.some((x) => x.t !== 'note')) { cur = { head: '', items: [] }; secs.push(cur); }
      if (b.t === 'note' && i === blocks.length - 1) { secs.push({ tail: b }); cur = null; return; }
      if (!cur) { cur = { head: '', items: [] }; secs.push(cur); }
      cur.items.push(b);
      if (b.t === 'table') cur = null;
    });

    for (const s of secs) {
      if (s.tail) { html += `<p class="notep" data-note="${s.tail.cell.r}_${s.tail.cell.c}"></p>`; continue; }
      const isRes = /result|decision/i.test(s.head);
      const big = s.items.some((x) => x.t === 'table' && x.rows.length > 18 && !x.rows.some((r) => r.some((o) => o && o.in)));
      html += `<section class="sec${isRes ? ' result' : ''}${big ? ' collapsible collapsed' : ''}">`;
      if (s.head || big) html += `<h2>${esc(s.head || 'Detail table')}${big ? icon('down') : ''}</h2>`;
      html += '<div class="rows">';
      for (const b of s.items) {
        if (b.t === 'note') { html += `<div class="notep in-sec" data-note="${b.cell.r}_${b.cell.c}"></div>`; continue; }
        if (b.t === 'table') { html += tableHTML(si, b); continue; }
        // row
        const lab = b.label ? txt(si, b.label) : '';
        if (/\(helper\)/i.test(lab)) { b.hidden = true; continue; }
        const v = b.value;
        const key = v && !v.in && (v.z || (v.g && v.b));
        const isIn = v && v.in;
        html += `<div class="row${key ? ' key' : ''}${isIn ? ' input' : ''}" data-row="${v ? v.r + '_' + v.c : ''}">`;
        html += `<div class="lab${b.label && b.label.b ? ' b' : ''}" data-lab></div>`;
        html += '<div class="val">';
        if (v) html += isIn ? fieldHTML(si, v, lab) : outHTML('v');
        if (b.unit) html += `<span class="unit" data-unit></span>`;
        html += '</div>';
        if (b.note) html += `<div class="note" data-rnote></div>`;
        html += '</div>';
      }
      html += '</div></section>';
    }

    html += `<div class="pager">${prev !== undefined ? `<a href="#/calc/${prev}"><span>◄ Previous</span><b>${esc(calc(prev).name)}</b></a>` : '<span></span>'}${next !== undefined ? `<a class="nx" href="#/calc/${next}"><span>Next ►</span><b>${esc(calc(next).name)}</b></a>` : '<span></span>'}</div>`;
    $app.innerHTML = html;

    // bind rows
    const rowEls = $app.querySelectorAll('.row');
    let ri = 0;
    const rowBlocks = secs.flatMap((s) => (s.items || [])).filter((b) => b.t === 'row' && !b.hidden);
    rowEls.forEach((el) => {
      const b = rowBlocks[ri++];
      if (!b) return;
      if (b.label) bound.push({ kind: 'text', el: el.querySelector('[data-lab]'), o: b.label });
      if (b.unit) bound.push({ kind: 'text', el: el.querySelector('[data-unit]'), o: b.unit });
      if (b.note) bound.push({ kind: 'text', el: el.querySelector('[data-rnote]'), o: b.note });
      if (b.value) {
        if (b.value.in) bindField(el.querySelector('.fld'), b.value, si);
        else bound.push({ kind: 'out', el: el.querySelector('.out'), o: b.value, row: el });
      }
    });
    $app.querySelectorAll('[data-note]').forEach((el) => {
      const [r, cc] = el.dataset.note.split('_').map(Number);
      bound.push({ kind: 'text', el, o: { r, c: cc } });
    });
    $app.querySelectorAll('[data-cell]').forEach((td) => {
      const o = JSON.parse(td.dataset.cell);
      if (o.in) bindField(td.classList.contains('fld') ? td : td.querySelector('.fld'), o, si);
      else bound.push({ kind: 'cell', el: td, o });
    });
    $app.querySelectorAll('.addrow').forEach((btn) => {
      btn.onclick = () => {
        const hidden = btn.parentElement.querySelector('.rcard.hide');
        if (hidden) hidden.classList.remove('hide');
        if (!btn.parentElement.querySelector('.rcard.hide')) btn.remove();
      };
    });
    $app.querySelectorAll('.sec.collapsible > h2').forEach((h) => { h.onclick = () => h.parentElement.classList.toggle('collapsed'); });
    document.getElementById('reset').onclick = () => {
      for (const k of Object.keys(E.inputs)) if (k.startsWith(si + ':')) { const [s, r, cc] = k.split(':').map(Number); E.clearInput(s, r, cc); }
      saveInputs();
      renderCalc(si);
      toast('Inputs reset to default');
    };
    refresh();
    window.scrollTo(0, 0);
  }

  const attr = (o) => JSON.stringify(o).replace(/'/g, '&#39;');
  function tableHTML(si, b) {
    const head = b.rows[0] || [];
    const headIsLabels = head.length > 2 && head.every((o) => !o || !o.in);
    const body = b.rows.slice(1);
    const inputRows = body.filter((r) => r.some((o) => o && o.in));
    if (headIsLabels && inputRows.length >= 2) return cardsHTML(si, head, body);
    return gridHTML(si, b);
  }

  // one card per table row – friendlier than a wide table on a phone
  function cardsHTML(si, head, body) {
    const labels = [];
    let col = 0;
    head.forEach((o) => { labels[col] = o ? txt(si, o) : ''; col += o && o.cs ? o.cs : 1; });
    let h = '<div class="cards">';
    let shownEmpty = 0;
    body.forEach((row, i) => {
      const cells = []; let c = 0;
      row.forEach((o) => { cells.push([c, o]); c += o && o.cs ? o.cs : 1; });
      const ins = cells.filter(([, o]) => o && o.in);
      const filled = !ins.length || ins.some(([, o]) => { const v = val(si, o); return v !== null && v !== ''; });
      let hide = false;
      if (!filled) { if (shownEmpty >= 1) hide = true; shownEmpty++; }
      const first = cells[0] && cells[0][1] && !cells[0][1].in ? cells[0] : null;
      h += `<div class="rcard${hide ? ' hide' : ''}">`;
      h += `<div class="rc-h">${first ? `<span data-cell='${attr(first[1])}'></span>` : '#' + (i + 1)}</div><div class="rc-g">`;
      cells.forEach(([cc, o], k) => {
        if (!o || (first && k === 0)) return;
        const lab = labels[cc] || '';
        if (o.in) h += `<label class="rc-f"><span>${esc(lab)}</span>${fieldHTML(si, o, lab).replace('class="fld', `data-cell='${attr(o)}' class="fld`)}</label>`;
        else h += `<div class="rc-f out-f"><span>${esc(lab)}</span><b data-cell='${attr(o)}'></b></div>`;
      });
      h += '</div></div>';
    });
    h += '</div>';
    if (body.length) h += `<button class="btn addrow" type="button">+ Add row</button>`;
    return `<div class="cardwrap">${h}</div>`;
  }

  function gridHTML(si, b) {
    const w = Math.max(...b.rows.map((r) => r.reduce((n, o) => n + (o && o.cs ? o.cs : 1), 0)));
    let h = '<div class="tblwrap"><table class="t">';
    b.rows.forEach((row) => {
      h += '<tr>';
      let n = 0;
      row.forEach((o) => {
        if (!o) { h += '<td></td>'; n++; return; }
        const cs = o.cs ? ` colspan="${o.cs}"` : '';
        n += o.cs || 1;
        if (o.in) {
          const ph = '';
          h += `<td${cs} data-cell='${JSON.stringify(o).replace(/'/g, "&#39;")}'>${fieldHTML(si, o, ph)}</td>`;
        } else {
          h += `<td${cs} class="${o.b ? 'b ' : ''}${o.g ? 'g ' : ''}" data-cell='${JSON.stringify(o).replace(/'/g, "&#39;")}'></td>`;
        }
      });
      if (n < w) h += `<td colspan="${w - n}"></td>`;
      h += '</tr>';
    });
    h += '</table></div>';
    if (b.rows.some((r) => r.some((o) => o && o.in))) h += '<div class="hint">Swipe the table sideways to see all columns.</div>';
    return h;
  }

  function bindField(el, o, si) {
    if (!el) return;
    bound.push({ kind: 'field', el, o });
    const commit = () => {
      const raw = el.value;
      if (el.tagName === 'SELECT') {
        const n = Number(raw);
        const v = raw !== '' && !isNaN(n) && String(n) === raw ? n : raw;
        E.setInput(si, o.r, o.c, v);
      } else {
        const v = parseInput(raw, o);
        if (v === null && o.fx) E.clearInput(si, o.r, o.c);
        else E.setInput(si, o.r, o.c, v);
      }
      el.classList.add('changed');
      saveInputs();
      refresh(el);
    };
    el.addEventListener('change', commit);
    if (el.tagName !== 'SELECT') {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { el.blur(); } });
      let t;
      el.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { if (document.activeElement === el) { commitSoft(el, o, si); } }, 450); });
    }
  }
  // live update while typing (does not rewrite the field being typed in)
  function commitSoft(el, o, si) {
    const v = parseInput(el.value, o);
    if (v === null && o.fx) E.clearInput(si, o.r, o.c); else E.setInput(si, o.r, o.c, v);
    el.classList.add('changed');
    saveInputs();
    refresh(el);
  }

  function refresh(skipEl) {
    const si = curSi;
    for (const b of bound) {
      if (b.kind === 'text') {
        b.el.textContent = txt(si, b.o);
      } else if (b.kind === 'out') {
        const s = txt(si, b.o);
        const st = status(s);
        b.el.className = 'out' + (st ? ' pill ' + st : '');
        b.el.textContent = s === '' ? '–' : s;
        if (b.row) b.row.classList.toggle('wide', s.length > 26);
      } else if (b.kind === 'cell') {
        const v = val(si, b.o);
        const s = txt(si, b.o);
        b.el.textContent = s;
        const st = status(s);
        b.el.classList.toggle('num', typeof v === 'number');
        b.el.classList.toggle('wrap', s.length > 38);
        b.el.classList.remove('st-ok', 'st-warn', 'st-bad');
        if (st) b.el.classList.add(st);
      } else if (b.kind === 'field') {
        if (b.el === skipEl) continue;
        if (b.el.tagName === 'SELECT') {
          const opts = dvOptions(si, b.o);
          const cur = inputDisplay(si, b.o);
          if (cur !== '' && !opts.includes(cur)) opts.unshift(cur);
          const sig = opts.join('\u0001');
          if (b.el._sig !== sig) {
            b.el.innerHTML = (cur === '' ? '<option value="">–</option>' : '') + opts.map((x) => `<option>${esc(x)}</option>`).join('');
            b.el._sig = sig;
          }
          b.el.value = cur;
        } else if (document.activeElement !== b.el) {
          b.el.value = inputDisplay(si, b.o);
        }
      }
    }
  }

  /* ------------------------------------------------------------ data tables */
  function renderData() {
    renderNav('data');
    let html = `<div class="topbar"><a class="iconbtn" href="#/" aria-label="Home">${icon('back')}</a><div class="ttl"><b>Reference data</b><span>Tables used by the calculators (view only)</span></div></div>`;
    UI.data.forEach((d, di) => {
      html += `<div class="group-label" style="padding-left:4px">${esc(d.label)}</div>`;
      d.blocks.forEach((b, bi) => {
        html += `<section class="panel dsec" data-d="${di}" data-b="${bi}"><div class="panel-head">${icon('data')}<b>${esc(b.title || 'Table')}</b><span class="count">${b.rows.length}</span><span class="chev">${icon('down')}</span></div><div class="panel-body"></div></section>`;
      });
    });
    $app.innerHTML = html;
    $app.querySelectorAll('.dsec .panel-head').forEach((h) => {
      h.onclick = () => {
        const p = h.parentElement;
        const body = p.querySelector('.panel-body');
        if (!body.dataset.done) {
          const d = UI.data[+p.dataset.d], b = d.blocks[+p.dataset.b];
          let t = b.note ? `<div class="dnote">${esc(b.note)}</div>` : '';
          t += '<div class="tblwrap"><table class="t">';
          for (const row of b.rows) {
            t += '<tr>' + row.map((o) => {
              if (!o) return '<td></td>';
              const v = E.get(d.sheet, o.r, o.c);
              const s = E.format(v, o.f && o.f !== '@' ? o.f : null);
              return `<td class="${o.b ? 'b ' : ''}${typeof v === 'number' ? 'num ' : ''}${s.length > 38 ? 'wrap' : ''}">${esc(s)}</td>`;
            }).join('') + '</tr>';
          }
          t += '</table></div>';
          body.innerHTML = t;
          body.dataset.done = '1';
        }
        p.classList.toggle('open');
      };
    });
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------ router */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    if (page === 'calc' && calc(Number(arg))) return renderCalc(Number(arg));
    curSi = null;
    if (page === 'cat') return renderCat(arg);
    if (page === 'data') return renderData();
    renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();

  /* Android hardware back button (Capacitor) */
  const Cap = window.Capacitor;
  if (Cap && Cap.Plugins && Cap.Plugins.App) {
    Cap.Plugins.App.addListener('backButton', () => {
      const h = location.hash.replace(/^#\/?/, '');
      if (!h) Cap.Plugins.App.exitApp();
      else if (h.startsWith('calc/')) location.hash = '#/cat/' + catOf(Number(h.split('/')[1]));
      else location.hash = '#/';
    });
  }

  /* offline cache for the web (PWA) version */
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !(Cap && Cap.isNativePlatform && Cap.isNativePlatform())) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
