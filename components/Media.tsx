import fs from 'node:fs'
import path from 'node:path'

/**
 * A video or image from public/. If the file isn't there yet, `next dev` shows a placeholder saying
 * what to drop in, and the production build renders nothing — so a missing file never ships a hole.
 */
export function Media({ src, alt, caption, poster }: { src: string; alt: string; caption?: string; poster?: string }) {
  // Support running next dev from either site/ or the repo root
  const candidateDirs = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'site', 'public'),
    path.resolve(process.cwd(), '..', 'site', 'public'),
  ]

  let resolvedPath: string | null = null
  let resolvedSrc = src

  const ext = path.extname(src)
  const base = ext ? src.slice(0, -ext.length) : src
  const extsToTry = ext ? [ext, '.png', '.jpg', '.jpeg', '.webp', '.svg'] : ['.png', '.jpg', '.jpeg', '.webp', '.svg']

  for (const dir of candidateDirs) {
    for (const e of extsToTry) {
      const candidateFile = path.join(dir, base + e)
      if (fs.existsSync(candidateFile)) {
        resolvedPath = candidateFile
        resolvedSrc = base + e
        break
      }
    }
    if (resolvedPath) break
  }

  if (!resolvedPath) {
    return process.env.NODE_ENV === 'production' ? null : (
      <figure className="media ph"><p>Placeholder · add <code>public{src}</code> — {alt}</p></figure>
    )
  }
  const isVideo = /\.(mp4|webm|mov)$/i.test(resolvedSrc)
  return (
    <figure className="media">
      {isVideo ? (
        <video src={resolvedSrc} poster={poster} controls preload="metadata" playsInline aria-label={alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolvedSrc} alt={alt} loading="lazy" />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
