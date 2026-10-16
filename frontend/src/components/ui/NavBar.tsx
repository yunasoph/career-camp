import { NavLink } from 'react-router-dom';
import { CAP } from '@/art/sprites/icons';
import { PixelSprite } from '@/art/PixelSprite';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
    { to: '/', label: 'Home' },
    { to: '/roadmaps', label: 'Paths' },
    { to: '/dashboard', label: 'Quests' },
    { to: '/leaderboard', label: 'Leaderboard' },
];

/**
 * Floating pill bar (spec §9A.4). Guest state for Phase 0 —
 * level chip + streak chip arrive with Phase 1 auth.
 */
export function NavBar(): JSX.Element {
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

                <ThemeToggle />
            </nav>
        </header>
    );
}
