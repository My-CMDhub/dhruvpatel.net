import { also, scenes, site } from '@/data/figures'
import { Scene } from '@/components/Scene'
import { Journey } from '@/components/Journey'
import { Signature } from '@/components/Signature'

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>{site.name}</h1>
        <Journey />
        <p className="place">{site.place}</p>
        <p className="pos">{site.positioning}</p>
        <p className="me">{site.me}</p>
      </section>
      <div id="work">
        {(['project', 'internship'] as const).map((g) => (
          <div key={g} className="grp">
            <h2 className="grp-h">{g === 'project' ? 'Some of what I’ve built' : 'Where I’ve worked'}</h2>
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
