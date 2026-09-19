import type { Scene as SceneT } from '@/data/figures'
import { Ruler } from './Ruler'
import { Lbl } from './Label'

export function Ledger({ rows }: { rows: SceneT['ledger'] }) {
  return (
    <ol className="log">
      {rows.map((r, i) => (
        <li key={i} className={`row t-${r.tag.replace(' ', '').toLowerCase()}`} style={{ ['--i' as string]: i }}>
          <b className="tag">{r.tag}</b>
          <span className="txt">{r.text}</span>
          {r.value && (
            <span className="v">
              {r.value}
              {r.sub && <small>{r.sub}</small>}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

export function Scene({ s }: { s: SceneT }) {
  return (
    <section className="scene" id={s.slug} aria-labelledby={`h-${s.slug}`}>
      <div className="who">
        <h2 id={`h-${s.slug}`} style={{ ['viewTransitionName' as string]: `name-${s.slug}` }}><a href={`/work/${s.slug}/`}>{s.name}</a></h2>
        <span className="kind">{s.kind}</span>
      </div>
      <p className="what">{s.what}</p>
      <p className="big">
        <s>{s.from}</s> <span aria-label="to">→</span> <i>{s.to}</i>
      </p>
      <Ruler scene={s} />
      {s.ruler.scale === 'band' && (
        <ul className="legend">
          <li><span className="k k-short" />a payment 0.00025 ETH short on a 0.05 ETH order: accepted, now refused</li>
        </ul>
      )}
      {s.ruler.scale === 'probes' && (
        <p className="legend">One real question and two misuse attempts, put to the live scanner in September 2026 · <a href={`/work/${s.slug}/`}>watch it</a></p>
      )}
      <p className="cap"><Lbl l={s.label} /></p>
      <div className="foot">
        <p className="not"><b>NOT YET</b>{s.notYet}</p>
        <details className="earn">
          <summary><span className="open">How it was earned <span aria-hidden>↓</span></span></summary>
          <Ledger rows={s.ledger} />
          <a className="more" href={`/work/${s.slug}/`}>Read the full case →</a>
        </details>
      </div>
    </section>
  )
}
