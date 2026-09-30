// Checks js/anvil.js against every worked example on
// https://minecraft.wiki/w/Anvil_mechanics, plus a few solver invariants.
import { combine } from './js/anvil.js';
import { solve } from './js/solver.js';

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

const tool = (e) => ({ kind: 'tool', pw: 0, ench: new Map(e), damaged: false });
const book = (e) => ({ kind: 'book', pw: 0, ench: new Map(e), damaged: false });
const opts = (edition) => ({ itemType: 'sword', edition, rename: false });

// --- the wiki's four "Costs for combining enchantments" examples, both editions
const examples = [
  ['equal enchantments',
    tool([['sharpness', 3], ['knockback', 2], ['looting', 3]]), tool([['sharpness', 3], ['looting', 3]]), 16, 1],
  ['equal enchantments, reversed',
    tool([['sharpness', 3], ['looting', 3]]), tool([['sharpness', 3], ['knockback', 2], ['looting', 3]]), 20, 5],
  ['unequal enchantments',
    tool([['sharpness', 3], ['knockback', 2], ['looting', 1]]), tool([['sharpness', 1], ['looting', 3]]), 15, 8],
  ['unequal enchantments, reversed',
    tool([['sharpness', 1], ['looting', 3]]), tool([['sharpness', 3], ['knockback', 2], ['looting', 1]]), 19, 6],
  ['conflicting enchantments',
    tool([['sharpness', 2], ['looting', 2]]), tool([['smite', 5], ['looting', 2]]), 13, 4],
  ['conflicting enchantments, reversed',
    tool([['smite', 5], ['looting', 2]]), tool([['sharpness', 2], ['looting', 2]]), 13, 4],
  ['book sacrifice, with one enchantment the sword cannot take',
    tool([['looting', 2]]), book([['protection', 3], ['sharpness', 1], ['looting', 2]]), 7, 3],
];
for (const [name, t, s, java, bedrock] of examples) {
  check(`${name} (Java)`, combine(t, s, opts('java')).cost, java);
  check(`${name} (Bedrock)`, combine(t, s, opts('bedrock')).cost, bedrock);
}

// --- resulting enchantments
check('equal levels step up, capped at the maximum',
  [...combine(tool([['sharpness', 3], ['looting', 3]]), tool([['sharpness', 3], ['looting', 3]]), opts('java')).item.ench],
  [['sharpness', 4], ['looting', 3]]);

// --- the wiki's "the choice of sacrifice matters" example
check('Soul Speed III book + Mending book', combine(book([['soul_speed', 3]]), book([['mending', 1]]), opts('java')).cost, 2);
check('Mending book + Soul Speed III book', combine(book([['mending', 1]]), book([['soul_speed', 3]]), opts('java')).cost, 12);

// --- prior work penalty doubling: 0, 1, 3, 7, 15
check('prior work chain',
  [0, 1, 3, 7].map((pw) => combine({ ...tool([]), pw }, book([['mending', 1]]), opts('java')).item.pw),
  [1, 3, 7, 15]);

// --- operations an anvil refuses
check('a book cannot take a tool as its sacrifice', combine(book([['mending', 1]]), tool([['sharpness', 1]]), opts('java')), null);
check('nothing to do', combine(tool([['sharpness', 1]]), tool([]), opts('java')), null);

// --- the wiki's worked seven-books-onto-boots pairing example reaches 68 levels
// over three workings of the boots, which is what minimising final prior work finds.
const boots = [
  { kind: 'tool', pw: 0, ench: new Map(), damaged: false },
  ...[['soul_speed', 3], ['thorns', 3], ['feather_falling', 4], ['depth_strider', 3],
    ['protection', 4], ['unbreaking', 3], ['mending', 1]]
    .map(([id, l]) => ({ kind: 'book', pw: 0, ench: new Map([[id, l]]), damaged: false })),
];
const base = { itemType: 'boots', edition: 'java', rename: false, cap39: false, required: [], forbidden: [], allowUnused: false };
const byPw = solve(boots, { ...base, objective: 'pw' });
check('min prior work matches the wiki pairing example', [byPw.totalLevels, byPw.finalPriorWork, byPw.maxStep], [68, 7, 21]);
const byLevels = solve(boots, { ...base, objective: 'levels' });
check('min levels beats it on levels', byLevels.totalLevels < byPw.totalLevels, true);
check('...but not on prior work', byLevels.finalPriorWork > byPw.finalPriorWork, true);
check('all seven books are used', byLevels.steps.length, 7);

// --- the 39-level cap is respected
const capped = solve(boots, { ...base, objective: 'levels', cap39: true });
check('capped solve keeps every step under 40', capped.maxStep < 40, true);
const stuck = solve([{ kind: 'tool', pw: 63, ench: new Map(), damaged: false }, ...boots.slice(1, 3)],
  { ...base, objective: 'levels', cap39: true });
check('an item past prior work 39 cannot be worked at all', stuck.ok, false);

// --- constraints pick the surviving enchantment out of a conflicting pool
const sword = [
  { kind: 'tool', pw: 0, ench: new Map(), damaged: false },
  { kind: 'book', pw: 0, ench: new Map([['sharpness', 5]]), damaged: false },
  { kind: 'book', pw: 0, ench: new Map([['smite', 5]]), damaged: false },
];
for (const [keep, drop, dropIdx] of [['sharpness', 'smite', 2], ['smite', 'sharpness', 1]]) {
  const r = solve(sword, {
    ...base, itemType: 'sword', objective: 'levels',
    required: [keep], forbidden: [drop], optional: [dropIdx],
  });
  check(`constraint keeps ${keep}`,
    [r.ok, r.finalItem.ench.some(([id]) => id === keep), r.finalItem.ench.some(([id]) => id === drop)],
    [true, true, false]);
  // The losing book cannot be consumed at all, so it has to be set aside.
  check(`the ${drop} book is left unused`, r.unusedIndices, [dropIdx]);
}

// A book that carries both a losing and a wanted enchantment is still worth using.
const mixed = [
  { kind: 'tool', pw: 0, ench: new Map(), damaged: false },
  { kind: 'book', pw: 0, ench: new Map([['sharpness', 5]]), damaged: false },
  { kind: 'book', pw: 0, ench: new Map([['smite', 5], ['looting', 3]]), damaged: false },
];
const m = solve(mixed, {
  ...base, itemType: 'sword', objective: 'levels',
  required: ['sharpness'], forbidden: ['smite'], optional: [2],
});
check('a mixed book is still consumed for its usable enchantment',
  [m.ok, m.unusedIndices.length, m.finalItem.ench.map(([id]) => id).sort()],
  [true, 0, ['looting', 'sharpness']]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
