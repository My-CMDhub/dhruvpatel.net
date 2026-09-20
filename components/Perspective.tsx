'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT, personas, pickOf, type PersonaId } from '@/data/personas'

// A card that arrives near the reader's cursor once they've started looking around, asks who they
// are, and leaves. The Agent-OS overlay glues itself to the mouse at 60fps, which a native panel can
// do; in a browser the DOM always arrives a frame or two late, so glueing reads as jitter. Easing
// toward the pointer instead — a fifth of the remaining distance each frame — turns that lag into
// something that looks intended. It follows only until the reader's hand settles, then it stops and
// becomes an ordinary card you can click.

export const KEY = 'reader'
const SEEN = 'reader-asked'
const HOLD = 6000      // ms the answer stays once it has finished typing, as in the Agent-OS overlay
const CHAR = 26        // ms per character
const EASE = 0.19      // fraction of the remaining distance per frame
const SETTLE = 700     // ms of a still pointer before the card stops chasing and becomes clickable
const LATEST = 4000    // ms: it stops chasing by now whatever the pointer is doing
const WAIT = 5000      // ms before it offers itself unprompted

export function Perspective() {
  const [show, setShow] = useState(false)
  const [rest, setRest] = useState(false)   // stopped chasing, safe to click
  const [id, setId] = useState<PersonaId>(DEFAULT)
  const [said, setSaid] = useState('')
  const [going, setGoing] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const at = useRef({ x: 0, y: 0 })         // where it is
  const to = useRef({ x: 0, y: 0 })         // where it wants to be
  const placed = useRef(false)
  const met = useRef(false)   // has the cursor moved at all yet
  const timers = useRef<number[]>([])

  const close = useCallback(() => {
    setShow(false)
    try { sessionStorage.setItem(SEEN, '1') } catch { /* blocked */ }
  }, [])

  // Offer it once they're actually looking: a scroll, the cursor arriving on the page, or five
  // seconds of reading. Once per session, and never again once it has been answered or dismissed.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN)) return
      const saved = localStorage.getItem(KEY) as PersonaId | null
      if (saved && personas.some((p) => p.id === saved)) { setId(saved); return }
    } catch { /* blocked: offer it anyway */ }

    // know where the cursor is from the start, so the card can arrive beside it rather than fly in
    const track = (e: PointerEvent) => { to.current = { x: e.clientX, y: e.clientY }; met.current = true }
    const open = () => { setShow(true); off() }
    const t = window.setTimeout(open, WAIT)
    const root = document.documentElement
    const off = () => {
      clearTimeout(t)
      removeEventListener('scroll', open)
      removeEventListener('pointermove', track)
      root.removeEventListener('pointerenter', open)
    }
    addEventListener('scroll', open, { passive: true })
    addEventListener('pointermove', track, { passive: true })
    root.addEventListener('pointerenter', open)   // the cursor coming back onto the page
    return off
  }, [])

  // Follow the pointer, then stop. One rAF loop, one transform, nothing written from the event.
  useEffect(() => {
    if (!show) return
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = !matchMedia('(hover: hover) and (pointer: fine)').matches
    if (calm || touch) { setRest(true); return }   // nothing to chase: it docks instead

    let raf = 0, still = 0
    const stop = () => setRest(true)
    const onMove = (e: PointerEvent) => {
      to.current = { x: e.clientX, y: e.clientY }
      met.current = true   // the trigger's own tracker is gone by now; this is the only one left
      clearTimeout(still)
      still = window.setTimeout(stop, SETTLE)
    }
    const latest = window.setTimeout(stop, LATEST)
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = card.current
      if (!el) return
      const w = el.offsetWidth, h = el.offsetHeight, m = 12
      // below and to the right of the cursor, the way the Agent-OS panel sits, and never off-screen.
      // Until the cursor has actually moved we have no idea where it is, so it waits at the foot of
      // the page rather than parking itself on the header.
      const tx = met.current
        ? Math.min(Math.max(to.current.x + 22, m), innerWidth - w - m)
        : (innerWidth - w) / 2
      const ty = met.current
        ? Math.min(Math.max(to.current.y + 18, m), innerHeight - h - m)
        : innerHeight - h - 24
      if (!placed.current) { at.current = { x: tx, y: ty }; placed.current = true }
      at.current.x += (tx - at.current.x) * EASE
      at.current.y += (ty - at.current.y) * EASE
      el.style.transform = `translate3d(${at.current.x.toFixed(1)}px, ${at.current.y.toFixed(1)}px, 0)`
    }
    addEventListener('pointermove', onMove, { passive: true })
    still = window.setTimeout(stop, SETTLE)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf); clearTimeout(still); clearTimeout(latest)
      removeEventListener('pointermove', onMove)
    }
  }, [show])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const choose = (next: PersonaId) => {
    setId(next)
    try { localStorage.setItem(KEY, next); sessionStorage.setItem(SEEN, '1') } catch { /* blocked */ }
    dispatchEvent(new CustomEvent('reader', { detail: next }))

    timers.current.forEach(clearTimeout)
    timers.current = []
    const line = personas.find((p) => p.id === next)?.says ?? ''
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    setGoing(false)
    setRest(true)
    const done = () => { setGoing(true); timers.current.push(window.setTimeout(() => setShow(false), 500)) }
    if (calm) {
      setSaid(line)
      timers.current.push(window.setTimeout(done, HOLD))
      return
    }
    setSaid('')
    for (let i = 1; i <= line.length; i++) {
      timers.current.push(window.setTimeout(() => setSaid(line.slice(0, i)), i * CHAR))
    }
    timers.current.push(window.setTimeout(done, line.length * CHAR + HOLD))
  }

  if (!show) return null
  return (
    <div ref={card} className={`psp${rest ? ' rest' : ''}${going ? ' out' : ''}`} role="note"
      aria-label="Who is reading">
      <button type="button" className="psp-x" onClick={close} aria-label="No thanks, close this">×</button>
      <p className="psp-ask">
        <span aria-hidden="true">Hey&nbsp;👋&nbsp;</span>I&rsquo;m Dhruv, a software engineer in Melbourne. You&rsquo;re{' '}
        {/* the visible word sets the width; the real control sits invisibly on top of it */}
        <span className="psp-pick">
          <b aria-hidden="true">{pickOf(id)}<span>▾</span></b>
          <select value={id} onChange={(e) => choose(e.target.value as PersonaId)}
            aria-label="Tell me who you are, and each page will lead with what matters to you">
            {personas.map((p) => <option key={p.id} value={p.id}>{p.pick}</option>)}
          </select>
        </span>.
      </p>
      {said && <p className="psp-say" aria-live="polite">{said}<i className="psp-caret" aria-hidden="true" /></p>}
    </div>
  )
}
