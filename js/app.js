import {
  ITEM_TYPES, ENCHANTMENTS, ENCH_BY_ID, ENCH_INDEX, ROMAN,
  applicable, conflictClusters, xpForLevels,
} from './data.js';
import { combine, useCountFromPw } from './anvil.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const PW_OPTIONS = [0, 1, 3, 7, 15, 31, 63, 127];

const state = {
  edition: 'java',
  itemType: 'boots',
  items: [],          // { id, kind, pw, damaged, ench: [{id, level}] }
  choices: {},        // conflict cluster key -> chosen enchantment id ('' = optimiser decides)
  mode: 'optimal',
  manual: null,       // { pool: [{ref,label,item}], steps: [...] }
};
let nextId = 1;

/* ------------------------------------------------------------------ items */

function newItem(kind) {
  return { id: nextId++, kind, pw: 0, damaged: false, ench: [] };
}

function enchOptions(item) {
  return applicable(item.kind === 'book' ? 'book' : state.itemType, state.edition);
}

/** Drop enchantments that the current tool type cannot hold. */
function pruneItems() {
  for (const item of state.items) {
    const allowed = new Set(enchOptions(item).map((e) => e.id));
    item.ench = item.ench.filter((e) => allowed.has(e.id));
    for (const e of item.ench) e.level = Math.min(e.level, ENCH_BY_ID[e.id].max);
  }
}

function renderItems() {
  const list = $('itemList');
  list.textContent = '';
  if (!state.items.length) {
    list.append(el('p', 'empty', 'No items yet — add the tool you are enchanting and the books going onto it.'));
  }
  const toolCount = state.items.filter((i) => i.kind === 'tool').length;

  state.items.forEach((item, idx) => {
    const card = el('div', `item ${item.kind}`);
    const head = el('div', 'item-head');

    const title = el('div', 'item-title');
    title.append(document.createTextNode(`#${idx + 1} `));
    const kindSel = el('select');
    for (const k of ['tool', 'book']) {
      const o = el('option', null, k === 'tool' ? typeName(state.itemType) : 'Enchanted Book');
      o.value = k;
      if (item.kind === k) o.selected = true;
      kindSel.append(o);
    }
    kindSel.onchange = () => { item.kind = kindSel.value; pruneItems(); refresh(); };
    title.append(kindSel);
    head.append(title);

    const pwField = el('label', 'field inline');
    pwField.append(el('span', null, 'Prior work'));
    const pwSel = el('select');
    const opts = PW_OPTIONS.includes(item.pw) ? PW_OPTIONS : [...PW_OPTIONS, item.pw].sort((a, b) => a - b);
    for (const v of opts) {
      const o = el('option', null, `${v}  (${useCountFromPw(v)} use${useCountFromPw(v) === 1 ? '' : 's'})`);
      o.value = String(v);
      if (v === item.pw) o.selected = true;
      pwSel.append(o);
    }
    pwSel.onchange = () => { item.pw = Number(pwSel.value); refresh(); };
    pwField.append(pwSel);
    head.append(pwField);

    if (item.kind === 'tool' && toolCount > 1) {
      const dmg = el('label', 'check');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = item.damaged;
      cb.onchange = () => { item.damaged = cb.checked; refresh(); };
      dmg.append(cb, el('span', null, 'damaged'));
      head.append(dmg);
    }

    const del = el('button', 'btn icon', '✕');
    del.title = 'Remove item';
    del.onclick = () => { state.items.splice(idx, 1); refresh(); };
    head.append(del);
    card.append(head);

    const rows = el('div', 'ench-rows');
    const available = enchOptions(item);
    item.ench.forEach((slot, si) => {
      const row = el('div', 'ench-row');
      const sel = el('select');
      for (const e of available) {
        const taken = item.ench.some((o, oi) => oi !== si && o.id === e.id);
        if (taken) continue;
        const o = el('option', null, e.name);
        o.value = e.id;
        if (e.id === slot.id) o.selected = true;
        sel.append(o);
      }
      sel.onchange = () => {
        slot.id = sel.value;
        slot.level = Math.min(slot.level, ENCH_BY_ID[slot.id].max);
        refresh();
      };
      const lvl = el('select', 'lvl');
      for (let L = 1; L <= ENCH_BY_ID[slot.id].max; L++) {
        const o = el('option', null, ROMAN[L] || String(L));
        o.value = String(L);
        if (L === slot.level) o.selected = true;
        lvl.append(o);
      }
      lvl.onchange = () => { slot.level = Number(lvl.value); refresh(); };
      const rm = el('button', 'btn icon', '✕');
      rm.title = 'Remove enchantment';
      rm.onclick = () => { item.ench.splice(si, 1); refresh(); };
      row.append(sel, lvl, rm);
      rows.append(row);
    });
    card.append(rows);

    const used = new Set(item.ench.map((e) => e.id));
    const free = available.filter((e) => !used.has(e.id));
    if (free.length) {
      const add = el('button', 'btn', '+ Enchantment');
      add.onclick = () => {
        item.ench.push({ id: free[0].id, level: free[0].max });
        item.ench.sort((a, b) => ENCH_INDEX[a.id] - ENCH_INDEX[b.id]);
        refresh();
      };
      const addRow = el('div', 'row gap');
      addRow.append(add);
      card.append(addRow);
    }
    list.append(card);
  });
}

