// The capstone's amount check, at two points in its git history, ported line for line (logging removed).
// Source: My-CMDhub/Blockchain-based-Industry-Project — 89f386b (14 Apr 2025, server.js)
// and 5586c22 (10 May 2025, server/utils/web3Utils.js). `null` stands for an amount that can't be read.

/** "0.00181982" → wei as BigInt, the way web3.utils.toWei(x, 'ether') does. */
function toWei(eth: string): bigint {
  const [whole, frac = ''] = eth.split('.')
  return BigInt(whole || '0') * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18) || '0')
}

/** 14 Apr: ±0.5% in exact integer wei. Anything it can't read counts as correct ("to avoid blocking funds"). */
export function april14(expected: string, actual: string | null): boolean {
  try {
    if (actual === null || isNaN(parseFloat(actual))) return true
    const e = toWei(expected), a = toWei(actual)
    const allowed = (e * 5n) / 1000n
    return a >= e - allowed && a <= e + allowed
  } catch {
    return true
  }
}

/** 10 May: floats; six decimals, or one unit off in the sixth, or a tiny absolute/percentage margin. Fails closed. */
export function may10(expected: string, actual: string | null): boolean {
  try {
    if (actual === null) return false
    const e = parseFloat(expected), a = parseFloat(actual)
    if (isNaN(e) || isNaN(a)) return false
    const exactMatch = e.toFixed(6) === a.toFixed(6)
    // The source comments call these 0.1 / 0.2 / 0.3 %; divided by 100 they are 0.001 / 0.002 / 0.003 %.
    const allowedPercentage = e < 0.001 ? 0.001 : e < 0.01 ? 0.002 : 0.003
    const diff = Math.abs(e - a)
    const withinRange = diff <= Math.min(0.000002, e * (allowedPercentage / 100))
    const offByOneInLastPlace = Math.abs(Math.round(e * 1e6) - Math.round(a * 1e6)) <= 1
    return exactMatch || withinRange || offByOneInLastPlace
  } catch {
    return false
  }
}

/** Widest accepted deviation (in % of `expected`) for a rule, found by stepping out 1 wei-ish at a time. */
export function halfWidthPct(rule: (e: string, a: string) => boolean, expected: string, stepEth = 1e-9): number {
  const e = parseFloat(expected)
  let k = 0
  while (k < 1e6 && rule(expected, (e - (k + 1) * stepEth).toFixed(12))) k++
  return ((k * stepEth) / e) * 100
}
