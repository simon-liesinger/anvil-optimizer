// Enchantment + item data, transcribed from https://minecraft.wiki/w/Anvil_mechanics
// `mult` is the Java "multiplier from item"; book multiplier is max(1, floor(mult/2)),
// which is exactly the wiki's "multiplier from book" column.

export const ITEM_TYPES = [
  { id: 'sword',       name: 'Sword' },
  { id: 'axe',         name: 'Axe' },
  { id: 'pickaxe',     name: 'Pickaxe' },
  { id: 'shovel',      name: 'Shovel' },
  { id: 'hoe',         name: 'Hoe' },
  { id: 'shears',      name: 'Shears' },
  { id: 'mace',        name: 'Mace' },
  { id: 'spear',       name: 'Spear' },
  { id: 'trident',     name: 'Trident' },
  { id: 'bow',         name: 'Bow' },
  { id: 'crossbow',    name: 'Crossbow' },
  { id: 'fishing_rod', name: 'Fishing Rod' },
  { id: 'helmet',      name: 'Helmet' },
  { id: 'chestplate',  name: 'Chestplate' },
  { id: 'leggings',    name: 'Leggings' },
  { id: 'boots',       name: 'Boots' },
  { id: 'turtle_shell',name: 'Turtle Shell' },
  { id: 'elytra',      name: 'Elytra' },
  { id: 'shield',      name: 'Shield' },
  { id: 'flint_and_steel', name: 'Flint and Steel' },
  { id: 'carrot_on_a_stick', name: 'Carrot on a Stick' },
  { id: 'warped_fungus_on_a_stick', name: 'Warped Fungus on a Stick' },
  { id: 'brush',       name: 'Brush' },
];

const ARMOR = ['helmet', 'chestplate', 'leggings', 'boots', 'turtle_shell'];
const HEAD = ['helmet', 'turtle_shell'];
// Every item that accepts Unbreaking / Curse of Vanishing.
const DURABLE = [
  'pickaxe', 'shovel', 'axe', 'hoe', 'shears', 'sword', 'mace', 'spear', 'trident',
  'bow', 'crossbow', 'fishing_rod', 'flint_and_steel', 'carrot_on_a_stick',
  'warped_fungus_on_a_stick', 'shield', 'elytra', 'brush',
  'helmet', 'chestplate', 'leggings', 'boots', 'turtle_shell',
];

// mult = Java multiplier from item. beMult overrides it on Bedrock.
export const ENCHANTMENTS = [
  { id: 'protection',            name: 'Protection',           max: 4, mult: 1, items: ARMOR },
  { id: 'fire_protection',       name: 'Fire Protection',      max: 4, mult: 2, items: ARMOR },
  { id: 'feather_falling',       name: 'Feather Falling',      max: 4, mult: 2, items: ['boots'] },
  { id: 'blast_protection',      name: 'Blast Protection',     max: 4, mult: 4, items: ARMOR },
  { id: 'projectile_protection', name: 'Projectile Protection',max: 4, mult: 2, items: ARMOR },
  { id: 'thorns',                name: 'Thorns',               max: 3, mult: 8, items: ARMOR },
  { id: 'respiration',           name: 'Respiration',          max: 3, mult: 4, items: HEAD },
  { id: 'depth_strider',         name: 'Depth Strider',        max: 3, mult: 4, items: ['boots'] },
  { id: 'aqua_affinity',         name: 'Aqua Affinity',        max: 1, mult: 4, items: HEAD },
  { id: 'sharpness',             name: 'Sharpness',            max: 5, mult: 1, items: ['sword', 'axe', 'spear'] },
  { id: 'smite',                 name: 'Smite',                max: 5, mult: 2, items: ['sword', 'axe', 'mace', 'spear'] },
  { id: 'bane_of_arthropods',    name: 'Bane of Arthropods',   max: 5, mult: 2, items: ['sword', 'axe', 'mace', 'spear'] },
  { id: 'knockback',             name: 'Knockback',            max: 2, mult: 2, items: ['sword', 'spear'] },
  { id: 'fire_aspect',           name: 'Fire Aspect',          max: 2, mult: 4, items: ['sword', 'mace', 'spear'] },
  { id: 'looting',               name: 'Looting',              max: 3, mult: 4, items: ['sword', 'spear'] },
  { id: 'sweeping_edge',         name: 'Sweeping Edge',        max: 3, mult: 4, items: ['sword'], javaOnly: true },
  { id: 'efficiency',            name: 'Efficiency',           max: 5, mult: 1, items: ['pickaxe', 'shovel', 'axe', 'hoe', 'shears'] },
  { id: 'silk_touch',            name: 'Silk Touch',           max: 1, mult: 8, items: ['pickaxe', 'shovel', 'axe', 'hoe', 'shears'] },
  { id: 'fortune',               name: 'Fortune',              max: 3, mult: 4, items: ['pickaxe', 'shovel', 'axe', 'hoe'] },
  { id: 'unbreaking',            name: 'Unbreaking',           max: 3, mult: 2, items: DURABLE },
  { id: 'power',                 name: 'Power',                max: 5, mult: 1, items: ['bow'] },
  { id: 'punch',                 name: 'Punch',                max: 2, mult: 4, items: ['bow'] },
  { id: 'flame',                 name: 'Flame',                max: 1, mult: 4, items: ['bow'] },
  { id: 'infinity',              name: 'Infinity',             max: 1, mult: 8, items: ['bow'] },
  { id: 'luck_of_the_sea',       name: 'Luck of the Sea',      max: 3, mult: 4, items: ['fishing_rod'] },
  { id: 'lure',                  name: 'Lure',                 max: 3, mult: 4, items: ['fishing_rod'] },
  { id: 'frost_walker',          name: 'Frost Walker',         max: 2, mult: 4, items: ['boots'] },
  { id: 'mending',               name: 'Mending',              max: 1, mult: 4, items: DURABLE },
  { id: 'impaling',              name: 'Impaling',             max: 5, mult: 4, beMult: 2, items: ['trident'] },
  { id: 'riptide',               name: 'Riptide',              max: 3, mult: 4, items: ['trident'] },
  { id: 'loyalty',               name: 'Loyalty',              max: 3, mult: 1, items: ['trident'] },
  { id: 'channeling',            name: 'Channeling',           max: 1, mult: 8, items: ['trident'] },
  { id: 'multishot',             name: 'Multishot',            max: 1, mult: 4, items: ['crossbow'] },
  { id: 'piercing',              name: 'Piercing',             max: 4, mult: 1, items: ['crossbow'] },
  { id: 'quick_charge',          name: 'Quick Charge',         max: 3, mult: 2, items: ['crossbow'] },
  { id: 'soul_speed',            name: 'Soul Speed',           max: 3, mult: 8, items: ['boots'] },
  { id: 'swift_sneak',           name: 'Swift Sneak',          max: 3, mult: 8, items: ['leggings'] },
  { id: 'wind_burst',            name: 'Wind Burst',           max: 3, mult: 4, items: ['mace'] },
  { id: 'density',               name: 'Density',              max: 5, mult: 2, items: ['mace'] },
  { id: 'breach',                name: 'Breach',               max: 4, mult: 4, items: ['mace'] },
  { id: 'lunge',                 name: 'Lunge',                max: 3, mult: 2, items: ['spear'] },
  { id: 'curse_of_binding',      name: 'Curse of Binding',     max: 1, mult: 8, items: [...ARMOR, 'elytra'] },
  { id: 'curse_of_vanishing',    name: 'Curse of Vanishing',   max: 1, mult: 8, items: DURABLE },
];

