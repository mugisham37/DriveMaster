import { describe, it, expect } from 'vitest'
import { updateBKT } from './bkt'

describe('BKT update', () => {
  it('updates mastery within bounds', () => {
    const state = { mastery: 0.2, lastUpdated: Date.now() - 3600_000 }
    const params = { pL0: 0.2, pT: 0.1, pG: 0.2, pS: 0.1, decay: 0.99 }
    const next = updateBKT(state, params, { correct: true })
    expect(next.mastery).toBeGreaterThan(0)
    expect(next.mastery).toBeLessThan(1)
  })
})