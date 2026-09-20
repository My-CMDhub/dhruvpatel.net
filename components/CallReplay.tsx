'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import calls from '@/data/ovela-call.json'

// Two real calls to Ovela's number. A call pill holds still in the middle — its bars stretch with the
// recording's own loudness, green for Ovela and grey for the caller — while the words rise past it and
// dissolve into the page. Times are Deepgram's transcript of the exact file this page plays, and the
// whole call is written out underneath for anyone who never presses play.

type Turn = { who: 'agent' | 'caller'; at: number; to: number; text: string; after?: number; cutAfter?: number; interrupts?: boolean; early?: boolean }
type Call = { name: string; seconds: number; binMs: number; agent: number[]; caller: number[]; turns: Turn[] }

const CALLS = calls as unknown as Record<string, Call>
const TABS = [
  { id: 'booking', label: 'A booking changed', sub: 'identity, a lookup, a read-back before anything is booked' },
  { id: 'interrupt', label: 'Interrupted mid-sentence', sub: 'the caller cuts in; the agent stops' },
] as const

const PPS = 50    // pixels per second of call, down the stage
const JOIN = 1.6  // seconds: the same voice carrying on, not a new turn
const FLOOR = 0.12
// The pill is dark in both themes, so its two voices are painted, not themed.
const PAINT = { agent: { core: '#63C39B', tip: '#C9707F' }, caller: { core: '#9AA29B', tip: '#4E5551' } }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const smooth3 = (x: number) => x * x * (3 - 2 * x)
const grain = (i: number) => { const v = Math.sin(i * 12.9898) * 43758.5453; return 0.84 + 0.3 * (v - Math.floor(v)) }

/** Speech RMS carries every syllable and reads as a twitch. Blur it to the shape of a phrase, then
 *  scale to what speech usually is rather than to the call's one loudest instant. */
function envelope(raw: number[], binMs: number) {
  const win = Math.max(1, Math.round(260 / binMs))
  const out = raw.map((_, i) => {
    let sum = 0, n = 0
    for (let j = Math.max(0, i - win); j <= Math.min(raw.length - 1, i + win); j++) { sum += raw[j]; n++ }
    return sum / n
  })
  const loud = out.filter((v) => v > 4).sort((a, b) => a - b)
  const usual = loud.length ? loud[Math.floor(loud.length * 0.88)] : 100
  return out.map((v) => Math.min(100, (v * 88) / (usual || 1)))
}
const levelAt = (arr: number[], t: number, binMs: number) => {
  const i = t / (binMs / 1000), a = Math.floor(i), b = Math.min(a + 1, arr.length - 1)
  return a < 0 || a >= arr.length ? 0 : (arr[a] + (arr[b] - arr[a]) * (i - a)) / 100
}

