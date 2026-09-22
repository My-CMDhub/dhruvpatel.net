'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT, personas, pickOf, type PersonaId } from '@/data/personas'

// A card that asks who is reading. It arrives beside the cursor and types itself out there, riding
// the pointer the way the Agent-OS overlay does — then, the moment the sentence is finished, it
// lets go and glides to the foot of the page, where it stops and can be used. Attached it is
// untouchable, so it can never be a thing you are trying to click and chasing; detached it is an
// ordinary card. Both halves are one rAF loop with a different target.
//
// The Agent-OS panel is glued to the mouse at 60fps, which a native panel can be. In a browser the
// DOM is always a frame or two behind the hardware cursor, so glueing reads as jitter; easing a
// fraction of the remaining distance each frame turns that lag into something that looks intended.

export const KEY = 'reader'          // localStorage: who they said they were
const DONE = 'reader-done'           // they answered or said no thanks: never ask again
const LAST = 'reader-asked'          // localStorage: when we last asked and got no answer
const VISIT = 'reader-asked-now'     // sessionStorage: asked already on this visit
const COOL = 24 * 60 * 60 * 1000     // ms: leave an unanswered question alone for a day
const IDLE = 14000  // ms the card waits at the dock before excusing itself, unanswered
const ASK = 'Hey 👋 I’m Dhruv, a software engineer in near Melbourne. You’re'
const LETTERS = Array.from(ASK)   // by code point, so the emoji is one step and never splits
const HOLD = 6000   // ms the answer stays once it has finished typing, as in the Agent-OS overlay
const CHAR = 34     // ms per character for the question: it is the first thing anyone reads
const REPLY = 27    // ms per character for the answer, which is shorter and already expected
const CHASE = 0.19  // eased fraction per 60Hz frame while riding the cursor
const GLIDE = 0.085 // gentler, for the journey down to the dock

type Phase = 'off' | 'chase' | 'dock' | 'rest'

/** Per-frame easing means twice as fast on a 120Hz display. Rescale it to the frame we actually got. */
const ease = (k: number, dt: number) => 1 - Math.pow(1 - k, Math.min(dt, 50) / 16.67)

