'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT, personas, pickOf, type PersonaId } from '@/data/personas'

// A card that asks who is reading. It arrives beside the cursor and types itself out there, riding
// the pointer the way the Agent-OS overlay does — then, the moment the sentence is finished, it
// lets go of the cursor and glides down to the foot of the page, where it stops and can be used.
// Attached it is untouchable, so it can never be a thing you are trying to click and chasing;
// detached it is an ordinary card. Both halves are the same rAF loop with a different target.
//
// The Agent-OS panel is glued to the mouse at 60fps, which a native panel can be. In a browser the
// DOM is always a frame or two behind the hardware cursor, so glueing reads as jitter; easing a
// fraction of the remaining distance each frame turns that lag into something that looks intended.

export const KEY = 'reader'          // localStorage: who they said they were
const DONE = 'reader-done'           // they answered or said no thanks: never ask again
const LAST = 'reader-asked'          // when we last asked and got no answer
const COOL = 24 * 60 * 60 * 1000     // ms: leave an unanswered question alone for a day
const IDLE = 22000  // ms the card waits at the dock before excusing itself, unanswered
const ASK = 'Hey 👋 I’m Dhruv, a software engineer in Melbourne. You’re'
const LETTERS = Array.from(ASK)   // by code point, so the emoji is one step and never splits
const HOLD = 6000   // ms the answer stays once it has finished typing, as in the Agent-OS overlay
const CHAR = 34     // ms per character for the question: it is the first thing anyone reads
const REPLY = 27    // ms per character for the answer, which is shorter and already expected
const CHASE = 0.19  // eased fraction per frame while riding the cursor
const GLIDE = 0.085 // gentler, for the journey down to the dock
const WAIT = 9000   // ms: if the cursor never arrives, offer it anyway

type Phase = 'off' | 'chase' | 'dock' | 'rest'

export function Perspective() {
  const [phase, setPhase] = useState<Phase>('off')
  const [typed, setTyped] = useState(0)
  const [id, setId] = useState<PersonaId>(DEFAULT)
  const [said, setSaid] = useState('')
  const [going, setGoing] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const at = useRef({ x: 0, y: 0 })
  const to = useRef({ x: 0, y: 0 })
  const met = useRef(false)     // has a real cursor been seen on the page
  const placed = useRef(false)
  const timers = useRef<number[]>([])
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const close = useCallback(() => {
    setPhase('off')
    try { localStorage.setItem(DONE, '1') } catch { /* blocked */ }
  }, [])

  // Wait for the home page to finish introducing itself, then for the cursor to actually be here.
  useEffect(() => {
    // Asked once, then left alone. Answering or dismissing settles it for good; being ignored only
    // buys a day's quiet, because a question nobody saw isn't a question anybody answered.
    try {
      if (localStorage.getItem(DONE)) return
      const saved = localStorage.getItem(KEY) as PersonaId | null
      if (saved && personas.some((p) => p.id === saved)) { setId(saved); return }
      if (Date.now() - Number(localStorage.getItem(LAST) || 0) < COOL) return
    } catch { /* blocked: offer it anyway */ }

    const root = document.documentElement
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    let obs: MutationObserver | null = null

    const begin = () => {
      off()
      if (fine && !calm && met.current) { setPhase('chase'); return }
      setTyped(LETTERS.length)   // nothing to ride, and nothing to perform: it simply docks
      setPhase('dock')
    }
    const track = (e: PointerEvent) => {
      to.current = { x: e.clientX, y: e.clientY }
      met.current = true
      if (!root.classList.contains('intro')) begin()
    }
    const t = window.setTimeout(begin, WAIT)
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

  // Type the question out where the cursor is, then let go of it.
  useEffect(() => {
    if (phase !== 'chase') return
    clear()
    for (let i = 1; i <= LETTERS.length; i++) {
      timers.current.push(window.setTimeout(() => setTyped(i), i * CHAR))
    }
    timers.current.push(window.setTimeout(() => setPhase('dock'), LETTERS.length * CHAR + 240))
    return clear
  }, [phase])

  // One loop, two targets: the cursor while attached, the foot of the page once detached.
  useEffect(() => {
    if (phase !== 'chase' && phase !== 'dock') return
    const el = card.current
    if (!el) return
    if (phase === 'dock' && !placed.current) { setPhase('rest'); return }   // docked without ever riding

    let raf = 0
    const onMove = (e: PointerEvent) => { to.current = { x: e.clientX, y: e.clientY }; met.current = true }
    if (phase === 'chase') addEventListener('pointermove', onMove, { passive: true })

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const w = el.offsetWidth, h = el.offsetHeight, m = 12
      const homeX = (innerWidth - w) / 2, homeY = innerHeight - h - 24
      const tx = phase === 'chase' ? Math.min(Math.max(to.current.x + 22, m), innerWidth - w - m) : homeX
      const ty = phase === 'chase' ? Math.min(Math.max(to.current.y + 18, m), innerHeight - h - m) : homeY
      if (!placed.current) { at.current = { x: tx, y: ty }; placed.current = true }
      const k = phase === 'chase' ? CHASE : GLIDE
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
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove) }
  }, [phase])

  useEffect(() => {
    if (phase !== 'rest') return
    const t = window.setTimeout(() => {
      try { localStorage.setItem(LAST, String(Date.now())) } catch { /* blocked */ }
      setGoing(true)
      window.setTimeout(() => setPhase('off'), 500)
    }, IDLE)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => () => clear(), [])

  const choose = (next: PersonaId) => {
    setId(next)
    try { localStorage.setItem(KEY, next); localStorage.setItem(DONE, '1') } catch { /* blocked */ }
    dispatchEvent(new CustomEvent('reader', { detail: next }))

    clear()
    const line = personas.find((p) => p.id === next)?.says ?? ''
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    setGoing(false)
    const done = () => { setGoing(true); timers.current.push(window.setTimeout(() => setPhase('off'), 500)) }
    if (calm) {
      setSaid(line)
      timers.current.push(window.setTimeout(done, HOLD))
      return
    }
    setSaid('')
    const chars = Array.from(line)
    for (let i = 1; i <= chars.length; i++) {
      timers.current.push(window.setTimeout(() => setSaid(chars.slice(0, i).join('')), i * REPLY))
    }
    timers.current.push(window.setTimeout(done, chars.length * REPLY + HOLD))
  }

  if (phase === 'off') return null
  const full = typed >= LETTERS.length
  const riding = phase === 'chase' || phase === 'dock'
  return (
    <div ref={card} className={`psp${riding ? ' ride' : ''}${phase === 'rest' ? ' rest' : ''}${going ? ' out' : ''}`}
      role="note" aria-label="Who is reading">
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
              <select value={id} onChange={(e) => choose(e.target.value as PersonaId)}
                aria-label="Tell me who you are, and each page will lead with what matters to you">
                {personas.map((p) => <option key={p.id} value={p.id}>{p.pick}</option>)}
              </select>
            </span>.
          </>
        )}
      </p>
      {said && <p className="psp-say" aria-live="polite">{said}<i className="psp-caret" aria-hidden="true" /></p>}
    </div>
  )
}