const typeName = (id) => (ITEM_TYPES.find((t) => t.id === id) || {}).name || id;

/* ------------------------------------------------- conflict constraints */

function poolEnchantments() {
  const ids = new Set();
  for (const item of state.items) for (const e of item.ench) {
    // Only enchantments that could actually land on the finished item matter.
    if (item.kind === 'book' && !applicable(state.itemType, state.edition).some((a) => a.id === e.id)) continue;
    ids.add(e.id);
  }
  return [...ids];
}

function renderConflicts() {
  const clusters = conflictClusters(poolEnchantments());
  const card = $('conflictCard');
  const list = $('conflictList');
  list.textContent = '';
  card.hidden = clusters.length === 0;
  for (const cluster of clusters) {
    const key = cluster.join('+');
    const wrap = el('label', 'conflict');
    wrap.append(el('span', null, `${cluster.map((id) => ENCH_BY_ID[id].name).join(' / ')} — keep:`));
    const sel = el('select');
    const any = el('option', null, 'whichever is cheapest');
    any.value = '';
    sel.append(any);
    for (const id of cluster) {
      const o = el('option', null, ENCH_BY_ID[id].name);
      o.value = id;
      if (state.choices[key] === id) o.selected = true;
      sel.append(o);
    }
    sel.onchange = () => { state.choices[key] = sel.value; save(); };
    wrap.append(sel);
    list.append(wrap);
  }
  // Forget choices for clusters that no longer exist.
  const live = new Set(clusters.map((c) => c.join('+')));
  for (const k of Object.keys(state.choices)) if (!live.has(k)) delete state.choices[k];
  return clusters;
}

function constraints(clusters) {
  const required = [];
  const forbidden = [];
  for (const cluster of clusters) {
    const pick = state.choices[cluster.join('+')];
    if (!pick) continue;
    required.push(pick);
    for (const id of cluster) if (id !== pick) forbidden.push(id);
  }
  return { required, forbidden };
}

/* ------------------------------------------------------------- rendering */

function enchTags(ench, pw) {
  const wrap = el('div', 'ench-tags');
  const entries = [...ench].sort((a, b) => ENCH_INDEX[a[0]] - ENCH_INDEX[b[0]]);
  if (!entries.length) wrap.append(el('span', 'tag', 'no enchantments'));
  for (const [id, lvl] of entries) {
    const e = ENCH_BY_ID[id];
    wrap.append(el('span', 'tag', e.max === 1 ? e.name : `${e.name} ${ROMAN[lvl] || lvl}`));
  }
  if (pw != null) wrap.append(el('span', 'tag pw', `prior work ${pw}`));
  return wrap;
}

function itemLabel(kind) { return kind === 'book' ? 'Book' : typeName(state.itemType); }

function refName(ref, inputs) {
  if (ref == null) return '?';
  if (ref.startsWith('input-')) {
    const i = Number(ref.slice(6));
    return `Item #${i + 1} (${itemLabel(inputs[i].kind)})`;
  }
  return `Result of step ${Number(ref.slice(5)) + 1}`;
}

