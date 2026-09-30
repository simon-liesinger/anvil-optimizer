# Anvil Optimizer

A small offline-capable web app (PWA) that works out the cheapest order to combine
Minecraft enchanted books and tools on an anvil.

**→ [Open the app](https://simon-liesinger.github.io/anvil-optimizer/)**

## What it does

Give it any set of input items — one or more tools (all of the same type) and any
number of enchanted books, each with whatever enchantments and prior work penalty
they already carry — and it searches **every possible combination tree** for the
best one.

You can optimise for any of six targets:

| Minimise | Unconstrained | Every step ≤ 39 levels |
| --- | --- | --- |
| Total experience | ✓ | ✓ |
| Total levels | ✓ | ✓ |
| Final prior work penalty | ✓ | ✓ |

The 39-level variants only consider trees an anvil will actually accept in
survival, since an operation costing 40 or more shows *Too Expensive!*.

These really do give different answers. For a plain helmet at prior work 3 plus
seven books, minimising levels finds a 69-level tree costing 1946 XP, while
minimising experience finds a 77-level tree costing only 1929 XP — more levels
spread over cheaper steps, because XP per level grows faster than linearly.

Other features:

- **Incompatible enchantments.** If the pool contains enchantments that cannot
  share an item (Sharpness/Smite, Fortune/Silk Touch, Mending/Infinity, …), the app
  detects it and lets you pin which one should survive on the finished item.
- **Build it yourself.** Switch to the manual tab to choose each combine by hand,
  with the cost, the resulting enchantments and the new prior work shown live.
  Handy when you have already done some anvilling and want to know where you stand.
- **Java and Bedrock.** Java charges for the enchantment's full resulting level;
  Bedrock only charges for the increase, so the optimal order differs.
- **Installable and offline.** It is a PWA with a service worker; add it to your
  home screen and it keeps working without a connection.
- Renaming the finished item (+1 level) and repairing damaged tools (+2 levels)
  can both be folded into the search.

## Mechanics

Everything follows the [Minecraft Wiki anvil mechanics](https://minecraft.wiki/w/Anvil_mechanics)
page. The parts that matter most:

- Cost = both items' prior work penalties, plus 1 if renaming, plus 2 if the target
  is damaged and is being repaired, plus the enchantment cost.
- Enchantment cost, per enchantment on the sacrifice: the multiplier for that
  enchantment (halved, minimum 1, when the sacrifice is a book) times the level on
  the **result** in Java, or times the **increase** in level in Bedrock.
- Equal levels combine into one level higher, capped at the enchantment's maximum.
- An enchantment the target cannot take is ignored; one that clashes with an
  enchantment already on the target is dropped and adds 1 level in Java.
- The result's prior work penalty is `2 × max(target, sacrifice) + 1`, which is why
  pairing items of equal penalty together is so much cheaper than adding books one
  at a time.
- "Total experience" sums, over every step, the XP needed to reach that step's level
  cost from level 0.

`js/anvil.js` is checked against every worked example on that wiki page — see
`test.mjs`.

## How the search works

A brute-force walk over combination trees is factorial, so the solver does dynamic
programming over subsets instead (`js/solver.js`). `dp[mask]` holds, for each
distinct item that the items in `mask` can merge into, the ways of getting there
that are not dominated on `(total XP, total levels, resulting prior work)`.

Every objective the app offers is monotone in those three numbers, and a later
step's cost is monotone in the prior work it starts from, so throwing away a
dominated candidate can never throw away an optimal tree — the answer is exact,
not a heuristic. The single Pareto front also answers all three metrics at once.

Cost is O(3ⁿ) splits. In practice: 8 items in ~20 ms, 12 in ~2 s, 14 in ~30 s.
The search runs in a Web Worker, so the page stays responsive. 14 items is the cap.

## Running locally

It is plain ES modules with no build step, but it does need to be served over HTTP
(`file://` will not load modules or the worker):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Tests:

```sh
node test.mjs
```

## Layout

```
index.html            markup
style.css             styling, dark and light
js/data.js            enchantment table, multipliers, conflicts, XP curve
js/anvil.js           one anvil operation
js/solver.js          subset DP over all combination trees
js/worker.js          runs the solver off the main thread
js/app.js             UI
sw.js                 service worker (network first, cache fallback)
test.mjs              checks against the wiki's worked examples
```
