import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type PrimitiveValue = string | number | boolean | null | undefined

export function removeEmpty(obj: Record<string, PrimitiveValue>): Record<string, PrimitiveValue> {
  const result: Record<string, PrimitiveValue> = {}
  
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  
  return result
}

export function useHistory({ pushOn }: { pushOn: Record<string, PrimitiveValue> }) {
  const router = useRouter()
  
  useEffect(() => {
    const params = new URLSearchParams()
    
    Object.entries(pushOn).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    
    if (newUrl !== window.location.pathname + window.location.search) {
      router.push(newUrl)
    }
  }, [pushOn, router])
}