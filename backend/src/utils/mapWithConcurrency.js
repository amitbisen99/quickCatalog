/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once —
 * a bounded Promise.all. Used for per-row image compression in bulk
 * imports: each row's images are independent (safe to run in any order/
 * in parallel, unlike the category/spec lookups above them in the same
 * loop, which share a cache and must stay sequential to avoid creating
 * duplicates), but running all of them fully unbounded on a large file
 * would spike memory/CPU at once instead of smoothing it out.
 */
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await fn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

module.exports = mapWithConcurrency;
