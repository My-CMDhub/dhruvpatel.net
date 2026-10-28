import { posts } from '@/data/posts'

export const metadata = { title: 'Writing', description: 'Notes on building software around AI models, and what it teaches me.' }

export default function Blog() {
  return (
    <article className="post">
      <header className="post-head">
        <h1>Writing</h1>
        <p className="post-dek">Notes from building things around AI models, written while I’m still figuring them out.</p>
      </header>
      <ul className="post-list">
        {posts.map((p) => (
          <li key={p.slug}>
            <a href={`/blog/${p.slug}/`}>
              <span className="post-meta">{p.when} · {p.minutes} min read</span>
              <b>{p.title}</b>
              <span>{p.dek}</span>
            </a>
          </li>
        ))}
      </ul>
    </article>
  )
}
