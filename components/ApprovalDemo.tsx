'use client'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { evaluate, verdict, offersAlways, TICKET_LIFETIME_S, type Decision } from '@/data/approvalRules'

const REQUESTS = [
  { id: 'bin', verb: 'press', title: 'Move to Bin' },
  { id: 'empty', verb: 'press', title: 'Empty Bin' },
  { id: 'select', verb: 'select', title: 'Q3-draft.pdf' },
] as const
const FILES = ['Q3-draft.pdf', 'tax-return-2025.pdf']

type Status = 'pending' | 'allowed' | 'denied' | 'expired' | 'stale'
type Ticket = { id: string; status: Status; consumed: boolean; openedAt: number; selection: string }
type Line = { at: number; tag: 'ASKED' | 'ALLOWED' | 'RAN' | 'REFUSED' | 'DENIED' | 'STALE'; text: string }

const hex = () => Math.random().toString(16).slice(2, 6)

export function ApprovalDemo() {
  const [reqId, setReqId] = useState<(typeof REQUESTS)[number]['id']>('bin')
  const [selection, setSelection] = useState(FILES[0])
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [log, setLog] = useState<Line[]>([])
  const [now, setNow] = useState(0)
  const t0 = useRef(0)
  const req = REQUESTS.find((r) => r.id === reqId)!
  const decision: Decision = evaluate(req.title)

  const say = (tag: Line['tag'], text: string) =>
    setLog((l) => [...l, { at: performance.now() - t0.current, tag, text }].slice(-6))

  // A request arrives: the kernel decides, and a question opens a ticket.
  function ask(id: typeof reqId, sel = FILES[0]) {
    const r = REQUESTS.find((x) => x.id === id)!
    const d = evaluate(r.title)
    t0.current = performance.now()
    setReqId(id)
    setSelection(sel)
    setLog([])
    setTicket(null)
    if (d.kind === 'refuse') return say('REFUSED', d.reason)
    if (d.kind === 'allow') return say('RAN', `${r.verb} "${r.title}" — nothing to ask; the kernel allows it`)
    const tk = { id: hex(), status: 'pending' as Status, consumed: false, openedAt: performance.now(), selection: sel }
    setTicket(tk)
    say('ASKED', `ticket ${tk.id}: ${r.verb} "${r.title}" · ${d.reason}`)
  }
  useEffect(() => ask('bin'), []) // eslint-disable-line react-hooks/exhaustive-deps

  // The ticket's 60-second life, counted for real.
  useEffect(() => {
    if (!ticket || ticket.status !== 'pending') return
    const i = setInterval(() => {
      const n = performance.now()
      setNow(n)
      if (n - ticket.openedAt >= TICKET_LIFETIME_S * 1000) {
        setTicket({ ...ticket, status: 'expired' })
        say('REFUSED', `ticket ${ticket.id} expired after ${TICKET_LIFETIME_S} s without an answer`)
      }
    }, 250)
    return () => clearInterval(i)
  }, [ticket])

  function allow(e: MouseEvent | null) {
    if (!ticket || ticket.status !== 'pending') return
    const n = e?.nativeEvent
    const v = verdict(
      n && n.isTrusted ? { pointer: n.detail > 0, clickCount: n.detail, rowSettledMs: performance.now() - ticket.openedAt } : null,
    )
    if (!v.ok) return say('REFUSED', `Allow ${e ? '' : 'pressed by a script '}— ${v.reason}`)
    setTicket({ ...ticket, status: 'allowed' })
    say('ALLOWED', `ticket ${ticket.id}, by your click. It covers this exact action, once.`)
  }
  function deny() {
    if (!ticket || ticket.status !== 'pending') return
    setTicket({ ...ticket, status: 'denied' })
    say('DENIED', 'Deny counts from any input: it can’t hurt anything')
  }
  function swap() {
    const next = FILES[(FILES.indexOf(selection) + 1) % FILES.length]
    setSelection(next)
    if (ticket && (ticket.status === 'pending' || (ticket.status === 'allowed' && !ticket.consumed))) {
      setTicket({ ...ticket, status: 'stale' })
      say('STALE', `the selection moved to ${next} after ticket ${ticket.id} was opened — the ticket is dead for good; the agent must ask again`)
    } else say('ASKED', `selection is now ${next}`)
  }
  function run() {
    if (!ticket) return
    const s = ticket.status
    if (s === 'allowed' && !ticket.consumed) {
      setTicket({ ...ticket, consumed: true })
      return say('RAN', `moved ${ticket.selection} to the Bin with ticket ${ticket.id} — the ticket is spent`)
    }
    const why = s === 'allowed' ? 'consumed: an allowed ticket that already ran its one action'
      : s === 'pending' ? 'pending: nobody has answered it yet'
      : s === 'stale' ? 'stale (selection): what you approved is not what is selected now'
      : s === 'expired' ? 'expired: unanswered for 60 s' : 'denied'
    say('REFUSED', `agent re-sent ticket ${ticket.id} — ${why}`)
  }

  const left = ticket ? Math.max(0, Math.ceil(TICKET_LIFETIME_S - ((now || ticket.openedAt) - ticket.openedAt) / 1000)) : 0
  const badge = !ticket ? '' : ticket.consumed ? 'spent' : ticket.status

  return (
    <figure className="approve" aria-labelledby="ap-h">
      <p className="inv-eye" id="ap-h">Try to approve it</p>
      <p className="inv-ask">An agent is working in Finder. Pick what it asks for, then try to get it past the harness.</p>

      <div className="ap-asks" role="group" aria-label="What the agent asks">
        {REQUESTS.map((r) => (
          <button key={r.id} type="button" aria-pressed={reqId === r.id} onClick={() => ask(r.id)}>
            {r.verb} “{r.title}”
          </button>
        ))}
      </div>

      <div className="ap-stage">
        {ticket ? (
          <div className={`ap-card st-${badge}`} key={ticket.id}>
            <p className="ap-top"><span>Confirm · destructive</span><span>ticket {ticket.id} · {badge === 'pending' ? `${left} s` : badge}</span></p>
            <p className="ap-line">{req.verb} “{req.title}”</p>
            <p className="ap-sub">in Finder (com.apple.finder)</p>
            <p className="ap-sub">selection: <b>{ticket.selection}</b></p>
            <p className="ap-why">{decision.kind === 'confirm' ? decision.reason : ''}</p>
            <div className="ap-btns">
              <button type="button" onClick={deny} disabled={ticket.status !== 'pending'}>Deny</button>
              <button type="button" className="ap-allow" onClick={allow} disabled={ticket.status !== 'pending'}>Allow once</button>
            </div>
            {!offersAlways(decision) && <p className="ap-note">No “Always” here. A destructive question gets Allow once and Deny only.</p>}
          </div>
        ) : (
          <p className="ap-none">{decision.kind === 'refuse' ? 'No question is asked. There is no path past this one.' : 'Nothing to approve: it just runs.'}</p>
        )}
      </div>

      {ticket && (
        <div className="ap-try" role="group" aria-label="Try to get past it">
          <span>Try to get past it</span>
          <button type="button" onClick={() => allow(null)}>Let a script press Allow</button>
          <button type="button" onClick={swap}>Swap the selection</button>
          <button type="button" onClick={run}>Agent runs it with the ticket</button>
        </div>
      )}

      <ol className="ap-log" aria-live="polite">
        {log.map((l, i) => (
          <li key={i + l.text} className={`t-${l.tag.toLowerCase()}`}>
            <span className="ap-t">+{(l.at / 1000).toFixed(2)} s</span><b>{l.tag}</b><span>{l.text}</span>
          </li>
        ))}
      </ol>
      <p className="ap-honest">
        Here your click or tap stands in for the hardware mouse-up macOS reports. A script’s press arrives with no input
        event at all, as it does in the harness. Keyboard approval is refused on purpose there too.
      </p>
      <figcaption className="cap">
        <a className="lbl lbl-source" href="#src-code">source · the rules and messages from the Agent-OS source, re-enacted in your browser</a>
      </figcaption>
    </figure>
  )
}
