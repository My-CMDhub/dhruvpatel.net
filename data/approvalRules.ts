// Agent-OS's approval rules, re-enacted for the browser. Keyword lists, limits and messages are copied from
// My-CMDhub/Agent-OS: leanring-buddy/ActionSafetyKernel.swift and HarnessConfirmations.swift.
// What a browser can't see (source pid, window number, click location) is taken as passing for a real
// click; what it can see (a real click vs a scripted call, keyboard vs pointer, multi-click, how long the
// card has been still) is checked the same way the harness checks it.

export const IRREVERSIBLE = ['empty trash', 'empty bin', 'delete immediately', 'permanently', 'erase', 'buy', 'pay', 'purchase']
export const DESTRUCTIVE = ['delete', 'remove', 'send', 'reset', 'trash', 'quit', 'empty', 'eject', 'log out', 'shut down', 'move to bin']
export const TICKET_LIFETIME_S = 60
export const MIN_ROW_SETTLED_MS = 800

export type Decision =
  | { kind: 'allow' }
  | { kind: 'confirm'; reason: string; destructive: boolean }
  | { kind: 'refuse'; reason: string }

/** The kernel's title checks for a press/select, in the order evaluate() runs them. */
export function evaluate(title: string): Decision {
  const t = title.toLowerCase()
  const irreversible = IRREVERSIBLE.find((k) => t.includes(k))
  if (irreversible)
    return { kind: 'refuse', reason: `refusing an irreversible action: the title contains "${irreversible}" — this has no undo, so it has no confirmed path past it either; a human does this one themselves` }
  const destructive = DESTRUCTIVE.find((k) => t.includes(k))
  if (destructive) return { kind: 'confirm', reason: `title suggests a destructive action: ${destructive}`, destructive: true }
  return { kind: 'allow' }
}

/** What the page knows about the press on Allow. `null` = no input event at all (a scripted press). */
export type Press = null | { pointer: boolean; clickCount: number; rowSettledMs: number }

/** ApprovalInput.verdict, for the checks a browser can make. Deny counts from anything, so it isn't checked. */
export function verdict(p: Press): { ok: true } | { ok: false; reason: string } {
  if (p === null) return { ok: false, reason: 'no input event (programmatic press, e.g. Accessibility)' }
  if (!p.pointer) return { ok: false, reason: 'event type is not a left mouse-up — an approval counts only from a click released on the button' }
  if (p.clickCount > 1) return { ok: false, reason: `click ${p.clickCount} of a multi-click — it may have landed on a row that moved under the first` }
  if (p.rowSettledMs < MIN_ROW_SETTLED_MS)
    return { ok: false, reason: `the row had been in place ${Math.round(p.rowSettledMs)} ms, needs ${MIN_ROW_SETTLED_MS} ms — click again` }
  return { ok: true }
}

/** HarnessConfirmations.offersAlwaysRule: destructive questions get Allow once and Deny only. */
export const offersAlways = (d: Decision) => d.kind === 'confirm' && !d.destructive
