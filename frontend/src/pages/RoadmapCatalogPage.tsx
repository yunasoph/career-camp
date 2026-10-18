import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRoadmaps } from '@/api/useRoadmaps';
import type { RoadmapDifficulty, RoadmapSummary } from '@/api/types';
import type { SceneVariant } from '@/art/scene';
import { PixelSprite } from '@/art/PixelSprite';
import { BISCUIT_IDLE_A } from '@/art/sprites/biscuit';
import { FLAG, STAR } from '@/art/sprites/icons';
import { landmarkSprite } from '@/lib/roadmapArt';
import { Chip } from '@/components/ui/Chip';
import { DifficultyStars } from '@/components/ui/DifficultyStars';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeStore } from '@/store/themeStore';

type DifficultyFilter = RoadmapDifficulty | 'all';

const DIFFICULTY_FILTERS: Array<{ value: DifficultyFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
];

/**
 * Trail catalog (spec §9A) — sticker cards from the shared `['roadmaps']`
 * query with client-side search + difficulty filters.
 */
export function RoadmapCatalogPage(): JSX.Element {
    const variant = useThemeStore((s) => (s.theme === 'dark' ? 'dusk' : 'day'));
    const { data, isLoading, isError, isFetching, refetch } = useRoadmaps();
    const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const list = data?.roadmaps ?? [];
        const q = search.trim().toLowerCase();
        return list.filter((roadmap) => {
            if (difficulty !== 'all' && roadmap.difficulty !== difficulty) return false;
            if (q && !`${roadmap.title} ${roadmap.summary}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [data?.roadmaps, difficulty, search]);

    const clearFilters = (): void => {
        setSearch('');
        setDifficulty('all');
    };

    return (
        <section aria-labelledby="catalog-heading" className="py-10 sm:py-14">
            <header>
                <p className="font-pixel text-xs uppercase tracking-[0.18em] text-ink-soft">
                    The trail catalog
                </p>
                <h1
                    id="catalog-heading"
                    className="font-display mt-3 text-4xl font-black tracking-[-0.02em] sm:text-5xl"
                >
                    Choose your trail
                </h1>
                <p className="mt-4 max-w-xl text-lg text-ink-soft">
                    Every path is a playable trail: small quests, real XP, and a landmark to look forward to
                    at the end.
                </p>
            </header>

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <label className="sr-only" htmlFor="catalog-search">
                    Search trails
                </label>
                <input
                    id="catalog-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search trails…"
                    className="w-full max-w-xs rounded-input border-2 border-ink bg-card px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by difficulty">
                    {DIFFICULTY_FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={difficulty === option.value}
                            onClick={() => setDifficulty(option.value)}
                            className={`sticker rounded-pill px-3 py-1.5 font-pixel text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold ${
                                difficulty === option.value ? 'bg-marigold text-ink' : 'bg-card text-ink-soft'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            ) : isError ? (
                <BiscuitNotice
                    title="The trail map is out of ink."
                    body="Couldn't load the catalog — give it another try."
                    actionLabel="Try again"
                    onAction={() => void refetch()}
                    busy={isFetching}
                />
            ) : filtered.length === 0 ? (
                <BiscuitNotice
                    title="No trails match."
                    body="Biscuit sniffed around but found nothing for those filters."
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                />
            ) : (
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((roadmap) => (
                        <CatalogCard key={roadmap.id} roadmap={roadmap} variant={variant} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function CatalogCard({ roadmap, variant }: { roadmap: RoadmapSummary; variant: SceneVariant }): JSX.Element {
    const sprite = landmarkSprite(roadmap, variant);
    return (
        <li className="min-w-0">
            <Link
                to={`/roadmaps/${roadmap.slug}`}
                className="sticker flex h-full flex-col rounded-card bg-card p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
            >
                {sprite && <PixelSprite sprite={sprite} scale={4} />}
                <h2 className="font-display mt-3 text-xl font-bold leading-tight">{roadmap.title}</h2>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{roadmap.summary}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <DifficultyStars difficulty={roadmap.difficulty} />
                    <Chip
                        icon={<PixelSprite sprite={FLAG} scale={1} />}
                        value={roadmap.node_count}
                        label={`${roadmap.node_count} stops`}
                    />
                    <Chip
                        icon={<PixelSprite sprite={STAR} scale={1} />}
                        value={roadmap.task_count}
                        label={`${roadmap.task_count} quests`}
                    />
                    {roadmap.est_hours != null && (
                        <span className="text-xs text-ink-soft">≈ {roadmap.est_hours} h</span>
                    )}
                </div>
                <span className="mt-4 font-pixel text-sm text-ink underline decoration-dotted underline-offset-4">
                    Walk this trail →
                </span>
            </Link>
        </li>
    );
}

interface BiscuitNoticeProps {
    title: string;
    body: string;
    actionLabel: string;
    onAction: () => void;
    busy?: boolean;
}

/** Biscuit empty/error state with one clear action (spec §9A.4). */
function BiscuitNotice({
    title,
    body,
    actionLabel,
    onAction,
    busy = false,
}: BiscuitNoticeProps): JSX.Element {
    return (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
            <PixelSprite sprite={BISCUIT_IDLE_A} scale={3} label="Biscuit" />
            <p className="font-display text-xl font-bold">{title}</p>
            <p className="max-w-sm text-sm text-ink-soft">{body}</p>
            <button
                type="button"
                onClick={onAction}
                disabled={busy}
                className="sticker mt-1 rounded-pill bg-marigold px-4 py-1.5 font-pixel text-xs font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold disabled:opacity-60"
            >
                {actionLabel}
            </button>
        </div>
    );
}