export function Perspective() {
  const [phase, setPhase] = useState<Phase>('off')
  const [typed, setTyped] = useState(0)
  const [id, setId] = useState<PersonaId>(DEFAULT)
  const [said, setSaid] = useState('')
  const [done, setDone] = useState('')     // the finished reply, announced once
  const [going, setGoing] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const at = useRef({ x: 0, y: 0 })
  const to = useRef({ x: 0, y: 0 })
  const met = useRef(false)      // has a real cursor been seen on the page
  const placed = useRef(false)
  const picked = useRef(false)   // answered: the idle timer must not fire over the reply
  const typedNow = useRef(0)
  const timers = useRef<number[]>([])
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const close = useCallback(() => {
    setPhase('off')
    try { localStorage.setItem(DONE, '1') } catch { /* blocked */ }
  }, [])

  // Asked once. Answering or dismissing settles it for good; being ignored settles it for this
  // visit and for a day, because a question nobody saw is not a question anybody answered. The
  // stamp goes down when the card is shown, not when it times out — every page here is a fresh
  // document load, so a stamp that waits would re-ask on every click.
  useEffect(() => {
    try {
      if (localStorage.getItem(DONE) || sessionStorage.getItem(VISIT)) return
      const saved = localStorage.getItem(KEY) as PersonaId | null
      if (saved && personas.some((p) => p.id === saved)) { setId(saved); return }
      if (Date.now() - Number(localStorage.getItem(LAST) || 0) < COOL) return
    } catch { /* blocked: offer it anyway */ }

    const root = document.documentElement
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    let obs: MutationObserver | null = null

    const begin = () => {
      if (root.classList.contains('intro')) return   // never over the top of the opening animation
      off()
      try {
        sessionStorage.setItem(VISIT, '1')
        localStorage.setItem(LAST, String(Date.now()))
      } catch { /* blocked */ }
      if (fine && !calm && met.current) { setPhase('chase'); return }
      setTyped(LETTERS.length)   // nothing to ride, and nothing to perform: it simply docks
      setPhase('dock')
    }
    const track = (e: PointerEvent) => {
      to.current = { x: e.clientX, y: e.clientY }
      met.current = true
      begin()
    }
    const t = window.setTimeout(begin, 9000)
    const off = () => {
      clearTimeout(t)
      obs?.disconnect()
      removeEventListener('pointermove', track)
      removeEventListener('scroll', begin)
    }
    addEventListener('pointermove', track, { passive: true })
    addEventListener('scroll', begin, { passive: true })
    if (root.classList.contains('intro')) {
      obs = new MutationObserver(() => { if (!root.classList.contains('intro') && met.current) begin() })
      obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    }
    return off
  }, [])

  // Escape gets rid of it at any point, including while it is still riding the cursor and there is
  // nothing to click.
  useEffect(() => {
    if (phase === 'off') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [phase, close])

  // One loop, two targets: the cursor while attached, the foot of the page once detached. The
  // typing lives in here too, driven by the clock rather than by 58 queued timeouts — so a
  // backgrounded tab resumes mid-sentence instead of dumping the backlog in one frame.
  useEffect(() => {
    if (phase !== 'chase' && phase !== 'dock') return
    const el = card.current
    if (!el) return
    if (phase === 'dock' && !placed.current) { setPhase('rest'); return }

    let raf = 0, last = performance.now(), shown = typed
    const t0 = performance.now()
    let vw = document.documentElement.clientWidth, vh = innerHeight
    let w = el.offsetWidth, h = el.offsetHeight          // read once, not once a frame
    const remeasure = () => {
      vw = document.documentElement.clientWidth; vh = innerHeight
      w = el.offsetWidth; h = el.offsetHeight
    }
    const onMove = (e: PointerEvent) => { to.current = { x: e.clientX, y: e.clientY }; met.current = true }
    if (phase === 'chase') addEventListener('pointermove', onMove, { passive: true })
    addEventListener('resize', remeasure)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = now - last; last = now

      if (phase === 'chase') {
        const n = Math.min(LETTERS.length, Math.floor((now - t0) / CHAR) + shown)
        if (n !== typedNow.current) { typedNow.current = n; setTyped(n); if (n === LETTERS.length) h = el.offsetHeight }
        if (n === LETTERS.length && now - t0 > LETTERS.length * CHAR + 240) setPhase('dock')
      }
      const m = 12
      const tx = phase === 'chase' ? Math.min(Math.max(to.current.x + 22, m), vw - w - m) : (vw - w) / 2
      const ty = phase === 'chase' ? Math.min(Math.max(to.current.y + 18, m), vh - h - m) : vh - h - 24
      if (!placed.current) { at.current = { x: tx, y: ty }; placed.current = true }
      const k = ease(phase === 'chase' ? CHASE : GLIDE, dt)
      at.current.x += (tx - at.current.x) * k
      at.current.y += (ty - at.current.y) * k
      el.style.transform = `translate3d(${at.current.x.toFixed(1)}px, ${at.current.y.toFixed(1)}px, 0)`
      // Arrived: hand the position back to CSS so a resize can't strand it, and let it be clicked.
      if (phase === 'dock' && Math.abs(tx - at.current.x) < 0.6 && Math.abs(ty - at.current.y) < 0.6) {
        el.style.transform = ''
        setPhase('rest')
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove)
      removeEventListener('resize', remeasure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Docked and unanswered, it excuses itself rather than sitting over the page for the whole visit.
  useEffect(() => {
    if (phase !== 'rest' || picked.current) return
    document.documentElement.dataset.psp = 'on'      // the signature toast steps out of its way
    const t = window.setTimeout(() => { setGoing(true); window.setTimeout(() => setPhase('off'), 500) }, IDLE)
    return () => { clearTimeout(t); delete document.documentElement.dataset.psp }
  }, [phase])

  useEffect(() => () => { clear(); delete document.documentElement.dataset.psp }, [])

  const choose = (next: PersonaId) => {
    picked.current = true
    setId(next)
    setPhase('rest')          // stop the loop if it is still gliding
    try { localStorage.setItem(KEY, next); localStorage.setItem(DONE, '1') } catch { /* blocked */ }
    document.documentElement.dataset.reader = next

    clear()
    const line = personas.find((p) => p.id === next)?.says ?? ''
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    setGoing(false)
    const end = () => { setGoing(true); timers.current.push(window.setTimeout(() => setPhase('off'), 500)) }
    if (calm) {
      setSaid(line); setDone(line)
      timers.current.push(window.setTimeout(end, HOLD))
      return
    }
    setSaid('')
    const chars = Array.from(line)
    for (let i = 1; i <= chars.length; i++) {
      timers.current.push(window.setTimeout(() => setSaid(chars.slice(0, i).join('')), i * REPLY))
    }
    timers.current.push(window.setTimeout(() => setDone(line), chars.length * REPLY))
    timers.current.push(window.setTimeout(end, chars.length * REPLY + HOLD))
  }

  if (phase === 'off') return null
  const full = typed >= LETTERS.length
  const riding = phase === 'chase' || phase === 'dock'
  return (
    <div ref={card} className={`psp${riding ? ' ride' : ''}${phase === 'rest' ? ' rest' : ''}${going ? ' out' : ''}`}
      role="note" aria-label="Who’s reading">
      {phase === 'rest' && (
        <button type="button" className="psp-x" onClick={close} aria-label="No thanks, close this">×</button>
      )}
      <p className="psp-ask">
        {LETTERS.slice(0, typed).join('')}
        {!full && <i className="psp-caret" aria-hidden="true" />}
        {full && (
          <>
            {' '}
            {/* the visible word sets the width; the real control sits invisibly on top of it */}
            <span className="psp-pick">
              <b aria-hidden="true">{pickOf(id)}<span>▾</span></b>
              <select value={id} onChange={(e) => choose(e.target.value as PersonaId)} aria-label="Who’s reading">
                {personas.map((p) => <option key={p.id} value={p.id}>{p.pick}</option>)}
              </select>
            </span>.
          </>
        )}
      </p>
      {/* the typing itself is decorative; a screen reader is told the finished sentence, once */}
      {said && <p className="psp-say" aria-hidden="true">{said}{!done && <i className="psp-caret" />}</p>}
      <p className="skip" aria-live="polite">{done}</p>
    </div>
  )
}
