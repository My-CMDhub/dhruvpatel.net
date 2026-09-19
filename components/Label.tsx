import type { Label as LabelT, Status } from '@/data/figures'

/** Off-site links open in a new tab; the site's own pages and mailto: stay put. */
export const ext = (href?: string) => (href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})

/** A claim-status label. On a case page, `src` points at a line in its Sources list. */
export function L({ s, n, src, href }: { s: Status; n: string; src?: string; href?: string }) {
  const to = href ?? (src ? `#src-${src}` : undefined)
  const text = s === 'withdrawn' ? `withdrawn → ${n}` : `${s} · ${n}`
  return to ? <a className={`lbl lbl-${s}`} href={to}>{text}</a> : <span className={`lbl lbl-${s}`}>{text}</span>
}

export const Lbl = ({ l }: { l: LabelT }) => <L s={l.status} n={l.note} href={l.href} />

/** One line in a case page's Sources list; labels link here by id. */
export function Src({ id, href, children }: { id: string; href?: string; children: React.ReactNode }) {
  return (
    <li id={`src-${id}`}>
      {href ? <a href={href} {...ext(href)}>{children} ↗</a> : children}
    </li>
  )
}
