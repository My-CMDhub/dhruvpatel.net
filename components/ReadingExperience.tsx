'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface PostSection {
  id: string
  name: string
  shortTitle: string
  time: string
  takeaway: string
}

export const SECTIONS: PostSection[] = [
  {
    id: 'the-birthday',
    name: 'The birthday',
    shortTitle: 'Birthday',
    time: '0.5 min',
    takeaway: 'The thing I was protecting was never the thing that mattered.',
  },
  {
    id: 'the-supervisor',
    name: 'The supervisor',
    shortTitle: 'Supervisor',
    time: '1.2 min',
    takeaway: 'You either own the power, or you trust whoever does.',
  },
  {
    id: 'people-forget-agents-dont',
    name: 'People forget. Agents don’t.',
    shortTitle: 'Forget',
    time: '1.8 min',
    takeaway: 'The risk isn’t that the agent gossips. It’s that its memory outlives every intention I had when I said it.',
  },
  {
    id: 'october-briefly',
    name: 'October, briefly',
    shortTitle: 'October',
    time: '2.5 min',
    takeaway: 'The scary part isn’t that it happened. It’s that the most trusted messenger we have needed a fix for “hanging up”.',
  },
  {
    id: 'generation-got-cheap-checking-didnt',
    name: 'Generation got cheap. Checking didn’t.',
    shortTitle: 'Checking',
    time: '3.1 min',
    takeaway: 'Privacy used to fail because someone was careless. Now it fails because nobody had time to check.',
  },
  {
    id: 'the-password-i-protected-and-the-key-i-didnt',
    name: 'The password I protected, and the key I didn’t',
    shortTitle: 'Password',
    time: '3.8 min',
    takeaway: 'The thing I’d carefully hidden was already hidden. The thing that mattered was in the open.',
  },
  {
    id: 'sci-fi-didnt-predict-this-part',
    name: 'Sci-fi didn’t predict this part',
    shortTitle: 'Sci-fi',
    time: '4.4 min',
    takeaway: 'A personal robot in your room is not a privacy question. It’s a trust question with a microphone.',
  },
  {
    id: 'so-what-is-privacy-now',
    name: 'So, what is privacy now?',
    shortTitle: 'Now',
    time: '5.0 min',
    takeaway: 'Maybe privacy used to mean “nobody knows”. Maybe now it means “I trust whoever remembers”.',
  },
]

const STORAGE_KEY = 'site_post_memory_privacy'

const MemoryContext = createContext<{
  daysAgo: number | null
}>({
  daysAgo: null,
})

export function ReadingExperienceProvider({ children }: { children: React.ReactNode }) {
  const [daysAgo, setDaysAgo] = useState<number | null>(null)

  useEffect(() => {
    try {
      const now = Date.now()
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.readAt === 'number') {
          const days = Math.floor((now - parsed.readAt) / (1000 * 60 * 60 * 24))
          if (days > 0) {
            setDaysAgo(days)
          }
        }
      } else {
        // Auto-save the visit to localStorage quietly without prompting
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ readAt: now }))
      }

      // Safe console hook for verification/testing if needed
      if (typeof window !== 'undefined') {
        ;(window as unknown as { __simulateDaysAgo?: (days: number) => void }).__simulateDaysAgo = (days: number) => {
          const simulated = Date.now() - days * 24 * 60 * 60 * 1000
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ readAt: simulated }))
          setDaysAgo(days)
        }
      }
    } catch {
      // localStorage may fail in private mode
    }
  }, [])

  return (
    <MemoryContext.Provider value={{ daysAgo }}>
      {children}
    </MemoryContext.Provider>
  )
}

/**
 * Progress as your journey line.
 * Sits directly under the floating nav pill with 8 small dots, one per section.
 * Each dot fills as you finish its section; the line ahead stays dashed,
 * matching the exact style of "now" on the home page journey line.
 */
