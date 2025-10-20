import { useMemo, useRef } from 'react'

// Deep memo hook to preserve exact behavior from Rails implementation
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value)
  
  return useMemo(() => {
    if (JSON.stringify(value) !== JSON.stringify(ref.current)) {
      ref.current = value
    }
    return ref.current
  }, [value])
}