import { create } from 'zustand';
import type { User } from '@/api/types';

export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'guest';

interface AuthState {
    /** In-memory only — the access token is NEVER persisted (spec §9.3). */
    token: string | null;
    user: User | null;
    status: AuthStatus;
    setSession: (token: string, user: User) => void;
    setUser: (user: User) => void;
    setStatus: (status: AuthStatus) => void;
    clear: () => void;
}

/**
 * Session state. Deliberately NOT persisted (unlike themeStore): the
 * durable credential is the httpOnly refresh cookie, which the browser
 * manages — the store only mirrors it in memory (spec §9.3).
 */
export const useAuthStore = create<AuthState>()((set) => ({
    token: null,
    user: null,
    status: 'idle',
    setSession: (token, user) => set({ token, user, status: 'authenticated' }),
    setUser: (user) => set({ user }),
    setStatus: (status) => set({ status }),
    clear: () => set({ token: null, user: null, status: 'guest' }),
}));
