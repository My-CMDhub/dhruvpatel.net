'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import calls from '@/data/ovela-call.json'

// Two real calls to Ovela's number, replayed as a ribbon of sound running down the page.
// The spine is the recording's own envelope — the caller's voice mirrored one side, Ovela's the
// other — and every card sits at its true moment in the call, so the space between two cards is
// the silence between them. Overlaps are not drawn as a symbol: the cards overlap, because the
// voices did. Times are Deepgram's transcript of the exact file this page plays, and it all reads
// with the sound off.

type Turn = { who: 'agent' | 'caller'; at: number; to: number; text: string; after?: number; cutAfter?: number; interrupts?: boolean; early?: boolean }
type Call = { name: string; seconds: number; binMs: number; agent: number[]; caller: number[]; turns: Turn[] }

const CALLS = calls as unknown as Record<string, Call>
const TABS = [
  { id: 'booking', label: 'A booking changed', sub: 'identity, a lookup, a read-back before anything is booked' },
  { id: 'interrupt', label: 'Interrupted mid-sentence', sub: 'the caller cuts in; the agent stops' },
] as const

const PPS = 34   // pixels per second of call: the vertical scale of the whole figure
const TOP = 60   // breathing room above the first turn
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const BUCKET = 3      // bins per capsule: 180 ms, so each bar is a soft lozenge, not a hairline
const JOIN = 1.6      // seconds: the same voice carrying on, not a new turn
const LIT = 2.6       // seconds of call lit either side of the present

/** Smooth the envelope so each cluster reads as one swelling shape, not a picket fence. */
function shape(a: number[]) {
  const k = [0.12, 0.22, 0.32, 0.22, 0.12]
  const g = a.map((_, i) => k.reduce((sum, w, j) => sum + w * (a[i + j - 2] ?? a[i]), 0))
  const out: number[] = []
  for (let i = 0; i < g.length; i += BUCKET) out.push(Math.max(...g.slice(i, i + BUCKET)))
  return out
}

/** The spine: both channels of the recording as capsules, drawn down the page. */
function Ribbon({ call, h }: { call: Call; h: number }) {
  const W = 150, mid = W / 2
  const step = (call.binMs / 1000) * BUCKET * PPS      // vertical pitch of one capsule
  const cap = Math.max(step - 1.3, 3.2)                // its thickness, leaving a little air between
  const caller = useMemo(() => shape(call.caller), [call])
  const agent = useMemo(() => shape(call.agent), [call])

  const bars = (a: number[], dir: 1 | -1, cls: string) => (
    <g className={cls}>
      {a.map((v, i) => {
        if (v <= 3) return null
        const len = 6 + (v / 100) * (mid - 14)         // a quiet moment is still a dot, not nothing
        return <rect key={i} x={dir === 1 ? mid + 2 : mid - 2 - len} y={TOP + i * step}
          width={len} height={cap} rx={cap / 2} />
      })}
    </g>
  )
  // Two long curves drifting behind the measurement: atmosphere, never data.
  const guide = (amp: number, phase: number) => {
    let d = `M${mid} 0`
    for (let y = 0; y <= h; y += 8) d += ` L${(mid + Math.sin(y / 190 + phase) * amp).toFixed(1)} ${y}`
    return d
  }
  return (
    <svg className="rb" viewBox={`0 0 ${W} ${h}`} width={W} height={h} preserveAspectRatio="none" aria-hidden="true">
      <g className="rb-guides">
        <path d={guide(46, 0)} /><path d={guide(34, 2.1)} />
      </g>
      {bars(caller, -1, 'rb-caller')}
      {bars(agent, 1, 'rb-agent')}
    </svg>
  )
}

