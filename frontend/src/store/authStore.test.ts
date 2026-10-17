import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@/api/types';
import { useAuthStore } from './authStore';

const USER: User = {
    id: 'u1',
    email: 'ada@example.com',
    display_name: 'Ada',
    avatar_url: null,
    role: 'learner',
    timezone: 'UTC',
    total_xp: 0,
    level: 1,
    xp_to_next: 50,
    title: 'Freshman',
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
};

beforeEach(() => {
    useAuthStore.getState().clear();
});

describe('authStore', () => {
    it('setSession stores the token + user and marks the session authenticated', () => {
        useAuthStore.getState().setSession('tok-123', USER);

        const state = useAuthStore.getState();
        expect(state.token).toBe('tok-123');
        expect(state.user).toEqual(USER);
        expect(state.status).toBe('authenticated');
    });

    it('setUser swaps the profile without touching the token', () => {
        useAuthStore.getState().setSession('tok-123', USER);
        const renamed = { ...USER, display_name: 'Ada L.' };
        useAuthStore.getState().setUser(renamed);

        const state = useAuthStore.getState();
        expect(state.token).toBe('tok-123');
        expect(state.user?.display_name).toBe('Ada L.');
    });

    it('clear wipes token + user and lands on guest (nothing persisted)', () => {
        useAuthStore.getState().setSession('tok-123', USER);
        useAuthStore.getState().clear();

        const state = useAuthStore.getState();
        expect(state.token).toBeNull();
        expect(state.user).toBeNull();
        expect(state.status).toBe('guest');
        expect(localStorage.getItem('careercampus-auth')).toBeNull();
    });
});
