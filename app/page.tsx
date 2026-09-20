import { also, scenes, site } from '@/data/figures'
import { Scene } from '@/components/Scene'
import { Journey } from '@/components/Journey'
import { Signature } from '@/components/Signature'
import { Perspective } from '@/components/Perspective'

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>{site.name}</h1>
        <Journey />
        <p className="place">{site.place}</p>
        <p className="pos">{site.positioning}</p>
        <Perspective />
      </section>
      <div id="work">
        {(['project', 'internship'] as const).map((g) => (
          <div key={g} className="grp">
            <p className="grp-h">{g === 'project' ? 'Projects' : 'Internships'}</p>
            {scenes.filter((s) => s.group === g).map((s) => <Scene key={s.slug} s={s} />)}
          </div>
        ))}
      </div>
      <Signature />
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
