import { useAuthStore } from '@/store/authStore';
import type { ApiErrorEnvelope, AuthResponse } from './types';

/**
 * Typed fetch wrapper (spec §7, §9.3):
 * - the access token lives in the auth store (memory only) and rides along
 *   as `Authorization: Bearer …`;
 * - the httpOnly refresh cookie rides along via `credentials: 'include'`
 *   (same-origin /api proxy in dev and production alike);
 * - on a 401 the client performs ONE silent refresh (deduplicated across
 *   concurrent calls) and retries the original request once; if the refresh
 *   fails too, the session is cleared and the user is sent to /login.
 */

/** Error carrying the API status, stable `code`, and 422 field details. */
export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly details: Record<string, string[]> | undefined;

    constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

const REFRESH_PATH = '/api/v1/auth/refresh';

type RedirectFn = (to: string) => void;

let redirect: RedirectFn = (to) => {
    window.location.assign(to);
};

/** Test seam so Vitest can observe session-loss redirects. */
export function setRedirectHandler(fn: RedirectFn): void {
    redirect = fn;
}

let refreshInFlight: Promise<boolean> | null = null;

function silentRefresh(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = apiRefresh()
            .then((data) => {
                useAuthStore.getState().setSession(data.access_token, data.user);
                return true;
            })
            .catch(() => false)
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
}

function onSessionLost(): void {
    useAuthStore.getState().clear();
    const { pathname } = window.location;
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
        redirect('/login');
    }
}

async function request<T>(path: string, init: RequestInit, withToken: boolean): Promise<T> {
    const headers = new Headers(init.headers);
    if (withToken) {
        const token = useAuthStore.getState().token;
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }
    if (init.body != null && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(path, { ...init, headers, credentials: 'include' });

    if (res.status === 204) {
        return undefined as T;
    }

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        const envelope =
            data !== null && typeof data === 'object' ? (data as ApiErrorEnvelope).error : undefined;
        throw new ApiError(
            res.status,
            envelope?.code ?? 'http_error',
            envelope?.message ?? `Request failed with status ${res.status}.`,
            envelope?.details,
        );
    }

    return data as T;
}

/** POST /auth/refresh — the cookie is the credential; never part of the 401 loop. */
export function apiRefresh(): Promise<AuthResponse> {
    return request<AuthResponse>(REFRESH_PATH, { method: 'POST' }, false);
}

/** Public API call with the silent-refresh-once + retry behaviour. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
        return await request<T>(path, init, true);
    } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401 || path === REFRESH_PATH) {
            throw err;
        }
        if (await silentRefresh()) {
            return request<T>(path, init, true);
        }
        onSessionLost();
        throw err;
    }
}