function renderSteps(steps, inputs) {
  const wrap = el('div', 'steps');
  let running = 0;
  steps.forEach((s, i) => {
    running += s.cost;
    const box = el('div', 'step');
    const head = el('div', 'step-head');
    head.append(el('span', 'step-n', `Step ${i + 1}`));
    if (s.repaired) head.append(el('span', null, 'repairs durability'));
    if (s.renamed) head.append(el('span', null, 'includes rename'));
    head.append(el('span', null, `running total ${running}`));
    const cost = el('span', `step-cost${s.cost >= 40 ? ' over' : ''}`, `${s.cost} level${s.cost === 1 ? '' : 's'}`);
    head.append(cost);
    box.append(head);

    const body = el('div', 'step-body');
    for (const [lbl, ref, it] of [['Target (left)', s.target, s.targetItem], ['Sacrifice (right)', s.sacrifice, s.sacrificeItem]]) {
      const slot = el('div', 'slot');
      slot.append(el('div', 'lbl', lbl));
      slot.append(el('div', null, refName(ref, inputs)));
      slot.append(enchTags(it.ench, it.pw));
      if (lbl.startsWith('Sacrifice')) { body.append(el('div', 'arrow', '→')); }
      body.append(slot);
    }
    // reorder: target, arrow, sacrifice
    box.append(body);

    const out = el('div', 'slot');
    out.append(el('div', 'lbl', 'Result'));
    out.append(enchTags(s.result.ench, s.result.pw));
    box.append(out);

    if (s.rejected) box.append(el('div', 'note', 'Some of the sacrifice’s enchantments are incompatible and are lost on this step (+1 level each in Java).'));
    if (s.cost >= 40) box.append(el('div', 'note', 'Too Expensive! — an anvil refuses this step in survival.'));
    wrap.append(box);
  });
  return wrap;
}

function renderResult(r) {
  const out = $('result');
  out.textContent = '';
  if (!r.ok) {
    out.append(el('div', 'msg bad', r.reason));
    return;
  }
  const stats = el('div', 'stats');
  const objective = $('objective').value;
  const add = (k, v, hl) => {
    const s = el('div', `stat${hl ? ' hl' : ''}`);
    s.append(el('div', 'k', k), el('div', 'v', String(v)));
    stats.append(s);
  };
  add('Total XP', r.totalXp, objective === 'xp');
  add('Total levels', r.totalLevels, objective === 'levels');
  add('Final prior work', r.finalPriorWork, objective === 'pw');
  const worst = el('div', `stat${r.maxStep >= 40 ? ' bad' : ''}`);
  worst.append(el('div', 'k', 'Worst step'), el('div', 'v', String(r.maxStep)));
  stats.append(worst);
  out.append(stats);

  if (r.maxStep >= 40) {
    out.append(el('div', 'msg warn',
      'At least one step costs 40+ levels, so an anvil refuses it outside Creative. Tick “No single step above 39 levels” for a survival-legal order.'));
  }
  if (r.unusedIndices.length) {
    out.append(el('div', 'msg warn',
      `Left unused: ${r.unusedIndices.map((i) => `item #${i + 1}`).join(', ')}.`));
  }
  out.append(renderSteps(r.steps, state.items));

  const fin = el('div', 'slot final');
  fin.append(el('div', 'lbl', `Finished ${itemLabel(r.finalItem.kind)}`));
  fin.append(enchTags(r.finalItem.ench, r.finalItem.pw));
  fin.append(el('div', 'hint', `Its next anvil operation will start ${r.finalItem.pw} level${r.finalItem.pw === 1 ? '' : 's'} more expensive because of prior work.`));
  out.append(fin);
}

/* ---------------------------------------------------------------- solving */

let worker = null;
let jobId = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      if (e.data.id !== jobId) return;
      $('status').textContent = e.data.result && e.data.result.explored
        ? `${e.data.result.explored.toLocaleString()} combinations examined`
        : '';
      if (e.data.error) {
        renderResult({ ok: false, reason: e.data.error });
      } else {
        renderResult(e.data.result);
      }
      $('solve').disabled = false;
    };
  }
  return worker;
}

function doSolve() {
  const clusters = conflictClusters(poolEnchantments());
  if (!state.items.length) {
    renderResult({ ok: false, reason: 'Add at least one item.' });
    return;
  }
  if (state.items.length > 14) {
    renderResult({ ok: false, reason: 'More than 14 items makes an exhaustive search impractical. Combine some books into one entry, or split the job into two batches.' });
    return;
  }
  const { required, forbidden } = constraints(clusters);
  // A book whose enchantment lost a conflict has nowhere to go, so let the tree
  // drop it rather than reporting the whole job as impossible.
  const forbiddenSet = new Set(forbidden);
  const optional = state.items
    .map((it, i) => (it.ench.some((e) => forbiddenSet.has(e.id)) ? i : -1))
    .filter((i) => i >= 0);
  const opts = {
    itemType: state.itemType,
    edition: state.edition,
    rename: $('rename').checked,
    cap39: $('cap39').checked,
    objective: $('objective').value,
    required, forbidden, optional,
    allowUnused: $('allowUnused').checked,
  };
  const items = state.items.map((i) => ({
    kind: i.kind, pw: i.pw, damaged: i.kind === 'tool' && i.damaged,
    ench: i.ench.map((e) => [e.id, e.level]),
  }));
  $('solve').disabled = true;
  $('status').textContent = state.items.length >= 12
    ? 'searching every tree — this can take up to a minute…'
    : 'searching…';
  getWorker().postMessage({ id: ++jobId, items, opts });
}

