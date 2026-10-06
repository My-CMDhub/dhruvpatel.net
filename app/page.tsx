import { also, recognition, scenes, site } from '@/data/figures'
import { Scene } from '@/components/Scene'
import { Journey } from '@/components/Journey'
import { Intro } from '@/components/Intro'
import { Signature } from '@/components/Signature'

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="place">{site.role}</p>
        <Intro />
        <Journey />
      </section>
      <div id="work">
        {(['project', 'internship'] as const).map((g) => (
          <div key={g} className="grp">
            <h2 className="grp-h">{g === 'project' ? 'Some of what I’ve built' : 'Where I’ve worked'}</h2>
            {scenes.filter((s) => s.group === g).map((s) => <Scene key={s.slug} s={s} />)}
          </div>
        ))}
      </div>
      <section className="recog" aria-labelledby="h-recog">
        <h2 id="h-recog" className="grp-h">Recognition</h2>
        {recognition.map((r) => (
          <article key={r.href} className="recog-card">
            <a className="recog-badge" href={r.href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
              <img src={r.image} alt="" width={120} height={120} />
            </a>
            <div>
              <p className="recog-award">{r.award}<span className="when">{r.when}</span></p>
              <h3><a href={r.href} target="_blank" rel="noopener noreferrer">{r.title} ↗</a></h3>
              <p className="recog-text">{r.text}</p>
              <p className="recog-proof"><a href={r.proof} target="_blank" rel="noopener noreferrer">DEV’s winners announcement ↗</a></p>
            </div>
          </article>
        ))}
      </section>
      <Signature />
      {/* Folded behind the question a reader is already asking by now. Native, so it needs no script,
          and Chrome opens it by itself when find-in-page matches something inside. */}
      <details className="also">
        <summary><h2>Anything else?</h2></summary>
        <ul>
          {also.map((a) => (
            <li key={a.name}>
              <span className="nm">
                {a.logo && <img className="org-i" src={a.logo} alt="" width={18} height={18} />}
                {a.href ? <a href={a.href}>{a.name}</a> : a.name}
              </span>
              <span className="when">{a.when}</span>
              <span className="txt">{a.text}</span>
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}
