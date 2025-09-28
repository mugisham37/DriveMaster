export type IRTParams = { a: number; b: number; c: number }

// 3PL probability of correct response
export function probability3PL(theta: number, { a, b, c }: IRTParams) {
  const exp = Math.exp(-a * (theta - b))
  return c + (1 - c) / (1 + exp)
}

// Placeholder calibration updater (to be replaced with proper estimation)
export function updateIRT(params: IRTParams, correct: boolean): IRTParams {
  const delta = correct ? -0.01 : 0.01
  return { a: Math.max(0.1, params.a), b: params.b + delta, c: Math.min(0.35, Math.max(0.05, params.c)) }
}