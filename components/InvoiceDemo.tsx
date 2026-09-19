'use client'
import { useState } from 'react'
import { april14, may10 } from '@/data/amountRules'

// The demo video's real order. The slider moves in steps of 0.00000001 ETH across ±0.6% of it.
const ASK = '0.00181982'
const E = parseFloat(ASK)
const STEP = 1e-8
const SPAN = Math.round((E * 0.006) / STEP)
const eth = (k: number) => (E + k * STEP).toFixed(8)
const P = (k: number) => ((k + SPAN) / (2 * SPAN)) * 100

// Each strip is drawn by running its rule over every amount on the axis: green is where it says yes.
function accepted(rule: (e: string, a: string) => boolean) {
  const runs: [number, number][] = []
  let start: number | null = null
  for (let k = -SPAN; k <= SPAN + 1; k++) {
    const ok = k <= SPAN && rule(ASK, eth(k))
    if (ok && start === null) start = k
    if (!ok && start !== null) { runs.push([start, k - 1]); start = null }
  }
  return runs
}
const RULES = [
  { key: 'apr', when: '14 Apr', how: '±0.5%, compared in exact wei', fn: april14, runs: accepted(april14),
    why: (ok: boolean, unread: boolean) => unread ? 'couldn’t read the amount, so counted it as paid' : ok ? 'within 0.5% of the ask' : 'more than 0.5% away' },
  { key: 'may', when: '10 May', how: 'six decimals, one unit of rounding', fn: may10, runs: accepted(may10),
    why: (ok: boolean, unread: boolean) => unread ? 'couldn’t read the amount, so refused it' : ok ? 'matches to six decimals' : 'doesn’t match to six decimals' },
]
const PRESETS = [
  { label: 'What the wallet sent', k: Math.round((0.00182 - E) / STEP) },
  { label: 'Exact', k: 0 },
  { label: '0.4% short', k: Math.round((-E * 0.004) / STEP) },
]

export function InvoiceDemo() {
  const [k, setK] = useState(PRESETS[0].k)
  const [unread, setUnread] = useState(false)
  const sent = eth(k)
  const dev = ((parseFloat(sent) / E - 1) * 100)
  const verdicts = RULES.map((r) => r.fn(ASK, unread ? null : sent))

  return (
    <figure className="invoice" aria-labelledby="inv-h">
      <p className="inv-eye" id="inv-h">Pay the invoice</p>
      <p className="inv-ask">The demo’s order asked for <b>{ASK} ETH</b>. Send something else.</p>

      <p className="inv-sent" aria-live="polite">
        {unread ? <span className="inv-unread">amount unreadable</span> : <>
          {sent} <small>ETH</small>
          <span className="inv-dev">{dev >= 0 ? '+' : '−'}{Math.abs(dev).toFixed(4)}%</span>
        </>}
      </p>

      <div className={`inv-track${unread ? ' off' : ''}`}>
        {RULES.map((r) => (
          <div key={r.key} className="inv-row" aria-hidden="true">
            <span className="inv-when">{r.when}</span>
            <div className="inv-bar">
              {r.runs.map(([a, b]) => (
                <i key={a} className={`s-${r.key}`} style={{ left: `${P(a)}%`, width: `max(2px, ${P(b) - P(a)}%)` }} />
              ))}
            </div>
          </div>
        ))}
        <span className="inv-zero" aria-hidden="true" />
        {!unread && <span className="inv-needle" style={{ left: `${P(k)}%` }} aria-hidden="true" />}
        <input
          type="range" min={-SPAN} max={SPAN} step={1} value={k} disabled={unread}
          onChange={(e) => setK(+e.target.value)}
          aria-label="Amount sent" aria-valuetext={`${sent} ETH, ${dev.toFixed(4)}% from the ask`}
        />
      </div>
      <div className="inv-scale" aria-hidden="true"><span>−0.6%</span><span>exact</span><span>+0.6%</span></div>

      <div className="inv-presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" aria-pressed={!unread && k === p.k} onClick={() => { setUnread(false); setK(p.k) }}>{p.label}</button>
        ))}
        <button type="button" aria-pressed={unread} onClick={() => setUnread(!unread)}>Can’t read the amount</button>
      </div>

      <div className="inv-verdicts">
        {RULES.map((r, i) => (
          <div key={r.key} className={`inv-v ${verdicts[i] ? 'ok' : 'no'}`}>
            <p className="inv-rule">{r.when} · {r.how}</p>
            <p className="inv-word" key={String(verdicts[i])}>{verdicts[i] ? 'Accepted' : 'Refused'}</p>
            <p className="inv-why">{r.why(verdicts[i], unread)}</p>
          </div>
        ))}
      </div>
      <p className="inv-note">
        {verdicts[0] && !verdicts[1]
          ? 'The April rule would have let the merchant release this payment. The May rule retires its address instead.'
          : !verdicts[0] && !verdicts[1] ? 'Both rules refuse it.' : 'Both rules accept it.'}
      </p>
      <figcaption className="cap"><a className="lbl lbl-source" href="#src-amount">source · both functions from the git history, running in your browser</a></figcaption>
    </figure>
  )
}
