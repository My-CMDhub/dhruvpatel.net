// Runs before every build: fetch each live project's README and keep its NOT YET line.
// Network or marker trouble just means that project keeps the line in figures.ts.
import { writeFileSync } from 'node:fs'
import { extractNotYet, LIVE_READMES } from '../data/notYet.ts'

const out: Record<string, string> = {}
for (const [slug, url] of Object.entries(LIVE_READMES)) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const line = res.ok ? extractNotYet(await res.text()) : null
    if (line) out[slug] = line
    console.log(`not-yet · ${slug}: ${line ?? '(keeping figures.ts)'}`)
  } catch {
    console.log(`not-yet · ${slug}: unreachable (keeping figures.ts)`)
  }
}
writeFileSync(new URL('../data/not-yet.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
