/**
 * User Service Client Hook
 * React hook for accessing the user service client
 */

import { useMemo } from 'react'
import { UserServiceClient } from '../lib/user-service/unified-client'

// Global client instance
let globalUserServiceClient: UserServiceClient | null = null

export function useUserServiceClient(): UserServiceClient {
  return useMemo(() => {
    if (!globalUserServiceClient) {
      globalUserServiceClient = new UserServiceClient()
    }
    return globalUserServiceClient
  }, [])
}

export function getUserServiceClient(): UserServiceClient {
  if (!globalUserServiceClient) {
    globalUserServiceClient = new UserServiceClient()
  }
  return globalUserServiceClient
}