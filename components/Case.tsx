import type { Label } from '@/data/figures'
import { Lbl } from './Label'

/** The top of every case page: title, one-line result with its label, meta line, links. */
export function CaseHead({ title, result, label, meta, links }: {
  title: string
  result: string
  label?: Label
  meta: string
  links?: { text: string; href: string }[]
}) {
  return (
    <header className="case-head">
      <p className="back"><a href="/#work">← Work</a></p>
      <h1 style={{ ['viewTransitionName' as string]: `name-${title.toLowerCase()}` }}>{title}</h1>
      <p className="result">{result}</p>
      {label && <p className="cap"><Lbl l={label} /></p>}
      <p className="meta">{meta}</p>
      {links && (
        <p className="links">
          {links.map((l) => <a key={l.href} href={l.href}>{l.text} ↗</a>)}
        </p>
      )}
    </header>
  )
}
