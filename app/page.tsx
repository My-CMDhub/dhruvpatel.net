import { also, scenes, site } from '@/data/figures'
import { Scene } from '@/components/Scene'

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>{site.name}</h1>
        <svg className="hero-line" viewBox="0 0 820 20" aria-hidden="true">
          <line x1="10" y1="10" x2="810" y2="10" />
          {Array.from({ length: 41 }, (_, i) => (
            <line key={i} x1={10 + i * 20} x2={10 + i * 20} y1={i % 10 ? 7 : 3} y2={i % 10 ? 13 : 17} strokeWidth={i % 10 ? 0.6 : 1} />
          ))}
        </svg>
        <p className="place">{site.place}</p>
        <p className="pos">{site.positioning}</p>
      </section>
      <div id="work">
        {(['project', 'internship'] as const).map((g) => (
          <div key={g} className="grp">
            <p className="grp-h">{g === 'project' ? 'Projects' : 'Internships'}</p>
            {scenes.filter((s) => s.group === g).map((s) => <Scene key={s.slug} s={s} />)}
          </div>
        ))}
      </div>
      <section className="also" aria-labelledby="h-also">
        <h2 id="h-also">Also</h2>
        <ul>
          {also.map((a) => (
            <li key={a.name}>
              <span className="nm">{a.href ? <a href={a.href}>{a.name}</a> : a.name}</span>
              <span className="when">{a.when}</span>
              <span className="txt">{a.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