export function CallReplay() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('booking')
  const [live, setLive] = useState(-1)
  const [open, setOpen] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const scrub = useRef<HTMLInputElement>(null)
  const shown = useRef(0)
  const lv = useRef({ agent: 0, caller: 0 })
  const held = useRef<{ agent: Float32Array | null; caller: Float32Array | null }>({ agent: null, caller: null })
  const ph = useRef(0)
  const last = useRef(0)
  const seen = useRef(true)
  const liveNow = useRef(-1)
  const drag = useRef<{ y: number; t: number } | null>(null)
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

  const envs = useMemo(() => ({
    agent: envelope(call.agent, call.binMs),
    caller: envelope(call.caller, call.binMs),
  }), [call])

  /** The pill's bars: fixed in place, stretching with the loudness, each with a little mass of its own. */
  const draw = useCallback((t: number, dt: number, calm: boolean) => {
    const c = canvas.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight
    if (!w || !h) return
    // both dimensions, or a canvas whose default 300x150 already matches one of them never resizes
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
    }
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)

    // a voice arrives quickly and dies away slowly, in seconds rather than frames
    for (const who of ['agent', 'caller'] as const) {
      const target = levelAt(envs[who], t, call.binMs)
      const tau = target > lv.current[who] ? 0.11 : 0.34
      lv.current[who] += (target - lv.current[who]) * (1 - Math.exp(-dt / tau))
    }
    if (!calm) ph.current += dt

    const pitch = w < 150 ? 5 : 6
    const n = Math.max(10, Math.floor(w / pitch))
    const bw = Math.max(2.5, pitch - 2.5), rad = bw / 2, mid = h / 2, maxA = mid - 2

    for (const who of ['caller', 'agent'] as const) {
      const lev = lv.current[who], sp = 1 + lev * 0.55, seed = who === 'agent' ? 2.1 : 0
      if (!held.current[who] || held.current[who]!.length !== n) held.current[who] = new Float32Array(n).fill(FLOOR)
      const bars = held.current[who]!
      const paint = PAINT[who]
      const grad = g.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, paint.tip); grad.addColorStop(0.27, paint.core)
      grad.addColorStop(0.73, paint.core); grad.addColorStop(1, paint.tip)
      g.fillStyle = grad
      g.globalCompositeOperation = 'lighter' // two voices at once add up; they don't hide each other
      for (let i = 0; i < n; i++) {
        const p = (i + 0.5) / n
        // tall and short travelling along the row, on rates that never line up into a loop
        const mix = 0.5
          + 0.26 * Math.sin(i * 0.78 + ph.current * 2.20 * sp + seed)
          + 0.14 * Math.sin(i * 1.73 - ph.current * 1.55 * sp + seed * 1.7)
          + 0.10 * Math.sin(i * 0.34 + ph.current * 0.85 * sp)
        const bell = 0.72 + 0.28 * Math.sin(Math.PI * p) // fuller through the middle, but not a rule
        const want = Math.min(1, FLOOR * (0.55 + 0.9 * mix) + (1 - FLOOR) * Math.pow(lev, 0.7) * mix * bell * grain(i))
        bars[i] += (want - bars[i]) * (1 - Math.exp(-dt / (0.075 + (i % 3) * 0.022)))
        const half = bars[i] * maxA
        g.globalAlpha = smooth3(Math.max(0, Math.min(1, Math.min(p, 1 - p) / 0.12))) * (0.6 + 0.4 * lev)
        g.beginPath()
        if (g.roundRect) g.roundRect(p * w - bw / 2, mid - half, bw, half * 2, rad)
        else g.rect(p * w - bw / 2, mid - half, bw, half * 2)
        g.fill()
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }, [call, envs])

  // One loop drives everything, writing to the DOM directly. React only re-renders when the turn changes.
  useEffect(() => {
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!seen.current) return
      const now = performance.now()
      const dt = Math.min((now - last.current) / 1000 || 0.016, 0.05)
      last.current = now
      const t = audio.current?.currentTime ?? 0
      shown.current = calm ? t : shown.current + (t - shown.current) * 0.16
      const el = stage.current
      if (el) {
        const a = getComputedStyle(el).getPropertyValue('--anchor').trim()
        const anchor = a.endsWith('%') ? (el.clientHeight * parseFloat(a)) / 100 : parseFloat(a) || 0
        el.style.setProperty('--y', `${(anchor - shown.current * PPS).toFixed(1)}px`)
      }
      draw(t, dt, calm)
      if (clock.current) clock.current.textContent = mmss(t)
      if (time.current) time.current.textContent = `${mmss(t)} / ${mmss(call.seconds)}`
      if (scrub.current && document.activeElement !== scrub.current) scrub.current.value = String(t)
      const i = turns.findIndex((x) => x.at <= t && t < x.to)
      if (i !== liveNow.current) { liveNow.current = i; setLive(i) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [draw, turns, call])

  // Stop the work when the demo is scrolled away.
  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver !== 'function') return
    const io = new IntersectionObserver(([e]) => { seen.current = e.isIntersecting }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    audio.current?.pause()
    setPlaying(false)
    setOpen(-1)
    shown.current = 0
    lv.current = { agent: 0, caller: 0 }
    if (audio.current) audio.current.currentTime = 0
  }, [tab])

  const seek = (s: number, play = true) => {
    const a = audio.current
    const to = Math.max(0, Math.min(call.seconds, s))
    if (a) a.currentTime = to
    shown.current = to
    if (play && a?.paused) a.play().then(() => setPlaying(true)).catch(() => {})
  }
  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {})
    else { a.pause(); setPlaying(false) }
  }

  // Drag the words to move through the call, the way you'd push a reel by hand.
  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, t: audio.current?.currentTime ?? 0 }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag.current) seek(drag.current.t + (drag.current.y - e.clientY) / PPS, false)
  }
  const onUp = () => { drag.current = null }

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
        The pill holds still: its bars are the recording&rsquo;s own loudness, green when Ovela speaks and
        grey when the caller does. The words rise past it. Tap the pill, or drag the words.
      </p>

      <div className="cr-tabs" role="group" aria-label="Which call">
        {TABS.map((x) => (
          <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>
            {x.label}<small>{x.sub}</small>
          </button>
        ))}
      </div>

      <div className="cr-stage" ref={stage}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <button type="button" className={`cr-pill${playing ? '' : ' idle'}${turns[live]?.who === 'caller' ? ' caller' : ''}`}
          aria-label={playing ? 'Pause the call' : 'Play the call'}
          onPointerDown={(e) => e.stopPropagation()} onClick={toggle}>
          <svg className="cr-glyph cr-g-call" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2z" /></svg>
          <svg className="cr-glyph cr-g-play" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7 4.8c0-.8.9-1.3 1.5-.9l11 7.2c.6.4.6 1.4 0 1.8l-11 7.2c-.6.4-1.5-.1-1.5-.9V4.8z" /></svg>
          <span className="cr-clock" ref={clock}>0:00</span>
          <canvas className="cr-wave" ref={canvas} />
        </button>
        <div className="cr-clip" aria-hidden="true">
          <div className="cr-lanes">
            {turns.map((x, i) => (
              // anchored to the middle of the turn, so a long answer is centred while it is being said
              <article key={i} className={`cr-card cr-${x.who}${live === i ? ' on' : ''}${open === i ? ' open' : ''}`}
                style={{ top: ((x.at + x.to) / 2) * PPS }}>
                <button type="button" tabIndex={-1}
                  onClick={() => { setOpen((o) => (o === i ? -1 : i)); seek(x.at) }}>
                  <span className="cr-who">{x.who === 'agent' ? 'Ovela' : 'caller'} · {mmss(x.at)}</span>
                  <span className="cr-text">{x.text}</span>
                  {label(x)}
                  {x.text.length > 80 && <span className="cr-more">tap to read it all</span>}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="cr-bar">
        <button type="button" className="cr-play" onClick={toggle} aria-pressed={playing}>
          {playing ? 'Pause' : 'Play the call'}
        </button>
        <input className="cr-scrub" type="range" min={0} max={call.seconds} step={0.05} defaultValue={0}
          onChange={(e) => seek(+e.target.value, false)} aria-label="Move through the call" ref={scrub} />
        <span className="cr-time" ref={time}>0:00 / {mmss(call.seconds)}</span>
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