/* ----------------------------------------------------------- manual mode */

function resetManual() {
  state.manual = {
    pool: state.items.map((i, idx) => ({
      ref: `input-${idx}`,
      label: `Item #${idx + 1} (${itemLabel(i.kind)})`,
      item: { kind: i.kind, pw: i.pw, damaged: i.kind === 'tool' && i.damaged, ench: new Map(i.ench.map((e) => [e.id, e.level])) },
    })),
    steps: [],
    totalLevels: 0,
    totalXp: 0,
  };
}

function manualOpts() {
  return { itemType: state.itemType, edition: state.edition, rename: $('mRename').checked };
}

function renderManual() {
  if (!state.manual) resetManual();
  const m = state.manual;
  for (const id of ['mTarget', 'mSacrifice']) {
    const sel = $(id);
    const prev = sel.value;
    sel.textContent = '';
    for (const p of m.pool) {
      const o = el('option', null, `${p.label} — ${describe(p.item)}`);
      o.value = p.ref;
      sel.append(o);
    }
    if (m.pool.some((p) => p.ref === prev)) sel.value = prev;
    else if (m.pool.length > 1 && id === 'mSacrifice') sel.selectedIndex = 1;
  }
  renderManualPreview();

  const box = $('mSteps');
  box.textContent = '';
  if (!m.steps.length) {
    box.append(el('p', 'empty', 'No combines yet.'));
  } else {
    const stats = el('div', 'stats');
    const add = (k, v) => { const s = el('div', 'stat'); s.append(el('div', 'k', k), el('div', 'v', String(v))); stats.append(s); };
    add('Total XP', m.totalXp);
    add('Total levels', m.totalLevels);
    add('Worst step', Math.max(...m.steps.map((s) => s.cost)));
    box.append(stats);
    box.append(renderSteps(m.steps, state.items));
  }
}

function describe(item) {
  const parts = [...item.ench.entries()].sort((a, b) => ENCH_INDEX[a[0]] - ENCH_INDEX[b[0]])
    .map(([id, l]) => `${ENCH_BY_ID[id].name}${ENCH_BY_ID[id].max === 1 ? '' : ' ' + (ROMAN[l] || l)}`);
  return `${parts.length ? parts.join(', ') : 'plain'} · pw ${item.pw}`;
}

function poolEntry(ref) { return state.manual.pool.find((p) => p.ref === ref); }

function renderManualPreview() {
  const m = state.manual;
  const box = $('mPreview');
  box.textContent = '';
  const t = poolEntry($('mTarget').value);
  const s = poolEntry($('mSacrifice').value);
  if (!t || !s) { box.append(el('span', 'empty', 'Add items first.')); return; }
  if (t === s) { box.append(el('span', 'empty', 'Pick two different items.')); return; }
  const r = combine(t.item, s.item, manualOpts());
  if (!r) {
    box.append(el('span', null, 'The anvil refuses this combination — nothing would change, or a book cannot take a tool as its sacrifice.'));
    box.classList.add('bad');
    return;
  }
  box.classList.remove('bad');
  box.append(el('div', null, `Cost ${r.cost} level${r.cost === 1 ? '' : 's'} (${xpForLevels(r.cost)} XP)${r.cost >= 40 ? ' — Too Expensive!' : ''}`));
  box.append(enchTags(r.item.ench, r.item.pw));
  if (r.rejected) box.append(el('div', 'note', 'Incompatible enchantments on the sacrifice would be lost.'));
}

function manualCombine() {
  const m = state.manual;
  const t = poolEntry($('mTarget').value);
  const s = poolEntry($('mSacrifice').value);
  if (!t || !s || t === s) return;
  const r = combine(t.item, s.item, manualOpts());
  if (!r) return;
  const step = {
    target: t.ref, targetItem: { ...t.item, ench: new Map(t.item.ench) },
    sacrifice: s.ref, sacrificeItem: { ...s.item, ench: new Map(s.item.ench) },
    result: { ...r.item, ench: new Map(r.item.ench) },
    cost: r.cost, repaired: r.repaired, rejected: r.rejected, renamed: $('mRename').checked,
  };
  m.steps.push(step);
  m.totalLevels += r.cost;
  m.totalXp += xpForLevels(r.cost);
  const ref = `step-${m.steps.length - 1}`;
  m.pool = m.pool.filter((p) => p !== t && p !== s);
  m.pool.push({ ref, label: `Result of step ${m.steps.length}`, item: r.item });
  $('mRename').checked = false;
  renderManual();
}

