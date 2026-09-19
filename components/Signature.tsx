'use client'
import { useEffect, useState } from 'react'

// The site's one hidden sound: "Calibrated", a tick then a fifth. It plays once per visit, when a reader
// has opened every "How it was earned" ledger on the home page. Synthesised here; there is no audio file.
function calibrated(c: BaseAudioContext, out: AudioNode) {
  const env = (g: GainNode, t: number, peak: number, d: number) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + d)
  }
  const tone = (t: number, f: number, peak: number, d: number) => {
    const o = c.createOscillator(), g = c.createGain()
    o.frequency.value = f; env(g, t, peak, d); o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05)
  }
  const len = Math.floor(c.sampleRate * 0.12), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0)
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
  const n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain()
  n.buffer = buf; bp.frequency.value = 4200; bp.Q.value = 2.5; env(g, 0, 0.35, 0.018)
  n.connect(bp).connect(g).connect(out); n.start(0)
  tone(0.06, 880, 0.16, 0.45); tone(0.06, 440, 0.05, 0.35); tone(0.17, 1318.5, 0.13, 0.7)
}

async function play(ctx: AudioContext) {
  const off = new OfflineAudioContext(1, 44100, 44100)
  calibrated(off, off.destination)
  const buf = await off.startRendering(), d = buf.getChannelData(0)
  let peak = 0
  for (const v of d) peak = Math.max(peak, Math.abs(v))
  const src = ctx.createBufferSource(), g = ctx.createGain()
  src.buffer = buf; g.gain.value = peak ? 0.5 / peak : 1
  src.connect(g).connect(ctx.destination)
  await ctx.resume(); src.start()
}

export function Signature() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const all = document.querySelectorAll('details.earn')
    const opened = new Set<Element>()
    let ctx: AudioContext | null = null
    // The context has to be made inside the tap itself, or browsers keep it silent.
    const onClick = (e: Event) => {
      if (ctx || !(e.target as Element).closest?.('details.earn > summary')) return
      try {
        const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
        if (s) s.type = 'ambient' // a phone's silent switch mutes it
        ctx = new AudioContext()
      } catch { /* no Web Audio: the note still shows */ }
    }
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement
      if (!d.matches?.('details.earn') || !d.open) return
      opened.add(d)
      if (opened.size < all.length) return
      try { if (sessionStorage.getItem('calibrated')) return; sessionStorage.setItem('calibrated', '1') } catch {}
      if (ctx) play(ctx).catch(() => {})
      setShown(true)
      setTimeout(() => setShown(false), 4200)
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('toggle', onToggle, true) // toggle doesn't bubble; capture still sees it
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('toggle', onToggle, true) }
  }, [])
  return (
    <p className={`sig${shown ? ' on' : ''}`} role="status" aria-live="polite">
      {shown && <><span className="o">○</span> → <span className="f">●</span> every ledger opened. Thank you for checking.</>}
    </p>
  )
}
