// Exhaustive search over every binary combination tree, made tractable by
// dynamic programming over subsets plus Pareto pruning.
//
// dp[mask] holds, for each distinct resulting item, the set of ways to merge exactly
// the items in `mask` into it that are not dominated on (total xp, total levels,
// resulting prior work). Any objective the app offers is monotone in those three,
// and a future step's cost is monotone in the prior work it starts from, so
// discarding dominated candidates never discards an optimal tree.
import { combine } from './anvil.js';
import { xpForLevels, ENCH_INDEX } from './data.js';

const PER_SIGNATURE_CAP = 48;
const PER_MASK_CAP = 1200;

function signature(item) {
  const parts = [...item.ench.entries()].sort((a, b) => ENCH_INDEX[a[0]] - ENCH_INDEX[b[0]]);
  return `${item.kind}|${item.damaged ? 'd' : ''}|${parts.map(([k, v]) => `${k}${v}`).join(',')}`;
}

function popcount(x) { let c = 0; while (x) { x &= x - 1; c++; } return c; }

/** Keep only candidates on the 3-D Pareto front, then cap the list. */
function prune(list) {
  list.sort((a, b) => a.levels - b.levels || a.xp - b.xp || a.item.pw - b.item.pw);
  const kept = [];
  for (const c of list) {
    let dominated = false;
    for (const k of kept) {
      if (k.xp <= c.xp && k.levels <= c.levels && k.item.pw <= c.item.pw) { dominated = true; break; }
    }
    if (!dominated) kept.push(c);
    if (kept.length >= PER_SIGNATURE_CAP) break;
  }
  return kept;
}

/**
 * @param items  array of { kind:'tool'|'book', pw, ench: Map<id,level>, damaged }
 * @param opts   { itemType, edition, rename, cap39, objective:'xp'|'levels'|'pw',
 *                 required: string[], forbidden: string[],
 *                 allowUnused: boolean, optional: number[] }
 *
 * `optional` lists item indices the tree may leave out. Pinning the winner of an
 * enchantment conflict makes the losing books optional automatically: an anvil
 * refuses a combine in which every enchantment on the sacrifice is rejected, so a
 * Smite book has nowhere to go once you have committed to Sharpness.
 */
