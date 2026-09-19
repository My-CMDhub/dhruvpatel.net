import type { Scene } from '@/data/figures'
import { band } from '@/data/figures'

// Axis runs x = 10 … 810 at y = 38; labels sit at y = 74 so phones can enlarge them.
const X0 = 10, W = 800, Y = 38

type Tick = { x: number; label?: string; major?: boolean }

function ticks(r: Scene['ruler']): { t: Tick[]; pos: (v: number) => number } {
  if (r.scale === 'log') {
    const pos = (ms: number) => X0 + Math.log10(ms) * (W / 4)
    const names = ['1 ms', '10 ms', '100 ms', '1 s', '10 s']
    const t: Tick[] = []
    for (let d = 0; d <= 4; d++) {
      t.push({ x: pos(10 ** d), label: names[d], major: true })
      if (d < 4) for (let k = 2; k <= 9; k++) t.push({ x: pos(k * 10 ** d) })
    }
    return { t, pos }
  }
  if (r.scale === 'linear') {
    const pos = (v: number) => X0 + (v / r.max) * W
    const major = r.max <= 5 ? 1 : 5
    const minor = r.max <= 5 ? 0.1 : 1
    const t: Tick[] = []
    for (let i = 0; i <= Math.round(r.max / minor); i++) {
      const v = +(i * minor).toFixed(3)
      const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-9
      t.push({ x: pos(v), major: isMajor, label: isMajor ? `${v} ${r.unit}` : undefined })
    }
    return { t, pos }
  }
  // band: % deviation from the amount asked, −0.6 … +0.6
  const pos = (d: number) => X0 + W / 2 + (d / 0.6) * (W / 2)
  const t: Tick[] = []
  for (let i = -6; i <= 6; i++) {
    const major = i % 5 === 0
    t.push({ x: pos(i / 10), major, label: major ? (i === 0 ? 'exact' : `${i > 0 ? '+' : '−'}0.5%`) : undefined })
  }
  return { t, pos }
}

function Axis({ t }: { t: Tick[] }) {
  return (
    <g className="axis">
      <line x1={X0} y1={Y} x2={X0 + W} y2={Y} strokeWidth={1.5} />
      {t.map((k, i) =>
        k.major ? (
          <g key={i}>
            <line x1={k.x} y1={Y - 8} x2={k.x} y2={Y + 8} />
            <text x={k.x} y={74} textAnchor="middle">{k.label}</text>
          </g>
        ) : (
          <line key={i} x1={k.x} y1={Y - 4} x2={k.x} y2={Y + 4} strokeWidth={0.6} />
        ),
      )}
    </g>
  )
}

export function Ruler({ scene }: { scene: Scene }) {
  const r = scene.ruler
  // Probes aren't a scale: each question put to the live system, and what it did, as recorded.
  if (r.scale === 'probes')
    return (
      <ol className="probes" aria-label={`Put to the live assistant: ${r.probes.length} questions`}>
        {r.probes.map((p, i) => (
          <li key={i} className={p.answered ? 'ok' : 'no'} style={{ ['--i' as string]: i }}>
            <span className="pk" aria-hidden="true" />
            <q>{p.q}</q>
            <b>{p.answered ? 'answered' : 'blocked'}</b>
          </li>
        ))}
      </ol>
    )
  const { t, pos } = ticks(r)
  const title = `${scene.what}: ${scene.from} to ${scene.to}`

  if (r.scale === 'band') {
    const half = (d: number) => pos(d) - pos(0)
    const scale = band.old / band.now
    return (
      <svg className="ruler" viewBox="0 0 820 84" role="img" aria-label={`${title}. A payment 0.00025 ETH short on a 0.05 ETH order was accepted, and is now refused.`}>
        <Axis t={t} />
        <rect className="band-old" x={pos(-band.old)} y={Y - 14} width={2 * half(band.old)} height={28} />
        <rect className="band" style={{ ['--s' as string]: scale }} x={pos(-band.now)} y={Y - 14} width={2 * half(band.now)} height={28} />
        <circle className="dot-short" cx={pos(band.short)} cy={Y} r={7} />
      </svg>
    )
  }

  const a = pos(r.from), b = pos(r.to), dir = Math.sign(b - a)
  return (
    <svg className="ruler" viewBox="0 0 820 84" role="img" aria-label={title}>
      <Axis t={t} />
      <g className="arrow">
        <line x1={a + dir * 10} y1={12} x2={b - dir * 12} y2={12} strokeWidth={2} />
        <path d={`M${b - dir * 4} 12 l${-dir * 10} -5 v10z`} />
      </g>
      <circle className="mk-old" cx={a} cy={Y} r={7} />
      <circle className="mk-new" style={{ ['--dx' as string]: `${a - b}px` }} cx={b} cy={Y} r={8} />
    </svg>
  )
}
