export type ReviewItem = {
  id: string
  interval: number // days
  easiness: number // SM-2 E-Factor
  repetitions: number
  dueAt: number // ms epoch
}

export function scheduleNext(item: ReviewItem, quality: 0 | 1 | 2 | 3 | 4 | 5): ReviewItem {
  let { easiness, repetitions, interval } = item
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easiness)
    repetitions += 1
    easiness = Math.max(1.3, easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  }
  return {
    ...item,
    easiness,
    repetitions,
    interval,
    dueAt: Date.now() + interval * 24 * 60 * 60 * 1000,
  }
}