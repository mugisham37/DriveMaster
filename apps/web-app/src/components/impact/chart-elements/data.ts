type DateMap = { [key: string]: number }
export function generateAccumulatedData(rawData: { [key: string]: number }): {
  dataArray: number[]
  keys: string[]
  dateMap: DateMap
} {
  const array = []
  const dateMap: DateMap = {}
  const values = Object.values(rawData)
  const keys = Object.keys(rawData)
  let base = 400000 // bottom offset
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const key = keys[i]
    if (value !== undefined && key !== undefined) {
      base += value
      array.push(base)
      dateMap[key] = i
    }
  }
  return { dataArray: array, keys, dateMap }
}
