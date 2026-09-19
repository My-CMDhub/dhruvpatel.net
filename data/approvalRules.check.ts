// node data/approvalRules.check.ts — the re-enactment must keep the kernel's tiers and the verdict's order.
import assert from 'node:assert/strict'
import { evaluate, verdict, offersAlways } from './approvalRules.ts'

assert.equal(evaluate('Empty Bin').kind, 'refuse')
assert.equal(evaluate('Delete Immediately…').kind, 'refuse') // irreversible wins over "delete"
const bin = evaluate('Move to Bin')
assert.equal(bin.kind, 'confirm')
assert.equal(offersAlways(bin), false) // destructive: no "Always"
assert.equal(evaluate('Q3-draft.pdf').kind, 'allow')

assert.match((verdict(null) as { reason: string }).reason, /programmatic press/)
assert.match((verdict({ pointer: false, clickCount: 0, rowSettledMs: 5000 }) as { reason: string }).reason, /not a left mouse-up/)
assert.match((verdict({ pointer: true, clickCount: 2, rowSettledMs: 5000 }) as { reason: string }).reason, /multi-click/)
assert.match((verdict({ pointer: true, clickCount: 1, rowSettledMs: 300 }) as { reason: string }).reason, /300 ms, needs 800 ms/)
assert.deepEqual(verdict({ pointer: true, clickCount: 1, rowSettledMs: 900 }), { ok: true })
console.log('ok · approval rules')
