import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/authStore';

/** Shown while the boot-time session restore is in flight. */
function RestoringGate(): JSX.Element {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Skeleton className="h-14 w-44" />
        </div>
    );
}

/** Signed-in users only; guests are sent to /login (state.from remembers where they headed). */
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
    const status = useAuthStore((s) => s.status);
    const location = useLocation();

    if (status === 'authenticated') {
        return <>{children}</>;
    }
    if (status === 'idle' || status === 'restoring') {
        return <RestoringGate />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

/** Guests only; signed-in users are sent back home (used by /login + /register). */
export function GuestOnly({ children }: { children: ReactNode }): JSX.Element {
    const status = useAuthStore((s) => s.status);

    if (status === 'guest') {
        return <>{children}</>;
    }
    if (status === 'idle' || status === 'restoring') {
        return <RestoringGate />;
    }
    return <Navigate to="/" replace />;
}

/** Admins only (Phase 5 pages); everyone else goes home. */
export function RequireAdmin({ children }: { children: ReactNode }): JSX.Element {
    const status = useAuthStore((s) => s.status);
    const user = useAuthStore((s) => s.user);

    if (status === 'idle' || status === 'restoring') {
        return <RestoringGate />;
    }
    if (user?.role === 'admin') {
        return <>{children}</>;
    }
    return <Navigate to="/" replace />;
}
