import { retractions, scenes, site } from '@/data/figures'

// The GitHub profile (My-CMDhub/My-CMDhub, transmit.py) draws its header and cards from this, so the
// two never say different things. Exported as a static file with the rest of the site.
export const dynamic = 'force-static'

export function GET() {
  const d = new Date()
  return Response.json({
    tagline: site.tagline,
    now: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,   // the month the journey line ends on
    retractions,
    scenes: scenes.map(({ slug, group, name, kind, repo, what, from, to, ruler, label, notYet }) =>
      ({ slug, group, name, kind, repo, what, from, to, ruler, label, notYet, href: `https://dhruvpatel.net/work/${slug}/` })),
  })
}
