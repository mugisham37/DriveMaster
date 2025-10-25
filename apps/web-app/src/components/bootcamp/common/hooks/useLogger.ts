import { useEffect } from 'react'

export function useLogger(label: string, value: unknown) {
  useEffect(() => {
    console.log(label, value)
  }, [label, value])
}
