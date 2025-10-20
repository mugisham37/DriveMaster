import { useEffect } from 'react'
import { useRouter } from 'next/router'

// History hooks to preserve exact behavior from Rails implementation
export function useHistory({ pushOn }: { pushOn: any }) {
  const router = useRouter()

  useEffect(() => {
    if (pushOn && Object.keys(pushOn).length > 0) {
      const params = new URLSearchParams()
      Object.entries(pushOn).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      const queryString = params.toString()
      const newUrl = queryString ? `${router.pathname}?${queryString}` : router.pathname
      
      router.push(newUrl, undefined, { shallow: true })
    }
  }, [pushOn, router])
}

export function removeEmpty(obj: any): any {
  if (!obj) return {}
  
  const result: any = {}
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  
  return result
}