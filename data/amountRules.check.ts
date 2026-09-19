// node data/amountRules.check.ts — fails loudly if the ported rules drift from the history they claim.
import assert from 'node:assert/strict'
import { april14, may10, halfWidthPct } from './amountRules.ts'

// The demo: asked 0.00181982, the wallet sent 0.00182 — accepted by both.
assert.equal(april14('0.00181982', '0.00182'), true)
assert.equal(may10('0.00181982', '0.00182'), true)
// 0.00025 short on a 0.05 order: accepted in April (inclusive, exact wei), refused in May.
assert.equal(april14('0.05', '0.04975'), true)
assert.equal(may10('0.05', '0.04975'), false)
assert.equal(april14('0.05', '0.0497499'), false)
// An amount it can't read: counted as correct in April, wrong in May.
assert.equal(april14('0.05', null), true)
assert.equal(may10('0.05', null), false)
// One unit off in the sixth decimal passes in May; two units don't.
assert.equal(may10('0.05', '0.049999'), true)
assert.equal(may10('0.05', '0.049998'), false)
const w = halfWidthPct(may10, '0.05')
assert.ok(w > 0.001 && w < 0.005, `May band on 0.05 ETH: ${w}%`)
console.log(`ok · May band on a 0.05 ETH order: ±${w.toFixed(4)}%`)
