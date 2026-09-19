import assert from 'node:assert/strict'
import { extractNotYet } from './notYet.ts'

assert.equal(extractNotYet('## Limits\n<!-- not-yet -->as fast when a tool runs · 1.1–1.7 s<!-- /not-yet -->'), 'as fast when a tool runs · 1.1–1.7 s')
assert.equal(extractNotYet('<!--not-yet-->\n  a **model**  driving it\n<!--/not-yet-->'), 'a model driving it')
assert.equal(extractNotYet('no marker here'), null)
assert.equal(extractNotYet('<!-- not-yet --><!-- /not-yet -->'), null) // empty
assert.equal(extractNotYet(`<!-- not-yet -->${'x'.repeat(61)}<!-- /not-yet -->`), null) // too long for the card
assert.equal(extractNotYet('<!-- not-yet --><img src=x><!-- /not-yet -->'), null) // markup
console.log('ok · not-yet marker')
