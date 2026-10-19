import { tech } from '@/data/tech'

/** A brand mark. A vector is drawn as a mask so it takes the brand's colour, or the text colour on
 *  the dark theme when that brand is near-black; a full-colour file is drawn as it is. */
export function Mark({ name, size = 13 }: { name: string; size?: number }) {
  const t = tech[name]
  if (!t) return null
  if (t.img) return <img className="ti" src={t.src} alt="" width={size} height={size} />
  return (
    <i className={`ti${t.ink ? ' ink' : ''}`} aria-hidden="true"
      style={{ ['--i' as string]: `url(${t.src})`, ['--c' as string]: t.color }} />
  )
}

/** "TabPFN" → "TP", "Gemma 4" → "G4": its capitals and digits, first two. */
const monogram = (n: string) => (n.match(/[A-Z0-9]/g) ?? [n[0]]).slice(0, 2).join('')

/** A case page's stack as a chain of overlapping marks. Each name appears on hover, and a screen
 *  reader hears the whole list. */
export function StackChain({ stack }: { stack: string[] }) {
  return (
    <ul className="chain" aria-label={`Built with ${stack.join(', ')}`}>
      {stack.map((n) => (
        <li key={n}>{tech[n] ? <Mark name={n} size={16} /> : <b className="ti-txt" aria-hidden="true">{monogram(n)}</b>}<span className="chain-tip" aria-hidden="true">{n}</span></li>
      ))}
    </ul>
  )
}
