export type ArmStats = { alpha: number; beta: number }

export function sampleBeta({ alpha, beta }: ArmStats) {
  // Placeholder sampling via simple heuristic (replace with real Beta RNG or library)
  return alpha / (alpha + beta)
}

export function thompsonSelect(arms: Record<string, ArmStats>): string {
  let best = { arm: '', score: -1 }
  for (const [arm, stats] of Object.entries(arms)) {
    const score = sampleBeta(stats)
    if (score > best.score) best = { arm, score }
  }
  return best.arm
}