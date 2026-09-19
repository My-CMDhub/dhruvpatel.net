// A project's NOT YET line is written once, in its own README, between these markers:
//   <!-- not-yet -->as fast when a tool runs · 1.1–1.7 s<!-- /not-yet -->
// The site build and the GitHub profile both read it from there. Anything that isn't a short
// plain-text line is ignored, and the line in figures.ts stays.
export const NOT_YET_MAX = 60

export function extractNotYet(md: string): string | null {
  const m = md.match(/<!--\s*not-yet\s*-->([\s\S]*?)<!--\s*\/not-yet\s*-->/)
  if (!m) return null
  const line = m[1].replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim()
  return line.length >= 3 && line.length <= NOT_YET_MAX && !/[<>]/.test(line) ? line : null
}

// Which README feeds which home scene. Only the projects still being worked on.
export const LIVE_READMES: Record<string, string> = {
  ovela: 'https://raw.githubusercontent.com/My-CMDhub/Ovela-AI/HEAD/README.md',
  'agent-os': 'https://raw.githubusercontent.com/My-CMDhub/Agent-OS/HEAD/README.md',
}
