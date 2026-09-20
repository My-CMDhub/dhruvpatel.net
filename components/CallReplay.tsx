'use client'
import { useEffect, useRef, useState } from 'react'
import calls from '@/data/ovela-call.json'

// Two real calls to Ovela's number, replayed. The waveform is the recording's own envelope,
// one lane per channel; the times are Deepgram's transcript of the file the page plays; the
// reply gaps are arithmetic on those times. Readable in silence: audio is an option, not a
// requirement. Data: scripts/ in the repo README, generated from the dual-channel recording.

type Turn = { who: 'agent' | 'caller'; at: number; to: number; text: string; after?: number; cutAfter?: number; interrupts?: boolean; early?: boolean }
type Call = { name: string; seconds: number; binMs: number; agent: number[]; caller: number[]; turns: Turn[] }

const CALLS = calls as unknown as Record<string, Call>
const TABS = [
  { id: 'booking', label: 'A booking changed', sub: 'identity, a lookup, a read-back before anything is booked' },
  { id: 'interrupt', label: 'Interrupted mid-sentence', sub: 'the caller cuts in; the agent stops' },
] as const

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function Wave({ call, t, onSeek }: { call: Call; t: number; onSeek: (s: number) => void }) {
  const W = 1000, H = 84, mid = H / 2
  // One bar per ~3 px of drawing: 1,232 raw bins render as a smear, especially on a phone.
  const step = Math.ceil(call.agent.length / 320)
  const down = (a: number[]) => Array.from({ length: Math.ceil(a.length / step) },
    (_, i) => Math.max(...a.slice(i * step, i * step + step)))
  const agent = down(call.agent), caller = down(call.caller), bin = W / agent.length
  const cut = call.turns.find((x) => x.cutAfter)
  const hit = cut && call.turns.find((x) => x.interrupts && x.at >= cut.at)
  return (
    <svg className="cw" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label={`Waveform of the call. The caller's voice above the line, Ovela's below. ${call.seconds} seconds.`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        onSeek(((e.clientX - r.left) / r.width) * call.seconds)
      }}>
      {hit && cut && (
        <rect className="cw-cut" x={(hit.at / call.seconds) * W} y="0" width={((cut.to - hit.at) / call.seconds) * W} height={H} />
      )}
      <g className="cw-caller">
        {caller.map((v, i) => v > 2 && (
          <rect key={i} x={i * bin} y={mid - 4 - (v / 100) * (mid - 6)} width={Math.max(bin - 0.4, 0.6)} height={(v / 100) * (mid - 6)} />
        ))}
      </g>
      <g className="cw-agent">
        {agent.map((v, i) => v > 2 && (
          <rect key={i} x={i * bin} y={mid + 4} width={Math.max(bin - 0.4, 0.6)} height={(v / 100) * (mid - 6)} />
        ))}
      </g>
      <line className="cw-mid" x1="0" y1={mid} x2={W} y2={mid} />
      <line className="cw-head" x1={(t / call.seconds) * W} y1="0" x2={(t / call.seconds) * W} y2={H} />
    </svg>
  )
}

export function CallReplay() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('booking')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const call = CALLS[tab]

  // The playhead follows the audio clock, so the transcript can never drift from what you hear.
  useEffect(() => {
    let raf = 0
    const tick = () => { if (audio.current) setT(audio.current.currentTime); raf = requestAnimationFrame(tick) }
    if (playing) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(() => { audio.current?.pause(); setT(0); setPlaying(false) }, [tab])

  const seek = (s: number) => {
    const a = audio.current
    if (!a) return
    a.currentTime = s
    setT(s)
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {}) // muted browsers just move the playhead
  }
  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}) } else { a.pause(); setPlaying(false) }
  }
  // Only follow along once the audio is running: at rest nothing is singled out.
  const live = playing ? call.turns.filter((x) => x.at <= t && t < x.to).pop() : undefined

  return (
    <figure className="callr" aria-labelledby="cr-h">
      <p className="inv-eye" id="cr-h">Two real calls</p>
      <p className="inv-ask">Two calls to the real number, recorded on both sides. Read them, or play them.</p>

      <div className="cr-tabs" role="group" aria-label="Which call">
        {TABS.map((x) => (
          <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>
            {x.label}<small>{x.sub}</small>
          </button>
        ))}
      </div>

      <div className="cr-stage">
        <div className="cr-lanes" aria-hidden="true"><span>caller</span><span>Ovela</span></div>
        <Wave call={call} t={t} onSeek={seek} />
      </div>

      <div className="cr-bar">
        <button type="button" className="cr-play" onClick={toggle} aria-pressed={playing}>
          {playing ? 'Pause' : 'Play the call'}
        </button>
        <span className="cr-time">{mmss(t)} / {mmss(call.seconds)}</span>
        <span className="cr-now">{!playing ? 'not playing' : live ? (live.who === 'agent' ? 'Ovela speaking' : 'caller speaking') : 'silence'}</span>
        <audio ref={audio} src={`/media/ovela-${tab}.mp3`} preload="metadata" onEnded={() => setPlaying(false)} />
      </div>

      <ol className="cr-turns">
        {call.turns.map((x, i) => (
          <li key={i} className={`cr-${x.who}${live === x ? ' on' : ''}`}>
            <button type="button" onClick={() => seek(x.at)} aria-label={`Play from ${mmss(x.at)}`}>
              <span className="cr-who">{x.who === 'agent' ? 'Ovela' : 'caller'}</span>
              <span className="cr-text">{x.text}</span>
              <span className="cr-meta">
                {x.after !== undefined && <b className="cr-gap">answered in {x.after.toFixed(2)} s</b>}
                {x.cutAfter !== undefined && <b className="cr-hit">cut off {x.cutAfter.toFixed(2)} s after the caller spoke</b>}
                {x.interrupts && <b className="cr-over">cuts in</b>}
                {x.early && <b className="cr-over">starts before the caller finishes</b>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="cr-note">
        The caller is a synthesised voice reading a script. No stranger has ever called this number.
        Everything Ovela says, and every time above, comes from the call itself: each answer time is
        measured from the recording, so it includes the pause the speech recogniser takes before it
        declares the caller's turn over. Measured inside the agent, from that point on, the same replies
        are about half a second faster. Silence while the caller waited to speak has been cut; no gap
        before an answer has been touched. Square brackets are mine, where the transcriber misheard.
        Payments and email run in test mode, and the guest is test data.
      </p>
      <figcaption className="cap">
        <a className="lbl lbl-measured" href="#src-call">measured · answer times from the recording you can play</a>
      </figcaption>
    </figure>
  )
}
