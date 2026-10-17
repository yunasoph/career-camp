import { NavLink } from 'react-router-dom';
import { CAP, FLAME, STAR } from '@/art/sprites/icons';
import { PixelSprite } from '@/art/PixelSprite';
import { signOut } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';
import { Chip } from './Chip';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
    { to: '/', label: 'Home' },
    { to: '/roadmaps', label: 'Paths' },
    { to: '/dashboard', label: 'Quests' },
    { to: '/leaderboard', label: 'Leaderboard' },
];

/**
 * Floating pill bar (spec §9A.4). Signed-in state (Phase 1): level + streak
 * chips (values from /me), the profile link and sign-out; guests see
 * sign-in / join.
 */
export function NavBar(): JSX.Element {
    const status = useAuthStore((s) => s.status);
    const user = useAuthStore((s) => s.user);
    const authenticated = status === 'authenticated' && user !== null;

    return (
        <header className="sticky top-3 z-50 px-4">
            <nav
                aria-label="Main"
                className="soft-card mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-pill bg-card px-3 py-2"
            >
                <a
                    href="/"
                    aria-label="CareerCampus home"
                    className="flex items-center gap-2 rounded-pill px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                >
                    <PixelSprite sprite={CAP} scale={2} />
                    <span className="font-display text-lg font-black tracking-tight">CareerCampus</span>
                </a>

                <ul className="flex flex-1 items-center justify-center gap-0.5 sm:gap-1">
                    {LINKS.map((link) => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                end={link.to === '/'}
                                className={({ isActive }) =>
                                    `rounded-pill px-2.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold sm:px-3 sm:text-sm ${
                                        isActive ? 'bg-marigold text-ink' : 'text-ink-soft hover:text-ink'
                                    }`
                                }
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {authenticated ? (
                        <>
                            <Chip
                                icon={<PixelSprite sprite={STAR} scale={1} />}
                                value={user.level}
                                label={`Level ${user.level}, ${user.title}`}
                                tone="accent"
                            />
                            <Chip
                                icon={<PixelSprite sprite={FLAME} scale={1} />}
                                value={user.current_streak}
                                label={`${user.current_streak}-day streak`}
                            />
                            <NavLink
                                to="/profile"
                                className="max-w-36 truncate rounded-pill px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold sm:text-sm"
                            >
                                {user.display_name}
                            </NavLink>
                            <button
                                type="button"
                                onClick={() => {
                                    void signOut();
                                }}
                                className="rounded-pill px-2.5 py-1.5 text-xs font-bold text-ember focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold sm:text-sm"
                            >
                                Sign out
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink
                                to="/login"
                                className="rounded-pill px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold sm:px-3 sm:text-sm"
                            >
                                Sign in
                            </NavLink>
                            <NavLink
                                to="/register"
                                className="sticker rounded-pill bg-marigold px-3 py-1.5 text-xs font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold sm:text-sm"
                            >
                                Join
                            </NavLink>
                        </>
                    )}
                    <ThemeToggle />
                </div>
            </nav>
        </header>
    );
}
