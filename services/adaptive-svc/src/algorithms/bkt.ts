export type BKTParams = {
  pL0: number // initial knowledge
  pT: number // learning rate
  pG: number // guess
  pS: number // slip
  decay?: number // temporal decay [0,1]
}

export type BKTState = {
  mastery: number
  lastUpdated: number
}

export type Observation = {
  correct: boolean
  responseTimeMs?: number
  confidence?: number // [0,1]
}

export function updateBKT(state: BKTState, params: BKTParams, obs: Observation): BKTState {
  const now = Date.now()
  const decay = params.decay ?? 1
  const dt = Math.max(0, now - state.lastUpdated)
  const decayedMastery = 1 - (1 - state.mastery) * Math.pow(decay, dt / 3600000)

  const { pG, pS, pT } = params
  const pCorrectGivenKnow = 1 - pS
  const pCorrectGivenNotKnow = pG
  const isCorrect = obs.correct

  const numerator = (isCorrect ? pCorrectGivenKnow : 1 - pCorrectGivenKnow) * decayedMastery
  const denominator =
    numerator + (isCorrect ? pCorrectGivenNotKnow : 1 - pCorrectGivenNotKnow) * (1 - decayedMastery)
  const posterior = denominator === 0 ? decayedMastery : numerator / denominator

  // learning transition
  const mastery = posterior + (1 - posterior) * pT
  return { mastery: Math.min(0.999, Math.max(0.001, mastery)), lastUpdated: now }
}