export function ReadingJourney() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [finishedCount, setFinishedCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const readingLine = 160 // px from viewport top
      const vh = window.innerHeight

      const endCard = document.getElementById('remember-next-week')
      if (endCard && endCard.getBoundingClientRect().top <= vh * 0.75) {
        setFinishedCount(8)
        setActiveIndex(7)
        return
      }

      let current = 0
      let finished = 0

      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= readingLine) {
            current = i
            finished = i
          }
        }
      }

      setActiveIndex(current)
      setFinishedCount(finished)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const jumpTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.pageYOffset - 96
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }

  const activeDotPct = (activeIndex / (SECTIONS.length - 1)) * 100
  const progressPct = finishedCount >= 8 ? 100 : activeDotPct

  return (
    <nav className="rj-wrap" aria-label="Reading journey progress">
      <div className="rj-pill">
        <div className="rj-track" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
          {/* Solid line for completed journey */}
          <i
            aria-hidden="true"
            className="rj-line-done"
            style={{ width: `${progressPct}%` }}
          />
          {/* Dashed line ahead (same style as 'now' on home page) */}
          <i
            aria-hidden="true"
            className="rj-line-ahead"
            style={{ left: `${progressPct}%` }}
          />

          {/* 8 small dots, one per section */}
          {SECTIONS.map((sec, idx) => {
            const dotPct = (idx / (SECTIONS.length - 1)) * 100
            const isFinished = finishedCount > idx || finishedCount >= 8
            const isActive = activeIndex === idx && !isFinished

            let stateClass = 'unvisited'
            if (isFinished) stateClass = 'finished'
            else if (isActive) stateClass = 'active'

            return (
              <button
                key={sec.id}
                type="button"
                className={`rj-dot ${stateClass}`}
                style={{ left: `${dotPct}%` }}
                onClick={() => jumpTo(sec.id)}
                aria-label={`${sec.shortTitle} · ${sec.time}${isFinished ? ' (read)' : ''}`}
              >
                <span className="rj-tooltip" aria-hidden="true">
                  <b>{sec.shortTitle}</b>
                  <i>{sec.time}</i>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

/**
 * Section takeaway whisper line:
 * A quiet, memorable sentence anchoring that section.
 */
export function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <aside className="post-takeaway" aria-label="Section takeaway">
      <span className="post-takeaway-kicker" aria-hidden="true">Takeaway</span>
      <p className="post-takeaway-txt">{children}</p>
    </aside>
  )
}

/**
 * The Greeting banner at the top if the reader visited 7+ days ago.
 */
export function MemoryGreeting() {
  const { daysAgo } = useContext(MemoryContext)

  if (daysAgo === null || daysAgo < 7) {
    return null
  }

  return (
    <aside className="memory-greeting" role="status">
      <span className="memory-greeting-dot" aria-hidden="true" />
      <div className="memory-greeting-body">
        <p className="memory-greeting-text">
          You read this {daysAgo} days ago. How many of the 8 do you still remember?
        </p>
        <a href="#remember-next-week" className="memory-greeting-jump">
          Check the 8 takeaways ↓
        </a>
      </div>
    </aside>
  )
}

/**
 * The moment at the end:
 * All 8 takeaways appear in one card titled "What you’ll remember next week".
 * The earliest ones are faded the most; the most recent are still sharp.
 * "Remember like an agent" snaps all 8 back to sharp at once.
 */
export function MemoryMoment() {
  const [isAgent, setIsAgent] = useState(false)

  // Human decay gradient: earliest (birthday) faded most, latest (now) sharp
  const DECAY_OPACITIES = [0.18, 0.28, 0.38, 0.50, 0.64, 0.76, 0.88, 1.0]

  return (
    <section className="memory-card" id="remember-next-week" aria-label="Memory experiment">
      <header className="memory-card-head">
        <h3 className="memory-title">What you’ll remember next week</h3>
        <p className="memory-dek">
          How human memory treats a 5-minute read: the earliest points fade first, while the last stays sharp.
        </p>
      </header>

      <ol className="memory-list">
        {SECTIONS.map((sec, idx) => {
          const humanOpacity = DECAY_OPACITIES[idx]
          const currentOpacity = isAgent ? 1 : humanOpacity

          return (
            <li
              key={sec.id}
              className={`memory-item ${isAgent ? 'sharp' : 'decay'}`}
              style={{ opacity: currentOpacity }}
            >
              <span className="memory-item-meta">
                <b>0{idx + 1}</b>
                <i>{sec.shortTitle}</i>
              </span>
              <p className="memory-item-quote">“{sec.takeaway}”</p>
            </li>
          )
        })}
      </ol>

      <div className="memory-action">
        <button
          type="button"
          className={`memory-btn ${isAgent ? 'is-agent' : ''}`}
          onClick={() => setIsAgent((prev) => !prev)}
        >
          {isAgent ? 'Remembering like an agent' : 'Remember like an agent'}
        </button>
        <p className="memory-punchline">
          That’s the difference this whole post is about.
        </p>
      </div>
    </section>
  )
}
