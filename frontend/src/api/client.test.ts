import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setRedirectHandler } from '@/api/client';
import type { User } from '@/api/types';
import { useAuthStore } from '@/store/authStore';

const USER: User = {
    id: 'u1',
    email: 'ada@example.com',
    display_name: 'Ada',
    avatar_url: null,
    role: 'learner',
    timezone: 'UTC',
    total_xp: 200,
    level: 3,
    xp_to_next: 250,
    title: 'Freshman',
    current_streak: 4,
    longest_streak: 9,
    last_active_date: null,
};

/** Duck-typed Response — the client only reads status / ok / json(). */
function json(status: number, body: unknown): Response {
    return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

function envelope(code: string, message: string, details?: Record<string, string[]>) {
    return { error: details ? { code, message, details } : { code, message } };
}

beforeEach(() => {
    useAuthStore.getState().clear();
    window.history.pushState({}, '', '/');
});

afterEach(() => {
    vi.unstubAllGlobals();
    setRedirectHandler((to) => {
        window.location.assign(to);
    });
});

describe('api client', () => {
    it('attaches the in-memory Bearer token and credentials: include', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json(200, { user: USER }));
        vi.stubGlobal('fetch', fetchMock);
        useAuthStore.getState().setSession('tok-123', USER);

        await api('/api/v1/me');

        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/v1/me');
        expect((init!.headers as Headers).get('Authorization')).toBe('Bearer tok-123');
        expect(init!.credentials).toBe('include');
    });

    it('sets the JSON content type for bodied requests', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json(200, { user: USER, access_token: 't' }));
        vi.stubGlobal('fetch', fetchMock);

        await api('/api/v1/auth/login', { method: 'POST', body: '{}' });

        expect((fetchMock.mock.calls[0]![1]!.headers as Headers).get('Content-Type')).toBe(
            'application/json',
        );
    });

    it('on 401: performs one silent refresh and retries the original request', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json(401, envelope('unauthenticated', 'Authentication required.')))
            .mockResolvedValueOnce(json(200, { user: USER, access_token: 'tok-fresh' }))
            .mockResolvedValueOnce(json(200, { user: USER }));
        vi.stubGlobal('fetch', fetchMock);
        useAuthStore.getState().setSession('tok-stale', USER);

        const result = await api<{ user: User }>('/api/v1/me');

        expect(result.user.id).toBe('u1');
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[1]![0]).toBe('/api/v1/auth/refresh');
        expect((fetchMock.mock.calls[2]![1]!.headers as Headers).get('Authorization')).toBe(
            'Bearer tok-fresh',
        );
        expect(useAuthStore.getState().token).toBe('tok-fresh');
        expect(useAuthStore.getState().status).toBe('authenticated');
    });

    it('deduplicates concurrent refreshes', async () => {
        let meCalls = 0;
        let refreshCalls = 0;
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            if (url === '/api/v1/auth/refresh') {
                refreshCalls += 1;
                return json(200, { user: USER, access_token: 'tok-fresh' });
            }
            meCalls += 1;
            if (meCalls <= 2) {
                return json(401, envelope('unauthenticated', 'Authentication required.'));
            }
            return json(200, { user: USER });
        });
        vi.stubGlobal('fetch', fetchMock);
        useAuthStore.getState().setSession('tok-stale', USER);

        const [a, b] = await Promise.all([
            api<{ user: User }>('/api/v1/me'),
            api<{ user: User }>('/api/v1/me'),
        ]);

        expect(a.user.id).toBe('u1');
        expect(b.user.id).toBe('u1');
        expect(refreshCalls).toBe(1);
    });

    it('when the refresh also fails: clears the session and redirects to /login', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json(401, envelope('unauthenticated', 'Authentication required.')))
            .mockResolvedValueOnce(
                json(401, envelope('invalid_refresh', 'Refresh token is not recognized.')),
            );
        vi.stubGlobal('fetch', fetchMock);
        const redirect = vi.fn();
        setRedirectHandler(redirect);
        window.history.pushState({}, '', '/dashboard');
        useAuthStore.getState().setSession('tok-stale', USER);

        let caught: unknown;
        try {
            await api('/api/v1/me');
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeInstanceOf(ApiError);
        expect(useAuthStore.getState().token).toBeNull();
        expect(useAuthStore.getState().status).toBe('guest');
        expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('does not redirect when the session is lost on an auth page', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json(401, envelope('unauthenticated', 'Authentication required.')))
            .mockResolvedValueOnce(
                json(401, envelope('invalid_refresh', 'Refresh token is not recognized.')),
            );
        vi.stubGlobal('fetch', fetchMock);
        const redirect = vi.fn();
        setRedirectHandler(redirect);
        window.history.pushState({}, '', '/login');
        useAuthStore.getState().setSession('tok-stale', USER);

        await expect(api('/api/v1/me')).rejects.toBeInstanceOf(ApiError);
        expect(redirect).not.toHaveBeenCalled();
    });

    it('surfaces 422 field details on the ApiError (no refresh attempt)', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            json(
                422,
                envelope('validation_failed', 'Validation failed.', {
                    email: ['Must be a valid email address.'],
                }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);
        useAuthStore.getState().setSession('tok-123', USER);

        let caught: unknown;
        try {
            await api('/api/v1/auth/login', { method: 'POST', body: '{}' });
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeInstanceOf(ApiError);
        const err = caught as ApiError;
        expect(err.status).toBe(422);
        expect(err.code).toBe('validation_failed');
        expect(err.details?.email).toEqual(['Must be a valid email address.']);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
