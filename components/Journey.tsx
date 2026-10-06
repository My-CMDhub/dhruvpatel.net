import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { journey as j, site } from '@/data/figures'

const months = (ym: string) => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1 }
const today = new Date()
const now = today.getFullYear() * 12 + today.getMonth()
const t0 = months(j.start), span = now + j.ahead - t0
const at = (m: number) => `${(((m - t0) / span) * 100).toFixed(2)}%`
const pct = (m: number) => ((m - t0) / span) * 100
// The intro's pen (S60). It moves at constant speed and stops for HOLD seconds on each mark, so it
// reads as a walk through the stages rather than a swipe. Every timing below comes from where the
// marks sit, which only changes month to month, so it is all worked out here at build time.
const MOVE = 2.4  // s of actual travel, Nov 2022 → now
const HOLD = 0.8  // s it rests on each mark
const frac = (m: number) => (m - t0) / (now - t0)
const stops = [...new Set(j.marks.map((m) => months(m.at)))].sort((a, b) => a - b)
const TOTAL = MOVE + HOLD * stops.length
/** Seconds after the pen sets off that it reaches month m (a mark: the moment it arrives there). */
const arrive = (m: number) => frac(m) * MOVE + HOLD * stops.filter((s) => s < m).length
const d = (m: number) => `${arrive(m).toFixed(2)}s`
const kf = (name: string, val: (pc: string) => string) => {
  const k = (t: number, pc: string) => `${((t / TOTAL) * 100).toFixed(2)}%{${val(pc)}}`
  return `@keyframes ${name}{${k(0, '0%')}${stops.map((s) => k(arrive(s), at(s)) + k(arrive(s) + HOLD, at(s))).join('')}${k(TOTAL, at(now))}}`
}
const introCss = `html.intro{--run:${TOTAL.toFixed(2)}s}` +
  kf('jr-pen', (pc) => `left:${pc}`) + kf('jr-draw', (pc) => `clip-path:inset(-4px calc(100% - ${pc}) -4px 0)`)

// Built at export time, so a photo dropped into public/ shows up on the next build with no code change.
const pick = (files: string[]) => files.find((f) => existsSync(join(process.cwd(), 'public', f)))

/** The preview a dot raises on hover: a stem, a circle with the picture, and a sentence cut off
 *  mid-thought so it reads as "there is more". Decorative: the link's own label says where it goes. */
function Preview({ img, text, cta, flip }: { img?: string; text: string; cta: string; flip: boolean }) {
  return (
    <span className={`jr-pv${flip ? ' flip' : ''}`} aria-hidden="true">
      <span className="jr-pv-ring">{img ? <img src={img} alt="" loading="lazy" className={/logo/.test(img) ? 'logo' : undefined} /> : <b>in</b>}</span>
      <span className="jr-pv-txt"><span>{text}</span><em>{cta}</em></span>
    </span>
  )
}

/** The hero line: study, then work, a live "now", and the line carrying on past it.
 *  Each dot is a link: a mark opens its case, the first opens About, and "now" goes to LinkedIn. */
export function Journey() {
  const studyEnd = months(j.study.to)
  const flip = (m: number) => pct(m) > 70
  return (
    <div className="journey hero-line">
      <style>{introCss}</style>
      <p className="skip">{j.says}</p>
      <div className="jr-noise" aria-hidden="true">
        {j.noise.map((n) => (
          <span key={n.label} className={`jr-ns ${n.side}`} style={{ left: at(months(n.at)), ['--d' as string]: d(months(n.at)) }}>{n.label}</span>
        ))}
      </div>
      <div className="jr-top" aria-hidden="true">
        {j.marks.map((m) => (
          <span key={m.at} className={`jr-lbl ${m.side}`} style={{ left: at(months(m.at)), ['--d' as string]: d(months(m.at)) }}>{m.label}</span>
        ))}
        <span className="jr-lbl start jr-now-l" style={{ left: at(now), ['--d' as string]: `${TOTAL.toFixed(2)}s` }}>now</span>
      </div>
      <div className="jr-track">
        <span className="jr-lines" aria-hidden="true">
          <i className="jr-study" style={{ width: at(studyEnd) }} />
          <i className="jr-work" style={{ left: at(studyEnd), width: `${pct(now) - pct(studyEnd)}%` }} />
        </span>
        <i aria-hidden="true" className="jr-next" style={{ left: at(now) }} />
        <a className="jr-dot jr-start" href="/about/" style={{ left: 0, ['--d' as string]: '0s' }} aria-label="November 2022, started studying: about me" />
        {j.marks.map((m) => (
          <a key={m.at} className="jr-dot jr-mk" href={m.href} style={{ left: at(months(m.at)), ['--d' as string]: d(months(m.at)) }} aria-label={`${m.label}: read the case`}>
            <Preview img={pick(m.img)} text={m.text} cta="read the case →" flip={flip(months(m.at))} />
          </a>
        ))}
        <a className="jr-dot jr-now" href={site.linkedin} target="_blank" rel="noopener noreferrer" style={{ left: at(now) }}
          aria-label="Now: latest on LinkedIn, opens in a new tab">
          <Preview img={pick(j.now.img)} text={j.now.text} cta="LinkedIn ↗" flip />
        </a>
      </div>
      <div className="jr-bot" aria-hidden="true">
        <span className="jr-lbl start" style={{ left: 0, ['--d' as string]: '0s' }}>Nov 2022</span>
        <span className="jr-lbl mid" style={{ left: `${pct(studyEnd) / 2}%`, ['--d' as string]: d((t0 + studyEnd) / 2) }}>{j.study.label}</span>
        <span className="jr-lbl mid" style={{ left: `${(pct(studyEnd) + pct(now)) / 2}%`, ['--d' as string]: d((studyEnd + now) / 2) }}>{j.work.label}</span>
      </div>
    </div>
  )
}
