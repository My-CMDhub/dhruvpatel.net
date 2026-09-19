'use client'
import { useEffect, useState } from 'react'

// The architecture from the senior review deck (customer name and internal role names removed).
type NodeId = 'op' | 'gw' | 'br' | 'hd' | 'db'
type Box = { x: number; y: number; w: number; h: number }
const LAYOUTS: Record<'wide' | 'tall', { vb: string; n: Record<NodeId, Box>; anth: Box; cust: Box }> = {
  wide: {
    vb: '0 0 820 390',
    n: { op: { x: 30, y: 24, w: 110, h: 38 }, gw: { x: 30, y: 150, w: 210, h: 92 }, br: { x: 320, y: 50, w: 210, h: 92 },
      hd: { x: 590, y: 206, w: 210, h: 92 }, db: { x: 320, y: 296, w: 210, h: 72 } },
    anth: { x: 305, y: 18, w: 240, h: 138 }, cust: { x: 575, y: 174, w: 240, h: 138 },
  },
  tall: {
    vb: '0 0 360 690',
    n: { op: { x: 120, y: 12, w: 120, h: 38 }, gw: { x: 40, y: 96, w: 280, h: 84 }, br: { x: 40, y: 262, w: 280, h: 84 },
      hd: { x: 40, y: 428, w: 280, h: 84 }, db: { x: 40, y: 594, w: 280, h: 72 } },
    anth: { x: 26, y: 226, w: 308, h: 132 }, cust: { x: 26, y: 392, w: 308, h: 132 },
  },
}
const NODES: Record<NodeId, { name: string; sub: string; owns: string[]; never?: string[] }> = {
  op: { name: 'Operator', sub: '', owns: ['Asks a question about a monitoring case in the Highlighter app.'] },
  gw: { name: 'Highlighter', sub: 'the gateway · Rails', owns: ['Who is asking: account and site', 'The case and its data', 'Fetching credentials at request time', 'Routing to this customer’s agent environment', 'Starting the agent and storing its answer'],
    never: ['Prompt text', 'The diagnostic workflow', 'Output format rules', 'Domain knowledge', 'Hard-coded site layout'] },
  br: { name: 'Managed agent', sub: 'the brain · Claude', owns: ['System prompt: rules, tone, turn budget', 'Memory store: identity, domain knowledge, lessons, fetched on demand', 'Environment: the queue to this customer’s worker', 'Vault: tokens referenced, never shown in prompts or logs'] },
  hd: { name: 'Worker', sub: 'the hands · ECS Fargate', owns: ['A worker that polls for tool calls', 'SKILL.md: the diagnostic workflow, baked into the image', 'hl CLI to Highlighter’s GraphQL API', 'AVRO → JSON, then DuckDB, jq, rg'],
    never: ['Customer identity', 'API credentials: never baked into the image', 'Customer-specific thresholds', 'The agent’s personality'] },
  db: { name: 'Highlighter data', sub: 'GraphQL API', owns: ['Case data, telemetry and prediction files, read by the worker through the hl CLI.'] },
}
type Step = { title: string; text: string; path: NodeId[]; focus: NodeId[]; metric?: string; cust?: boolean }
const TABS: Record<'q' | 'c', { label: string; steps: Step[] }> = {
  q: { label: 'One question', steps: [
    { title: 'An operator asks about a monitoring case', text: 'The question arrives in the Highlighter app, attached to its case.', path: ['op', 'gw'], focus: ['op', 'gw'] },
    { title: 'Highlighter works out who and what', text: 'It resolves the account, the case and the site, and routes to this customer’s own agent environment. It holds no prompt text and no workflow.', path: ['gw'], focus: ['gw'] },
    { title: 'A session opens, with only this case attached', text: 'The rules and memory already live with the agent; the message carries this case and this question, nothing else.', path: ['gw', 'br'], focus: ['gw', 'br'] },
    { title: 'Claude plans, and scope is settled before any tool runs', text: 'The query is classified into tiers first, so one that should never run is refused before the model acts. Retrieval is index-first: turn one reads only the index, turn two at most two files.', path: ['br'], focus: ['br'], metric: 'first-turn search 23.4 s → 3.9 s · measured, repeated runs' },
    { title: 'The worker does the work inside the customer’s account', text: 'It polls for tool calls with its own task role, reads the case through the hl CLI, queries it with DuckDB and returns the output. Credentials are never in the image.', path: ['br', 'hd', 'db', 'hd', 'br'], focus: ['br', 'hd', 'db'], cust: true },
    { title: 'The answer comes back as JSON', text: 'Highlighter stores it on the case and the app renders it. The API returned text only at the end of a turn, so the typewriter display was a stopgap, and whether to simulate streaming was a question I put to the team.', path: ['br', 'gw', 'op'], focus: ['br', 'gw', 'op'] },
  ] },
  c: { label: 'A new customer', steps: [
    { title: 'One CloudFormation stack, in their own AWS account', text: 'It creates a role that trusts Highlighter only when the ExternalId is that customer’s account ID, plus the network and the Fargate cluster for the worker.', path: ['hd'], focus: ['hd'], cust: true },
    { title: 'Three inputs', text: 'Role ARN, workspace ID and region, typed into Highlighter. Nothing else is asked for.', path: ['op', 'gw'], focus: ['op', 'gw'] },
    { title: 'Highlighter assumes the role through STS', text: 'The ExternalId has to match the customer’s account ID, the defence against a confused-deputy attack. The credentials it gets last one hour.', path: ['gw', 'hd'], focus: ['gw', 'hd'], cust: true },
    { title: 'A job provisions the rest', text: 'A six-step state machine creates the agent, its environment and its memory store, then points the customer’s worker at the new environment.', path: ['gw', 'br', 'hd'], focus: ['gw', 'br', 'hd'] },
    { title: 'Nothing to store', text: 'The customer can revoke the role at any time. Tenants are isolated at six layers: database scope, container cluster, agent environment, memory store, vault and network.', path: ['gw'], focus: ['gw'], metric: '0 AWS keys stored' },
  ] },
}
const OUT_OF_SCOPE: Step = { title: 'Out of scope: refused before any tool runs', text: 'Asked to reach into a staging database, the agent classifies the query first and refuses it. No tool call is made.', path: ['br', 'gw'], focus: ['br', 'gw'], metric: 'refused in 3.3 s · 0 tool calls · measured, repeated runs' }

