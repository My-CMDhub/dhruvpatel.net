'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import calls from '@/data/ovela-call.json'

// Two real calls to Ovela's number. The present sits in the middle: a lens of the recording's own
// loudness, with the caller's words drifting above it and Ovela's below, fading as they pass. Times
// are Deepgram's transcript of the exact file this page plays, and the whole call is written out
// underneath for anyone who never presses play.

type Turn = { who: 'agent' | 'caller'; at: number; to: number; text: string; after?: number; cutAfter?: number; interrupts?: boolean; early?: boolean }
type Call = { name: string; seconds: number; binMs: number; agent: number[]; caller: number[]; turns: Turn[] }

const CALLS = calls as unknown as Record<string, Call>
const TABS = [
  { id: 'booking', label: 'A booking changed', sub: 'identity, a lookup, a read-back before anything is booked' },
  { id: 'interrupt', label: 'Interrupted mid-sentence', sub: 'the caller cuts in; the agent stops' },
] as const

const PPS = 46    // pixels per second along the strip: about ±8 s of call on screen at once
const JOIN = 1.6  // seconds: the same voice carrying on, not a new turn
const LENS = 1.8  // seconds of call inside the lens, either side of the present
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function CallReplay() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('booking')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const shown = useRef(0)   // where the strip is, easing toward where the audio is
  const call = CALLS[tab]

  // One speaker carrying straight on is one card: the transcriber splits sentences, a listener doesn't.
  const turns = useMemo(() => call.turns.reduce<Turn[]>((acc, x) => {
    const prev = acc[acc.length - 1]
    if (prev && prev.who === x.who && x.at - prev.to < JOIN && x.after === undefined && !x.interrupts && !x.early) {
      acc[acc.length - 1] = { ...prev, to: x.to, text: `${prev.text} ${x.text}`, cutAfter: x.cutAfter ?? prev.cutAfter }
      return acc
    }
    return [...acc, x]
  }, []), [call])

  /** The lens: the loudness either side of the present, as soft capsules around a centre line. */
  const draw = useCallback((at: number) => {
    const c = canvas.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight
    if (!w || !h) return
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    const per = call.binMs / 1000, mid = h / 2, bars = Math.round((LENS * 2) / per)
    const style = getComputedStyle(c)
    const green = style.getPropertyValue('--b').trim() || '#1D6E4B'
    const grey = style.getPropertyValue('--muted').trim() || '#5D646D'
    const step = w / bars, cap = Math.max(step - 3.5, 3)
    for (let i = 0; i < bars; i++) {
      const idx = Math.round((at - LENS + i * per) / per)
      if (idx < 0 || idx >= call.agent.length) continue
      const x = i * step + step / 2
      const edge = Math.sin((i / bars) * Math.PI) ** 0.7 // fade at the rim, so the lens reads as one shape
      const pairs: [number, -1 | 1, string][] = [[call.caller[idx], -1, grey], [call.agent[idx], 1, green]]
      for (const [v, dir, colour] of pairs) {
        if (v <= 3) continue
        const len = (4 + (v / 100) * (mid - 14)) * edge
        g.globalAlpha = 0.22 + edge * 0.78
        g.fillStyle = colour
        g.beginPath()
        const y = dir < 0 ? mid - 5 - len : mid + 5
        if (g.roundRect) g.roundRect(x - cap / 2, y, cap, len, cap / 2)
        else g.rect(x - cap / 2, y, cap, len)
        g.fill()
      }
    }
    g.globalAlpha = 1
  }, [call])

  // The strip trails the audio on a spring: it arrives a beat late and settles, rather than snapping.
  const glide = useCallback((to: number, hard = false) => {
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    shown.current = hard || calm ? to : shown.current + (to - shown.current) * 0.14
    stage.current?.style.setProperty('--x', `${(-shown.current * PPS).toFixed(1)}px`)
    draw(shown.current)
  }, [draw])

  useEffect(() => { glide(t, true) }, [glide, t, tab])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const a = audio.current
      if (a) { setT(a.currentTime); glide(a.currentTime) }
      raf = requestAnimationFrame(tick)
    }
    if (playing) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, glide])

  useEffect(() => { audio.current?.pause(); setT(0); setPlaying(false); glide(0, true) }, [tab, glide])

  const seek = (s: number, play = true) => {
    const a = audio.current
    const to = Math.max(0, Math.min(call.seconds, s))
    if (a) a.currentTime = to
    setT(to)
    glide(to, true)
    if (play && a?.paused) a.play().then(() => setPlaying(true)).catch(() => {})
  }
  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {})
    else { a.pause(); setPlaying(false) }
  }

  // Drag the strip to move through the call, the way you'd push a reel by hand.
  const drag = useRef<{ x: number; t: number } | null>(null)
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, t }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag.current) seek(drag.current.t - (e.clientX - drag.current.x) / PPS, false)
  }
  const onUp = () => { drag.current = null }

  const live = turns.filter((x) => x.at <= t && t < x.to).pop()
  const label = (x: Turn) => (
    <span className="cr-meta">
      {x.after !== undefined && <b className="cr-gap">answered in {x.after.toFixed(2)} s</b>}
      {x.cutAfter !== undefined && <b className="cr-hit">stopped {x.cutAfter.toFixed(2)} s after the caller spoke</b>}
      {x.interrupts && <b className="cr-over">cuts in</b>}
      {x.early && <b className="cr-over">starts before the caller finishes</b>}
    </span>
  )

  return (
    <figure className="callr" aria-labelledby="cr-h">
      <p className="inv-eye" id="cr-h">Two real calls</p>
      <p className="inv-ask">
        The present sits in the middle. The lens is the recording&rsquo;s own loudness; the words drift past
        it, the caller above and Ovela below. Drag it, or press play.
      </p>

      <div className="cr-tabs" role="group" aria-label="Which call">
        {TABS.map((x) => (
          <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>
            {x.label}<small>{x.sub}</small>
          </button>
        ))}
      </div>

      <div className={`cr-stage${playing ? ' playing' : ''}`} ref={stage}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="cr-strip" style={{ width: call.seconds * PPS }} aria-hidden="true">
          {turns.map((x, i) => (
            // anchored to the middle of the turn, so a long answer is centred while it is being said
            <article key={i} className={`cr-card cr-${x.who}${live === x ? ' on' : ''}`}
              style={{ left: ((x.at + x.to) / 2) * PPS }}>
              <button type="button" tabIndex={-1} onClick={() => seek(x.at)}>
                <span className="cr-who">{x.who === 'agent' ? 'Ovela' : 'caller'} · {mmss(x.at)}</span>
                <span className="cr-text">{x.text}</span>
                {label(x)}
              </button>
            </article>
          ))}
        </div>
        <span className="cr-axis" aria-hidden="true" />
        <canvas className="cr-lens" ref={canvas} aria-hidden="true" />
      </div>

      <div className="cr-bar">
        <button type="button" className="cr-play" onClick={toggle} aria-pressed={playing}>
          {playing ? 'Pause' : 'Play the call'}
        </button>
        <input className="cr-scrub" type="range" min={0} max={call.seconds} step={0.05} value={t}
          onChange={(e) => seek(+e.target.value, false)} aria-label="Move through the call" />
        <span className="cr-time">{mmss(t)} / {mmss(call.seconds)}</span>
        <audio ref={audio} src={`/media/ovela-${tab}.mp3`} preload="metadata" onEnded={() => setPlaying(false)} />
      </div>

      <details className="cr-read">
        <summary><span className="open">Read the whole call <span aria-hidden>↓</span></span></summary>
        <ol>
          {turns.map((x, i) => (
            <li key={i} className={`cr-${x.who}`}>
              <button type="button" onClick={() => seek(x.at)}>
                <span className="cr-who">{x.who === 'agent' ? 'Ovela' : 'caller'} · {mmss(x.at)}</span>
                <span className="cr-text">{x.text}</span>
                {label(x)}
              </button>
            </li>
          ))}
        </ol>
      </details>

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
