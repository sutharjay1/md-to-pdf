# Documented false positives

## `react-doctor/async-await-in-loop` — apps/web/src/lib/diagrams.ts (`inlineDiagrams`)

**Outcome: rejected, with measurement.**

The rule asks for `await Promise.all(items.map(...))`. Mermaid draws each diagram by inserting a temporary
node into the live document and measuring it, so concurrent renders interleave layout work instead of
overlapping it.

Measured in Chrome on the 21-diagram showcase document (`apps/web/src/welcome.md`), cold load, timing the
draw loop only:

| Variant                    | Time to draw 21 diagrams |
| -------------------------- | ------------------------ |
| Sequential `for…of` (kept) | 583 ms                   |
| `Promise.all` over `map`   | 3276 / 3574 / 4117 / 4600 ms |

The loop also builds the output string in document order, and every draw is served from a cache after the
first pass. Keep it sequential.

Predicate for re-checking: if `draw()` stops touching the document (an offscreen or worker-based renderer),
re-measure before applying the rule.