export function solve(items, opts) {
  const n = items.length;
  if (n === 0) return { ok: false, reason: 'No items.' };
  const full = (1 << n) - 1;
  const toolMask = items.reduce((m, it, i) => (it.kind === 'tool' ? m | (1 << i) : m), 0);
  const hasTool = toolMask !== 0;

  // Renaming is charged once, on the final step only.
  const stepOpts = { itemType: opts.itemType, edition: opts.edition, rename: false };

  const dp = new Array(1 << n);
  for (let i = 0; i < n; i++) {
    const item = { kind: items[i].kind, pw: items[i].pw, ench: new Map(items[i].ench), damaged: !!items[i].damaged };
    dp[1 << i] = new Map([[signature(item), [{ item, xp: 0, levels: 0, maxStep: 0, from: null }]]]);
  }

  let explored = 0;
  for (let mask = 1; mask <= full; mask++) {
    if (popcount(mask) < 2) continue;
    // A subset that leaves out some tools but keeps others can still be a legal
    // intermediate (tool + tool), so every subset is worth building.
    const groups = new Map();
    for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
      const other = mask ^ sub;
      const targets = dp[sub];
      const sacrifices = dp[other];
      if (!targets || !sacrifices) continue;
      for (const tList of targets.values()) {
        for (const t of tList) {
          for (const sList of sacrifices.values()) {
            for (const s of sList) {
              explored++;
              const r = combine(t.item, s.item, stepOpts);
              if (!r) continue;
              if (opts.cap39 && r.tooExpensive) continue;
              const cand = {
                item: r.item,
                xp: t.xp + s.xp + xpForLevels(r.cost),
                levels: t.levels + s.levels + r.cost,
                maxStep: Math.max(t.maxStep, s.maxStep, r.cost),
                from: { a: sub, b: other, cost: r.cost, repaired: r.repaired, rejected: r.rejected },
                _t: t, _s: s,
              };
              const sig = signature(r.item);
              if (!groups.has(sig)) groups.set(sig, []);
              groups.get(sig).push(cand);
            }
          }
        }
      }
    }
    if (groups.size === 0) { dp[mask] = null; continue; }
    let total = 0;
    const out = new Map();
    for (const [sig, list] of groups) {
      const kept = prune(list);
      out.set(sig, kept);
      total += kept.length;
    }
    // Under an extreme input this keeps memory bounded; the survivors are the
    // cheapest ones, so the reported tree stays a real, valid tree.
    if (total > PER_MASK_CAP) {
      const flat = [...out.values()].flat().sort((a, b) => a.levels - b.levels || a.xp - b.xp);
      flat.length = PER_MASK_CAP;
      out.clear();
      for (const c of flat) {
        const sig = signature(c.item);
        if (!out.has(sig)) out.set(sig, []);
        out.get(sig).push(c);
      }
    }
    dp[mask] = out;
  }

  // Which final subsets are acceptable? Everything not marked optional must be used.
  let mandatory = full;
  if (opts.allowUnused) {
    mandatory = 0;
  } else {
    for (const i of opts.optional || []) mandatory &= ~(1 << i);
  }
  const candidateMasks = [];
  for (let mask = 1; mask <= full; mask++) {
    if (!dp[mask] && popcount(mask) > 1) continue;
    if (!dp[mask]) continue;
    if ((mask & mandatory) !== mandatory) continue;
    if (hasTool && (mask & toolMask) === 0) continue; // the result must be the tool
    candidateMasks.push(mask);
  }
  candidateMasks.sort((a, b) => popcount(b) - popcount(a));

  const required = new Set(opts.required || []);
  const forbidden = new Set(opts.forbidden || []);
  const finals = [];
  for (const mask of candidateMasks) {
    for (const list of dp[mask].values()) {
      for (const c of list) {
        if (hasTool && c.item.kind !== 'tool') continue;
        let bad = false;
        for (const id of required) if (!c.item.ench.has(id)) { bad = true; break; }
        if (!bad) for (const id of forbidden) if (c.item.ench.has(id)) { bad = true; break; }
        if (bad) continue;
        // The optional rename rides along on the last step.
        const extra = opts.rename ? 1 : 0;
        const lastCost = (c.from ? c.from.cost : 0) + extra;
        if (opts.cap39 && lastCost >= 40) continue;
        finals.push({
          cand: c,
          mask,
          unused: full & ~mask,
          levels: c.levels + extra,
          xp: c.xp + (c.from ? xpForLevels(lastCost) - xpForLevels(c.from.cost) : 0),
          maxStep: Math.max(c.maxStep, lastCost),
          pw: c.item.pw,
        });
      }
    }
  }

  if (finals.length === 0) {
    return {
      ok: false,
      reason: opts.cap39
        ? 'No tree exists where every step stays at or below 39 levels (with these constraints).'
        : 'No valid tree exists for these items and constraints.',
      explored,
    };
  }

  const metric = opts.objective === 'xp' ? (f) => [f.xp, f.levels, f.pw]
    : opts.objective === 'levels' ? (f) => [f.levels, f.xp, f.pw]
    : (f) => [f.pw, f.levels, f.xp];
  // When the user asked to leave items out, cheapness leads. When items only became
  // droppable because they lost an enchantment conflict, dropping is a last resort:
  // a book the user supplied should be used whenever the anvil will take it.
  const key = opts.allowUnused
    ? (f) => [...metric(f), popcount(f.unused)]
    : (f) => [popcount(f.unused), ...metric(f)];
  finals.sort((a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });

  const best = finals[0];
  const steps = flatten(best.cand, best.mask);
  if (opts.rename && steps.length) {
    const last = steps[steps.length - 1];
    last.cost += 1;
    last.renamed = true;
  }
  return {
    ok: true,
    steps,
    totalLevels: best.levels,
    totalXp: best.xp,
    finalPriorWork: best.pw,
    maxStep: best.maxStep,
    finalItem: serialize(best.cand.item),
    unusedIndices: indicesOf(best.unused),
    explored,
  };
}

function indicesOf(mask) {
  const out = [];
  for (let i = 0; mask; i++, mask >>= 1) if (mask & 1) out.push(i);
  return out;
}

function serialize(item) {
  return { kind: item.kind, pw: item.pw, damaged: item.damaged, ench: [...item.ench.entries()] };
}

/** Walk the back-pointers into a post-order list of anvil operations. */
function flatten(cand, rootMask) {
  const steps = [];
  const label = (c, mask) => (c.from ? null : `input-${indicesOf(mask)[0]}`);

  function walk(c, mask) {
    if (!c.from) return { ref: label(c, mask), item: c.item };
    const a = walk(c._t, c.from.a);
    const b = walk(c._s, c.from.b);
    const step = {
      index: steps.length,
      target: a.ref, targetItem: serialize(a.item),
      sacrifice: b.ref, sacrificeItem: serialize(b.item),
      result: serialize(c.item),
      cost: c.from.cost,
      repaired: c.from.repaired,
      rejected: c.from.rejected,
    };
    steps.push(step);
    step.ref = `step-${step.index}`;
    return { ref: step.ref, item: c.item };
  }
  walk(cand, rootMask);
  return steps;
}
