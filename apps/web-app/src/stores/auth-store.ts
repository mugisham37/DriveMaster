import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User, TokenPair } from '@/types/auth';

interface AuthStore extends AuthState {
    // Actions
    setUser: (user: User | null) => void;
    setTokens: (tokens: TokenPair | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    login: (user: User, tokens: TokenPair) => void;
    logout: () => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Actions
            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setTokens: (tokens) => set({ tokens }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error }),

            login: (user, tokens) => set({
                user,
                tokens,
                isAuthenticated: true,
                error: null
            }),

            logout: () => set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                error: null
            }),

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                tokens: state.tokens,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);