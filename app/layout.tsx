import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Serif } from 'next/font/google'
import { site } from '@/data/figures'
import { ext } from '@/components/Label'
import { Perspective } from '@/components/Perspective'
import './globals.css'

const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-sans' })
const cond = IBM_Plex_Sans_Condensed({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-cond' })
const serif = IBM_Plex_Serif({ subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'], variable: '--f-serif' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-mono' })

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.positioning,
}

// Motion: the HTML is already in its final state. This marks scenes "in" as they enter view, and the
// CSS only runs the before-state when motion is allowed — so no-JS and reduced-motion see the result.
// Page to page (S56): both headings are snapshotted in oxblood so nothing cross-fades, then the real
// one settles to ink; "\u2190 Work" steps back through history so your place on the home page returns.
// Intro (S35): home page, once per visit, motion allowed. The name opens centred, settles into place, the
// measuring line draws, the rest arrives. Any scroll, tap or key finishes it at once; 3.5 s is a hard stop.
const motion = `(function(){var d=document.documentElement;d.classList.add('js');
try{d.setAttribute('data-reader',localStorage.getItem('reader')||'look')}catch(e){}
var calm=matchMedia('(prefers-reduced-motion: reduce)').matches,seen=1;
try{seen=sessionStorage.getItem('intro');sessionStorage.setItem('intro','1')}catch(e){}
if(!calm&&!seen&&location.pathname==='/'&&!location.hash){d.classList.add('intro');
var ev=['wheel','touchstart','keydown','pointerdown'],done=function(){d.classList.remove('intro','intro-on','intro-go');ev.forEach(function(n){removeEventListener(n,done)})};
ev.forEach(function(n){addEventListener(n,done,{passive:true})});setTimeout(done,3400);
addEventListener('DOMContentLoaded',function(){var go=function(){if(!d.classList.contains('intro'))return;
var h=document.querySelector('.hero h1'),r=h.getBoundingClientRect(),w=innerWidth,s=Math.min(1.25,.86*w/r.width);
h.style.setProperty('--ix',(w/2-r.left-r.width/2)+'px');h.style.setProperty('--iy',(innerHeight/2-r.top-r.height/2)+'px');h.style.setProperty('--is',s);
d.classList.add('intro-on');setTimeout(function(){d.classList.add('intro-go')},700);setTimeout(done,2700)};
Promise.race([document.fonts.ready,new Promise(function(r){setTimeout(r,400)})]).then(go)})}
addEventListener('pageswap',function(e){if(e.viewTransition)d.classList.add('vt-arrive')});
addEventListener('pagereveal',function(e){if(!e.viewTransition)return;d.classList.add('vt-arrive');
e.viewTransition.finished.then(function(){d.classList.add('vt-settle')})});
addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.back a');
if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)return;
try{if(document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1){e.preventDefault();history.back()}}catch(err){}});
addEventListener('DOMContentLoaded',function(){var s=document.querySelectorAll('.scene');if(!('IntersectionObserver'in window)){s.forEach(function(e){e.classList.add('in')});return}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.35});s.forEach(function(e){io.observe(e)})})})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script adds "js"/"intro" classes to <html> before React loads, on purpose.
    <html lang="en-AU" className={`${sans.variable} ${cond.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motion }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="wrap">
          <header className="top">
            <a className="me" href="/">{site.name}</a>
            <nav aria-label="Site">
              <a href="/#work">Work</a>
              <a href="/about/">About</a>
              <a className="ext" href={site.github} {...ext(site.github)}>GitHub ↗</a>
              <a className="ext" href={site.linkedin} {...ext(site.linkedin)}>LinkedIn ↗</a>
              <a href={`mailto:${site.email}`}>Email</a>
            </nav>
          </header>
          <main id="main">{children}</main>
          <Perspective />
          <footer className="contact">
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <a href={site.github} {...ext(site.github)}>GitHub ↗</a>
            <a href={site.linkedin} {...ext(site.linkedin)}>LinkedIn ↗</a>
          </footer>
        </div>
      </body>
    </html>
  )
}
