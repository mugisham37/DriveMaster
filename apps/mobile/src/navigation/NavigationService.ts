import { createNavigationContainerRef } from '@react-navigation/native'
import { RootStackParamList } from '../types'

// Create navigation reference for programmatic navigation
export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params)
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack()
  }
}

export function reset(routeName: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName as any, params }],
    })
  }
}

export function getCurrentRoute() {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()
  }
  return null
}

export default {
  navigationRef,
  navigate,
  goBack,
  reset,
  getCurrentRoute,
}
