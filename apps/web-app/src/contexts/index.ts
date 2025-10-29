/**
 * Context exports for the application
 */

export { AuthProvider, useAuth, type AuthContextValue, type AuthState } from './AuthContext'
export { UserProvider, useUser, type UserContextValue, type UserState } from './UserContext'
export { ProgressProvider, useProgress, type ProgressContextValue, type ProgressState } from './ProgressContext'
export { ActivityProvider, useActivity, type ActivityContextValue, type ActivityState } from './ActivityContext'
export { GDPRProvider, useGDPR, type GDPRContextValue, type GDPRState } from './GDPRContext'