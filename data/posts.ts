// The blog's index, newest first. Each post is its own page.mdx under app/blog/<slug>/.
export const posts: { slug: string; title: string; when: string; dek: string; minutes: number }[] = [
  {
    slug: 'privacy-now-with-perfect-memory',
    title: 'Privacy, now with perfect memory',
    when: 'October 2026',
    dek: 'My dad told me to lie about my birthday. It took an AI agent and a plain-text API key to see what he was really protecting.',
    minutes: 5,
  },
]