export const ENCH_BY_ID = Object.fromEntries(ENCHANTMENTS.map((e) => [e.id, e]));
export const ENCH_INDEX = Object.fromEntries(ENCHANTMENTS.map((e, i) => [e.id, i]));

// Mutually exclusive groups: every pair inside a group is incompatible.
// Java's damage group also covers Impaling, Density and Breach, which is why two
// such books can never sit on one item.
const EXCLUSIVE_GROUPS = [
  ['sharpness', 'smite', 'bane_of_arthropods', 'impaling', 'density', 'breach'],
  ['protection', 'fire_protection', 'blast_protection', 'projectile_protection'],
  ['fortune', 'silk_touch'],
  ['depth_strider', 'frost_walker'],
  ['infinity', 'mending'],
  ['multishot', 'piercing'],
];
// Riptide is not a clean group: it clashes with Loyalty and Channeling, but those
// two are compatible with each other.
const EXTRA_PAIRS = [['riptide', 'loyalty'], ['riptide', 'channeling']];

const conflictSets = {};
for (const e of ENCHANTMENTS) conflictSets[e.id] = new Set();
for (const g of EXCLUSIVE_GROUPS) {
  for (const a of g) for (const b of g) if (a !== b) conflictSets[a].add(b);
}
for (const [a, b] of EXTRA_PAIRS) { conflictSets[a].add(b); conflictSets[b].add(a); }

export function conflicts(a, b) {
  return a !== b && conflictSets[a].has(b);
}

/** Enchantments this item type can hold. Books hold anything. */
export function applicable(itemType, edition = 'java') {
  return ENCHANTMENTS.filter(
    (e) => (itemType === 'book' || e.items.includes(itemType)) && !(e.javaOnly && edition === 'bedrock'),
  );
}

export function canApplyTo(enchId, itemType) {
  return itemType === 'book' || ENCH_BY_ID[enchId].items.includes(itemType);
}

/** Java: multiplier from item / from book. Bedrock uses the same columns. */
export function multiplier(enchId, sacrificeIsBook, edition = 'java') {
  const e = ENCH_BY_ID[enchId];
  const base = edition === 'bedrock' && e.beMult != null ? e.beMult : e.mult;
  return sacrificeIsBook ? Math.max(1, Math.floor(base / 2)) : base;
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Cumulative experience points needed to reach `level` from level 0. */
export function xpForLevels(level) {
  if (level <= 0) return 0;
  if (level <= 16) return level * level + 6 * level;
  if (level <= 31) return Math.round(2.5 * level * level - 40.5 * level + 360);
  return Math.round(4.5 * level * level - 162.5 * level + 2220);
}

/** Connected groups of mutually-incompatible enchantments present in `ids`. */
export function conflictClusters(ids) {
  const present = ids.filter((id) => ENCH_BY_ID[id]);
  const seen = new Set();
  const clusters = [];
  for (const id of present) {
    if (seen.has(id)) continue;
    const stack = [id];
    const cluster = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop();
      cluster.push(cur);
      for (const other of present) {
        if (!seen.has(other) && conflicts(cur, other)) { seen.add(other); stack.push(other); }
      }
    }
    if (cluster.length > 1) {
      clusters.push(cluster.sort((a, b) => ENCH_INDEX[a] - ENCH_INDEX[b]));
    }
  }
  return clusters;
}
