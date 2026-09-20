'use client'
import { useEffect, useState } from 'react'
import { DEFAULT, forCase, personas, type PersonaId } from '@/data/personas'
import { KEY } from './Perspective'

// The paragraph at the top of a case page, in the terms of whoever said they were reading. The
// default is rendered on the server and is always a real answer, so a reader who never touched the
// hero sentence — or who has JavaScript off — loses nothing at all.

export function ForYou({ slug }: { slug: string }) {
  const [id, setId] = useState<PersonaId>(DEFAULT)
  const lines = forCase[slug]

  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem(KEY) as PersonaId | null
        if (saved && personas.some((p) => p.id === saved)) setId(saved)
      } catch { /* private window, or storage blocked */ }
    }
    read()
    addEventListener('reader', read)
    addEventListener('storage', read)   // a second tab changed it
    return () => { removeEventListener('reader', read); removeEventListener('storage', read) }
  }, [])

  const text = lines?.[id] ?? lines?.[DEFAULT]
  if (!text) return null
  return (
    <aside className="foryou"><p className="foryou-txt">{text}</p></aside>
  )
}
