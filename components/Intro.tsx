'use client'
import { useState } from 'react'
import { site } from '@/data/figures'

/** The hero sentence stops at "model"; clicking the word adds the two sentences that explain it. The rest is in the HTML from
 *  the start and CSS hides it only once JS is running, so without JS the whole sentence just reads. */
export function Intro() {
  const [open, setOpen] = useState(false)
  const { lead, word, rest, aside } = site.intro
  return (
    <h1 className={`intro${open ? ' is-open' : ''}`}>
      {lead}{' '}
      <button type="button" className="intro-w" aria-expanded={open} aria-controls="intro-rest" onClick={() => setOpen(true)}>{word}</button>.
      <span className="intro-rest" id="intro-rest">{rest} <a className="intro-aside" href={aside.href}>{aside.text}</a></span>
    </h1>
  )
}
