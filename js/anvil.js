// Faithful model of a single anvil operation.
// Reference: https://minecraft.wiki/w/Anvil_mechanics
import { canApplyTo, conflicts, multiplier, ENCH_BY_ID } from './data.js';

export const TOO_EXPENSIVE = 40; // an operation costing 40+ levels is refused in survival

/**
 * An item is { kind: 'tool'|'book', pw: number, ench: Map<enchId, level>, damaged: boolean }.
 * `pw` is the prior work penalty value itself (0, 1, 3, 7, 15, ...), not the use count.
 */
export function makeItem(kind, pw, enchEntries, damaged = false) {
  return { kind, pw, ench: new Map(enchEntries), damaged };
}

/**
 * Combine `target` (left slot) with `sacrifice` (right slot).
 * Returns null when the anvil would refuse the operation outright.
 * `opts`: { itemType, edition: 'java'|'bedrock', rename: boolean }
 */
export function combine(target, sacrifice, opts) {
  // A book cannot be the target of a tool sacrifice — the anvil has no such operation.
  if (target.kind === 'book' && sacrifice.kind === 'tool') return null;

  const edition = opts.edition || 'java';
  const targetIsBook = target.kind === 'book';
  const sacrificeIsBook = sacrifice.kind === 'book';
  const itemType = targetIsBook ? 'book' : opts.itemType;

  let cost = target.pw + sacrifice.pw;
  if (opts.rename) cost += 1;

  // Tool + tool on a damaged target also repairs it, for a flat 2 levels.
  let repaired = false;
  if (!targetIsBook && !sacrificeIsBook && target.damaged) { cost += 2; repaired = true; }

  const ench = new Map(target.ench);
  let anyApplied = false;
  let anyRejected = false;

  for (const [id, sacLevel] of sacrifice.ench) {
    const info = ENCH_BY_ID[id];
    if (!info) continue;
    const targetLevel = ench.get(id) || 0;
    let level = targetLevel === sacLevel ? sacLevel + 1 : Math.max(targetLevel, sacLevel);

    let ok = canApplyTo(id, itemType);
    // Each enchantment already on the (evolving) target that clashes adds 1 level in Java.
    for (const other of ench.keys()) {
      if (conflicts(other, id)) {
        ok = false;
        if (edition === 'java') cost += 1;
      }
    }
    if (!ok) { anyRejected = true; continue; }

    level = Math.min(level, info.max);
    const mult = multiplier(id, sacrificeIsBook, edition);
    // Java charges for the full resulting level; Bedrock only for the increase.
    cost += edition === 'java' ? mult * level : mult * Math.max(0, level - targetLevel);
    ench.set(id, level);
    anyApplied = true;
  }

  // Nothing happened: the anvil shows a red X and refuses.
  if (!anyApplied && !repaired && !opts.rename) return null;
  if (anyRejected && !anyApplied && !repaired && !opts.rename) return null;

  // The result's penalty doubles off the larger of the two inputs.
  const pw = 2 * Math.max(target.pw, sacrifice.pw) + 1;

  return {
    item: { kind: target.kind, pw, ench, damaged: repaired ? false : target.damaged },
    cost,
    repaired,
    rejected: anyRejected,
    tooExpensive: cost >= TOO_EXPENSIVE,
  };
}

/** Prior work penalty value for a given number of previous anvil uses. */
export function pwFromUseCount(n) { return Math.pow(2, n) - 1; }

/** Use count implied by a penalty value (inverse of the above, for display). */
export function useCountFromPw(pw) { return pw <= 0 ? 0 : Math.round(Math.log2(pw + 1)); }