const center = (b: Box) => [b.x + b.w / 2, b.y + b.h / 2] as const

function Diagram({ layout, step, hosted, inspect, onInspect, refused, calm }: {
  layout: 'wide' | 'tall'; step: Step; hosted: boolean; inspect: NodeId | null; onInspect: (n: NodeId) => void; refused: boolean; calm: boolean
}) {
  const L = LAYOUTS[layout]
  const pts = step.path.map((id) => center(L.n[id]))
  const d = pts.length > 1 ? 'M' + pts.map((p) => p.join(' ')).join(' L') : ''
  const EDGES: [NodeId, NodeId, string, boolean][] = [
    ['op', 'gw', '', false], ['gw', 'br', 'session · prompt', false], ['br', 'hd', 'tool calls · polled', true], ['hd', 'db', 'hl CLI → GraphQL', false],
  ]
  const at = (a: NodeId, b: NodeId) => {
    const [x1, y1] = center(L.n[a]), [x2, y2] = center(L.n[b])
    return layout === 'tall' ? [x1 + 12, (y1 + y2) / 2 + 4] : [(x1 + x2) / 2, (y1 + y2) / 2 - 8]
  }
  const bound = (b: Box, label: string, cls: string) => (
    <g className={`sf-bound ${cls}`}><rect x={b.x} y={b.y} width={b.w} height={b.h} rx="14" /><text x={b.x + 12} y={b.y + 16}>{label}</text></g>
  )
  return (
    <svg className={`sf-svg sf-${layout}`} viewBox={L.vb} role="img" aria-label={`${step.title}. ${step.text}`}>
      {bound(L.anth, 'ANTHROPIC · CLAUDE PLATFORM ON AWS', 'b-anth')}
      {hosted ? bound(L.cust, 'ANTHROPIC-HOSTED SANDBOX', 'b-anth') : bound(L.cust, 'CUSTOMER’S AWS ACCOUNT', `b-cust${step.cust ? ' on' : ''}`)}
      {EDGES.map(([a, b, , dashed]) => {
        const [x1, y1] = center(L.n[a]), [x2, y2] = center(L.n[b])
        return <line key={a + b} className="sf-line" x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dashed ? '4 5' : undefined} />
      })}
      {/* the packet travels under the boxes: visible on the lines, gone inside each layer */}
      {d && calm ? (
        <circle className={`sf-dot${refused ? ' no' : ''}`} r="7" cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} />
      ) : d ? (
        <circle key={step.title + layout + hosted} className={`sf-dot${refused ? ' no' : ''}`} r="7">
          <animateMotion dur={`${0.55 * (pts.length - 1) + 0.3}s`} fill="freeze" path={d} calcMode="spline"
            keyPoints="0;1" keyTimes="0;1" keySplines=".4 0 .2 1" />
        </circle>
      ) : (
        <circle key={step.title + layout} className="sf-pulse" cx={pts[0][0]} cy={pts[0][1]} r="10" />
      )}
      {(Object.keys(NODES) as NodeId[]).map((id) => {
        const b = L.n[id], [cx] = center(b), on = step.focus.includes(id)
        const small = id === 'op'
        return (
          <g key={id} className={`sf-node${on ? ' on' : ''}${inspect === id ? ' sel' : ''}`} tabIndex={0} role="button"
            aria-label={`${NODES[id].name}: what it owns`} onClick={() => onInspect(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onInspect(id))}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={small ? 19 : 12} />
            <text className="t" x={cx} y={b.y + (small ? 24 : b.h / 2 - 2)} textAnchor="middle">
              {id === 'hd' && hosted ? 'Sandbox' : NODES[id].name}
            </text>
            {!small && <text className="s" x={cx} y={b.y + b.h / 2 + 18} textAnchor="middle">
              {id === 'hd' && hosted ? 'the hands · Anthropic-hosted' : NODES[id].sub}
            </text>}
          </g>
        )
      })}
      {EDGES.filter((e) => e[2]).map(([a, b, label]) => {
        const [x, y] = at(a, b)
        return <text key={label} className="sf-label" x={x} y={y} textAnchor={layout === 'tall' ? 'start' : 'middle'}>{label}</text>
      })}
    </svg>
  )
}

