import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function removeEmpty(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  
  return result
}

export function useHistory({ pushOn }: { pushOn: Record<string, any> }) {
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