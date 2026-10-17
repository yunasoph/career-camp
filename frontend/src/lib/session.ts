import { apiRefresh } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

/**
 * Boot-time session restore (spec §9.3): the access token is memory-only, so
 * after a reload it is gone — but the httpOnly refresh cookie may still be
 * valid. One POST /auth/refresh decides: signed-in or guest.
 *
 * Never redirects: a plain page load must not bounce guests to /login.
 */
export function restoreSession(): void {
    if (useAuthStore.getState().status !== 'idle') {
        return;
    }
    useAuthStore.getState().setStatus('restoring');
    void apiRefresh()
        .then((data) => useAuthStore.getState().setSession(data.access_token, data.user))
        .catch(() => useAuthStore.getState().clear());
}

/**
 * Sign out: revoke the refresh token server-side (best effort — the endpoint
 * is idempotent) and drop the local session.
 */
export async function signOut(): Promise<void> {
    try {
        await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
        // Network hiccup — the local session is dropped regardless.
    }
    useAuthStore.getState().clear();
}
