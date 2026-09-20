'use client'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT, personas, pickOf, type PersonaId } from '@/data/personas'

// One sentence in the hero that lets a reader say who they are. Choosing streams a single line back,
// in the same manner as the cursor overlay in Agent-OS: it types, it holds long enough to be read,
// then it goes. Nothing is asked of anyone — the default is a real answer, and the page is complete
// without ever touching this.

export const KEY = 'reader'
const HOLD = 6000      // ms the answer stays once it has finished typing, as in the Agent-OS overlay
const CHAR = 26        // ms per character: a shade faster than reading aloud
const FADE = 400       // ms

export function Perspective() {
  const [id, setId] = useState<PersonaId>(DEFAULT)
  const [said, setSaid] = useState('')
  const [going, setGoing] = useState(false)
  const timers = useRef<number[]>([])
  const first = useRef(true)

  // A returning reader keeps their choice, and the line does not perform again.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as PersonaId | null
      if (saved && personas.some((p) => p.id === saved)) setId(saved)
    } catch { /* private window, or storage blocked */ }
    first.current = false
    return () => timers.current.forEach(clearTimeout)
  }, [])

  const choose = (next: PersonaId) => {
    setId(next)
    try { localStorage.setItem(KEY, next) } catch { /* nothing to do */ }
    window.dispatchEvent(new CustomEvent('reader', { detail: next }))

    timers.current.forEach(clearTimeout)
    timers.current = []
    const line = personas.find((p) => p.id === next)?.says ?? ''
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    setGoing(false)
    if (calm) {
      setSaid(line)
      timers.current.push(window.setTimeout(() => setGoing(true), HOLD))
      return
    }
    setSaid('')
    for (let i = 1; i <= line.length; i++) {
      timers.current.push(window.setTimeout(() => setSaid(line.slice(0, i)), i * CHAR))
    }
    timers.current.push(window.setTimeout(() => setGoing(true), line.length * CHAR + HOLD))
  }

  return (
    <div className="psp">
      <p className="psp-ask">
        <span aria-hidden="true">Hey&nbsp;👋&nbsp;</span>I&rsquo;m Dhruv, a software engineer in Melbourne. You&rsquo;re{' '}
        {/* the visible word sets the width; the real control sits invisibly on top of it */}
        <span className="psp-pick">
          <b aria-hidden="true">{pickOf(id)}<span>▾</span></b>
          <select value={id} onChange={(e) => choose(e.target.value as PersonaId)}
            aria-label="Tell me who you are, and each case page will lead with what matters to you">
            {personas.map((p) => <option key={p.id} value={p.id}>{p.pick}</option>)}
          </select>
        </span>.
      </p>
      <p className={`psp-say${said ? ' on' : ''}${going ? ' out' : ''}`} aria-live="polite">
        {said}{said && !going && <i className="psp-caret" aria-hidden="true" />}
      </p>
    </div>
  )
}