export function CallReplay() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('booking')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const view = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLLIElement | null)[]>([])
  const follow = useRef(true) // auto-scroll, until the reader scrolls for themselves
  const byUs = useRef(false)
  const stage = useRef<HTMLDivElement>(null)
  const lit = useRef(0) // where the light is, easing toward where the audio is
  const call = CALLS[tab]
  const h = Math.round(call.seconds * PPS) + TOP * 2

  // Depth of field: the turn at the centre of the view is sharp, the rest recede.
  const focus = useCallback(() => {
    const v = view.current
    if (!v) return
    const mid = v.scrollTop + v.clientHeight / 2
    for (const el of cards.current) {
      if (el) el.style.setProperty('--d', Math.min(1, Math.abs(el.offsetTop + el.offsetHeight / 2 - mid) / (v.clientHeight / 2)).toFixed(3))
    }
  }, [])

  useEffect(() => { focus() }, [focus, tab])

  // The light trails the audio on a spring: it arrives a beat late and settles, rather than snapping.
  const glide = useCallback((to: number, hard = false) => {
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    lit.current = hard || calm ? to : lit.current + (to - lit.current) * 0.16
    stage.current?.style.setProperty('--y', `${(lit.current * PPS + TOP).toFixed(1)}px`)
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const a = audio.current, v = view.current
      if (a && v) {
        setT(a.currentTime)
        glide(a.currentTime)
        if (follow.current) {
          byUs.current = true
          v.scrollTop = a.currentTime * PPS + TOP - v.clientHeight / 2
        }
        focus()
      }
      raf = requestAnimationFrame(tick)
    }
    if (playing) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, focus, glide])

  useEffect(() => {
    audio.current?.pause()
    setT(0); setPlaying(false); follow.current = true
    glide(0, true)
    if (view.current) view.current.scrollTop = 0
  }, [tab, glide])

  const seek = (s: number) => {
    const a = audio.current
    if (!a) return
    a.currentTime = s
    setT(s)
    glide(s, true)
    follow.current = true
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {}) // a muted browser just moves the marker
  }
  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) { follow.current = true; a.play().then(() => setPlaying(true)).catch(() => {}) }
    else { a.pause(); setPlaying(false) }
  }
  const onScroll = () => {
    if (byUs.current) byUs.current = false
    else follow.current = false // the reader took over
    focus()
  }

  // One speaker carrying straight on is one card: the transcriber splits sentences, a listener doesn't.
  const turns = useMemo(() => call.turns.reduce<Turn[]>((acc, x) => {
    const prev = acc[acc.length - 1]
    if (prev && prev.who === x.who && x.at - prev.to < JOIN && x.after === undefined && !x.interrupts && !x.early) {
      acc[acc.length - 1] = { ...prev, to: x.to, text: `${prev.text} ${x.text}`, cutAfter: x.cutAfter ?? prev.cutAfter }
      return acc
    }
    return [...acc, x]
  }, []), [call])

  const live = turns.filter((x) => x.at <= t && t < x.to).pop()

  return (
    <figure className="callr" aria-labelledby="cr-h">
      <p className="inv-eye" id="cr-h">Two real calls</p>
      <p className="inv-ask">
        The recording itself runs down the line: the caller&rsquo;s voice on one side of it, Ovela&rsquo;s on the
        other. Every card sits where it happened, so the space between two cards is the silence between them.
      </p>

      <div className="cr-tabs" role="group" aria-label="Which call">
        {TABS.map((x) => (
          <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>
            {x.label}<small>{x.sub}</small>
          </button>
        ))}
      </div>

      <div className="cr-view" ref={view} onScroll={onScroll} tabIndex={0} aria-label="The call, turn by turn">
        <div className={`cr-track${playing ? ' playing' : ''}`} style={{ height: h }} ref={stage}>
          <div className="cr-trace" aria-hidden="true"><Ribbon call={call} h={h} /></div>
          <div className="cr-lit" aria-hidden="true"><Ribbon call={call} h={h} /></div>
          <div className={`cr-bloom${playing ? ' on' : ''}`} aria-hidden="true" />
          <ol className="cr-turns">
            {turns.map((x, i) => (
              <li key={i} ref={(el) => { cards.current[i] = el }}
                className={`cr-card cr-${x.who}${live === x ? ' on' : ''}`}
                style={{ top: x.at * PPS + TOP }}>
                <button type="button" onClick={() => seek(x.at)}>
                  <span className="cr-who">{x.who === 'agent' ? 'Ovela' : 'caller'} · {mmss(x.at)}</span>
                  <span className="cr-text">{x.text}</span>
                  <span className="cr-meta">
                    {x.after !== undefined && <b className="cr-gap">answered in {x.after.toFixed(2)} s</b>}
                    {x.cutAfter !== undefined && <b className="cr-hit">stopped {x.cutAfter.toFixed(2)} s after the caller spoke</b>}
                    {x.interrupts && <b className="cr-over">cuts in</b>}
                    {x.early && <b className="cr-over">starts before the caller finishes</b>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="cr-bar">
        <button type="button" className="cr-play" onClick={toggle} aria-pressed={playing}>
          {playing ? 'Pause' : 'Play the call'}
        </button>
        <span className="cr-time">{mmss(t)} / {mmss(call.seconds)}</span>
        <span className="cr-state">{!playing ? 'not playing' : live ? (live.who === 'agent' ? 'Ovela speaking' : 'caller speaking') : 'silence'}</span>
        <audio ref={audio} src={`/media/ovela-${tab}.mp3`} preload="metadata" onEnded={() => setPlaying(false)} />
      </div>

      <p className="cr-note">
        The caller is a synthesised voice reading a script. No stranger has ever called this number.
        Everything Ovela says, and every time above, comes from the call itself: each answer time is
        measured from the recording, so it includes the pause the speech recogniser takes before it
        declares the caller&rsquo;s turn over. Measured inside the agent, from that point on, the same
        replies are about half a second faster. Silence while the caller waited to speak has been cut;
        no gap before an answer has been touched. Square brackets are mine, where the transcriber
        misheard. Payments and email run in test mode, and the guest is test data.
      </p>
      <figcaption className="cap">
        <a className="lbl lbl-measured" href="#src-call">measured · answer times from the recording you can play</a>
      </figcaption>
    </figure>
  )
}