function manualUndo() {
  const m = state.manual;
  if (!m.steps.length) return;
  const step = m.steps.pop();
  m.totalLevels -= step.cost;
  m.totalXp -= xpForLevels(step.cost);
  const ref = `step-${m.steps.length}`;
  m.pool = m.pool.filter((p) => p.ref !== ref);
  const label = (r) => (r.startsWith('input-')
    ? `Item #${Number(r.slice(6)) + 1} (${itemLabel(state.items[Number(r.slice(6))].kind)})`
    : `Result of step ${Number(r.slice(5)) + 1}`);
  m.pool.push({ ref: step.target, label: label(step.target), item: step.targetItem });
  m.pool.push({ ref: step.sacrifice, label: label(step.sacrifice), item: step.sacrificeItem });
  m.pool.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  renderManual();
}

/* ------------------------------------------------------------- plumbing */

function save() {
  try {
    localStorage.setItem('anvil-optimizer', JSON.stringify({
      edition: state.edition, itemType: state.itemType, items: state.items, choices: state.choices,
      objective: $('objective').value, cap39: $('cap39').checked,
      rename: $('rename').checked, allowUnused: $('allowUnused').checked,
    }));
  } catch (_) { /* private browsing, quota — not worth failing over */ }
}

function load() {
  try {
    const raw = localStorage.getItem('anvil-optimizer');
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (d.edition) state.edition = d.edition;
    if (d.itemType) state.itemType = d.itemType;
    if (Array.isArray(d.items) && d.items.length) {
      state.items = d.items;
      nextId = Math.max(...d.items.map((i) => i.id || 0)) + 1;
    }
    state.choices = d.choices || {};
    if (d.objective) $('objective').value = d.objective;
    $('cap39').checked = !!d.cap39;
    $('rename').checked = !!d.rename;
    $('allowUnused').checked = !!d.allowUnused;
    return true;
  } catch (_) { return false; }
}

function example() {
  state.itemType = 'boots';
  state.items = [
    { id: nextId++, kind: 'tool', pw: 0, damaged: false, ench: [] },
    ...[['protection', 4], ['feather_falling', 4], ['depth_strider', 3], ['soul_speed', 3],
      ['thorns', 3], ['unbreaking', 3], ['mending', 1]]
      .map(([id, level]) => ({ id: nextId++, kind: 'book', pw: 0, damaged: false, ench: [{ id, level }] })),
  ];
  state.choices = {};
}

function refresh() {
  $('edition').value = state.edition;
  $('itemType').value = state.itemType;
  renderItems();
  renderConflicts();
  if (state.mode === 'manual') { resetManual(); renderManual(); }
  save();
}

function init() {
  const typeSel = $('itemType');
  for (const t of ITEM_TYPES) {
    const o = el('option', null, t.name);
    o.value = t.id;
    typeSel.append(o);
  }
  if (!load()) example();

  typeSel.onchange = () => { state.itemType = typeSel.value; pruneItems(); refresh(); };
  $('edition').onchange = () => { state.edition = $('edition').value; pruneItems(); refresh(); };
  $('addBook').onclick = () => { state.items.push(newItem('book')); refresh(); };
  $('addTool').onclick = () => { state.items.push(newItem('tool')); refresh(); };
  $('clearItems').onclick = () => { state.items = []; state.choices = {}; refresh(); };
  $('loadExample').onclick = () => { example(); refresh(); };
  $('solve').onclick = doSolve;
  for (const id of ['objective', 'cap39', 'rename', 'allowUnused']) $(id).onchange = save;

  $('mCombine').onclick = manualCombine;
  $('mUndo').onclick = manualUndo;
  $('mReset').onclick = () => { resetManual(); renderManual(); };
  $('mTarget').onchange = renderManualPreview;
  $('mSacrifice').onchange = renderManualPreview;
  $('mRename').onchange = renderManualPreview;

  for (const tab of document.querySelectorAll('.tab')) {
    tab.onclick = () => {
      state.mode = tab.dataset.mode;
      for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t === tab);
      $('optimalPane').hidden = state.mode !== 'optimal';
      $('manualPane').hidden = state.mode !== 'manual';
      if (state.mode === 'manual') { resetManual(); renderManual(); }
    };
  }

  refresh();
  doSolve();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

init();
