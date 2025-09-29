export type BKTParams = { pL0: number; pT: number; pG: number; pS: number }

export function bktUpdate(params: BKTParams, correct: boolean, prior?: number): number {
  const { pL0, pT, pG, pS } = params
  const pPrev = prior ?? pL0
  const pNotKnown = 1 - pPrev
  const num = correct ? pPrev * (1 - pS) : pPrev * pS
  const den = correct ? (pPrev * (1 - pS) + pNotKnown * pG) : (pPrev * pS + pNotKnown * (1 - pG))
  const pGivenObs = den === 0 ? pPrev : num / den
  const pLearned = pGivenObs + (1 - pGivenObs) * pT
  return Math.max(0, Math.min(1, pLearned))
}
