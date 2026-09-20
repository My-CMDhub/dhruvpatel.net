import { DEFAULT, forCase, personas } from '@/data/personas'

// The paragraph at the top of a case page, in the terms of whoever said they were reading.
// Every version is in the HTML and CSS shows the one that matches the `data-reader` attribute the
// layout's pre-hydration script stamps on <html>. No JavaScript takes part in the swap, so the
// right paragraph is painted on the first frame — there is no flash of the wrong one, no layout
// shift, and nothing for React to disagree with the server about. With JS off, the default shows.

export function ForYou({ slug }: { slug: string }) {
  const lines = forCase[slug]
  if (!lines?.[DEFAULT]) return null
  return (
    <aside className="foryou">
      {personas.map((p) => (
        <p key={p.id} className={`fy fy-${p.id}`}>{lines[p.id] ?? lines[DEFAULT]}</p>
      ))}
    </aside>
  )
}
