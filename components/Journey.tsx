import { journey as j } from '@/data/figures'

const months = (ym: string) => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1 }
const d = new Date()
const now = d.getFullYear() * 12 + d.getMonth()
const t0 = months(j.start), span = now + j.ahead - t0
const at = (m: number) => `${(((m - t0) / span) * 100).toFixed(2)}%`
const pct = (m: number) => ((m - t0) / span) * 100

/** Under the name: study, then work, then a live "now" and the line carrying on past it. */
export function Journey() {
  const studyEnd = months(j.study.to)
  return (
    <div className="journey hero-line" role="img" aria-label={j.says}>
      <div className="jr-top" aria-hidden="true">
        {j.marks.map((m) => (
          <span key={m.at} className={`jr-lbl ${m.side}`} style={{ left: at(months(m.at)) }}>{m.label}</span>
        ))}
        <span className="jr-lbl start jr-now-l" style={{ left: at(now) }}>now</span>
      </div>
      <div className="jr-track" aria-hidden="true">
        <i className="jr-study" style={{ width: at(studyEnd) }} />
        <i className="jr-work" style={{ left: at(studyEnd), width: `${pct(now) - pct(studyEnd)}%` }} />
        <i className="jr-next" style={{ left: at(now) }} />
        {j.marks.map((m) => <b key={m.at} className="jr-dot" style={{ left: at(months(m.at)) }} />)}
        <b className="jr-dot jr-start" style={{ left: 0 }} />
        <b className="jr-dot jr-now" style={{ left: at(now) }} />
      </div>
      <div className="jr-bot" aria-hidden="true">
        <span className="jr-lbl start" style={{ left: 0 }}>Nov 2022</span>
        <span className="jr-lbl mid" style={{ left: `${pct(studyEnd) / 2}%` }}>{j.study.label}</span>
        <span className="jr-lbl mid" style={{ left: `${(pct(studyEnd) + pct(now)) / 2}%` }}>{j.work.label}</span>
      </div>
    </div>
  )
}