export function SilverpondFlow() {
  const [tab, setTab] = useState<'q' | 'c'>('q')
  const [i, setI] = useState(0)
  const [hosted, setHosted] = useState(false)
  const [inspect, setInspect] = useState<NodeId | null>(null)
  const [refused, setRefused] = useState(false)
  const [calm, setCalm] = useState(false)
  useEffect(() => setCalm(matchMedia('(prefers-reduced-motion: reduce)').matches), [])
  const steps = TABS[tab].steps
  const step = refused ? OUT_OF_SCOPE : steps[i]
  const go = (n: number) => { setRefused(false); setI(Math.max(0, Math.min(steps.length - 1, n))) }

  useEffect(() => { setI(0); setRefused(false) }, [tab])

  return (
    <figure className="sflow" aria-labelledby="sf-h"
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1) }}>
      <p className="inv-eye" id="sf-h">Follow the work</p>
      <div className="sf-tabs" role="tablist">
        {(['q', 'c'] as const).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>{TABS[k].label}</button>
        ))}
      </div>

      <div className="sf-stage">
        <Diagram layout="wide" step={step} hosted={hosted} inspect={inspect} onInspect={setInspect} refused={refused} calm={calm} />
        <Diagram layout="tall" step={step} hosted={hosted} inspect={inspect} onInspect={setInspect} refused={refused} calm={calm} />
      </div>

      <div className="sf-caption" aria-live="polite">
        <p className="sf-count">{refused ? 'Branch' : `${i + 1} / ${steps.length}`}</p>
        <p className="sf-title">{step.title}</p>
        <p className="sf-text">{step.text}</p>
        {step.metric && <p className="sf-metric">{step.metric}</p>}
      </div>

      <div className="sf-controls">
        <button type="button" onClick={() => (refused ? setRefused(false) : go(i - 1))} disabled={!refused && i === 0} aria-label="Previous step">←</button>
        <button type="button" className="sf-next" onClick={() => (refused ? setRefused(false) : go(i + 1))} disabled={!refused && i === steps.length - 1}>
          {refused ? 'Back to the question' : i === steps.length - 1 ? 'End' : 'Next step →'}
        </button>
        {tab === 'q' && i === 3 && !refused && (
          <button type="button" className="sf-branch" onClick={() => setRefused(true)}>Ask something out of scope</button>
        )}
      </div>

      <div className="sf-switch" role="group" aria-label="Where the worker runs">
        <span>Where the worker runs</span>
        <button type="button" aria-pressed={!hosted} onClick={() => setHosted(false)}>Customer’s account</button>
        <button type="button" aria-pressed={hosted} onClick={() => setHosted(true)}>Anthropic’s sandbox</button>
        <p>{hosted
          ? 'No standing worker per customer, so it costs less to run. Execution happens in Anthropic’s sandbox, outside the customer’s account.'
          : 'Execution and data stay inside the customer’s own account. The review made this the primary path for enterprise customers.'}</p>
      </div>

      {inspect && (
        <div className="sf-inspect">
          <p className="sf-title">{NODES[inspect].name} <button type="button" onClick={() => setInspect(null)} aria-label="Close">×</button></p>
          <div className="sf-cols">
            <div><b>Owns</b><ul>{NODES[inspect].owns.map((o) => <li key={o}>{o}</li>)}</ul></div>
            {NODES[inspect].never && <div><b>Must never own</b><ul>{NODES[inspect].never!.map((o) => <li key={o}>{o}</li>)}</ul></div>}
          </div>
        </div>
      )}
      <p className="ap-honest">Tap any box to see what that layer owns. Built both ways during the internship; the code is Silverpond’s and isn’t public.</p>
      <figcaption className="cap"><a className="lbl lbl-source" href="#src-review">diagram · the architecture from my senior review, customer names removed</a></figcaption>
    </figure>
  )
}
