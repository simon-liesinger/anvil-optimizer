import { solve } from './solver.js';

self.onmessage = (e) => {
  const { id, items, opts } = e.data;
  try {
    const revived = items.map((i) => ({ ...i, ench: new Map(i.ench) }));
    self.postMessage({ id, result: solve(revived, opts) });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
