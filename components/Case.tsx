import type { Label } from '@/data/figures'
import { Lbl, ext } from './Label'
import { ForYou } from './ForYou'
import { StackChain } from './Mark'

/** The top of every case page: title, one-line result with its label, meta line, links. */
export function CaseHead({ title, result, more, label, meta, stack, links }: {
  title: string
  result: string
  more?: string   // the plainer, longer version, under a short result
  label?: Label
  meta: string
  stack?: string[]
  links?: { text: string; href: string }[]
}) {
  return (
    <header className="case-head">
      <p className="back"><a href="/#work">← Work</a></p>
      <h1 style={{ ['viewTransitionName' as string]: `name-${title.toLowerCase()}` }}>{title}</h1>
      <p className="result">{result}</p>
      {more && <p className="result-more">{more}</p>}
      <ForYou slug={title.toLowerCase()} />
      {label && <p className="cap"><Lbl l={label} /></p>}
      {stack && <StackChain stack={stack} />}
      <p className="meta">{meta}</p>
      {links && (
        <p className="links">
          {links.map((l) => <a key={l.href} href={l.href} {...ext(l.href)}>{l.text} ↗</a>)}
        </p>
      )}
    </header>
  )
}
