import fs from 'node:fs'
import path from 'node:path'

/**
 * A video or image from public/. If the file isn't there yet, `next dev` shows a placeholder saying
 * what to drop in, and the production build renders nothing — so a missing file never ships a hole.
 */
export function Media({ src, alt, caption, poster }: { src: string; alt: string; caption?: string; poster?: string }) {
  if (!fs.existsSync(path.join(process.cwd(), 'public', src))) {
    return process.env.NODE_ENV === 'production' ? null : (
      <figure className="media ph"><p>Placeholder · add <code>public{src}</code> — {alt}</p></figure>
    )
  }
  const isVideo = /\.(mp4|webm|mov)$/i.test(src)
  return (
    <figure className="media">
      {isVideo ? (
        <video src={src} poster={poster} controls preload="metadata" playsInline aria-label={alt} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
