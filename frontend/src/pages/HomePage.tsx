import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { useRoadmaps } from '@/api/useRoadmaps';
import type { RoadmapDifficulty, RoadmapSummary } from '@/api/types';
import { CampusScene } from '@/art/CampusScene';
import type { SceneVariant } from '@/art/scene';
import { PixelSprite } from '@/art/PixelSprite';
import { BISCUIT_IDLE_A } from '@/art/sprites/biscuit';
import { LANDMARKS } from '@/art/sprites/landmarks';
import { TREE, SIGNPOST } from '@/art/sprites/nature';
import { CAP, FLAG, LOCK, SHIELD, STAR } from '@/art/sprites/icons';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';

/** Fade the panorama into paper — left, top and bottom edges (spec §9A.10). */
const PANORAMA_MASK: CSSProperties = {
    WebkitMaskImage:
        'linear-gradient(to right, transparent, black 14%), linear-gradient(to top, transparent, black 16%), linear-gradient(to bottom, transparent, black 20%)',
    WebkitMaskComposite: 'source-in',
    maskImage:
        'linear-gradient(to right, transparent, black 14%), linear-gradient(to top, transparent, black 16%), linear-gradient(to bottom, transparent, black 20%)',
    maskComposite: 'intersect',
};

const DIFFICULTY_TONE: Record<RoadmapDifficulty, string> = {
    beginner: 'bg-moss text-paper',
    intermediate: 'bg-marigold text-ink',
    advanced: 'bg-ember text-paper',
};

function difficultyPill(difficulty: RoadmapDifficulty): string {
    return `shrink-0 rounded-pill px-2.5 py-1 font-pixel text-[10px] uppercase ${DIFFICULTY_TONE[difficulty]}`;
}

/** First themed landmark sprite for a roadmap (day/dusk); undefined if none. */
function landmarkSprite(roadmap: RoadmapSummary, variant: SceneVariant, index = 0) {
    const names: string[] = Array.isArray(roadmap.theme.landmarks) ? roadmap.theme.landmarks : [];
    const name = names[index] ?? names[0];
    const art = name ? LANDMARKS[name] : undefined;
    return art ? art[variant] : undefined;
}

/**
 * Landing page (spec §9A.10) — full-bleed campus panorama hero, path picker,
 * how-it-works trail, featured paths, Skill Passport teaser, pixel horizon.
 */
export function HomePage(): JSX.Element {
    const variant = useThemeStore((s) => (s.theme === 'dark' ? 'dusk' : 'day'));
    return (
        <>
            <Hero variant={variant} />
            <HowItWorks />
            <FeaturedPaths variant={variant} />
            <PassportTeaser />
            <HorizonFooter variant={variant} />
        </>
    );
}

function Hero({ variant }: { variant: SceneVariant }): JSX.Element {
    return (
        <section
            aria-labelledby="hero-heading"
            className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden"
        >
            {/* Panorama — flush to the viewport's right edge, fading into paper. */}
            <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-1/2 hidden w-[58%] -translate-y-1/2 lg:block"
                style={PANORAMA_MASK}
            >
                <CampusScene variant={variant} />
            </div>
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl py-16 sm:py-20 lg:py-28">
                    <p className="font-pixel text-xs uppercase tracking-[0.18em] text-ink-soft">
                        A campus for your next career
                    </p>
                    <h1
                        id="hero-heading"
                        className="font-display mt-4 text-5xl font-black leading-[0.95] tracking-[-0.03em] sm:text-6xl"
                    >
                        Map your career.
                        <br />
                        Level it up.
                    </h1>
                    <p className="mt-6 max-w-lg text-lg text-ink-soft">
                        Pick a real career trail, walk it one quest at a time with Biscuit the capybara, and
                        level up toward a shareable Skill Passport.
                    </p>
                    <PathPicker variant={variant} />
                </div>
                {/* Panorama for mobile / tablet — full width, below the copy. */}
                <div aria-hidden className="pb-12 lg:hidden" style={PANORAMA_MASK}>
                    <CampusScene variant={variant} />
                </div>
            </div>
        </section>
    );
}

/** Path picker — sticker cards from the shared `['roadmaps']` query. */
function PathPicker({ variant }: { variant: SceneVariant }): JSX.Element {
    const { data, isLoading, isError, isFetching, refetch } = useRoadmaps();

    return (
        <div className="mt-8">
            <p className="font-pixel text-xs uppercase tracking-[0.18em] text-ink-soft">Choose your trail</p>
            {isLoading ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                </div>
            ) : isError ? (
                <div className="mt-3 flex items-center gap-4">
                    <PixelSprite sprite={BISCUIT_IDLE_A} scale={2} label="Biscuit" />
                    <div>
                        <p className="text-sm font-semibold">The trail map is out of ink.</p>
                        <p className="text-xs text-ink-soft">
                            Couldn&apos;t load the paths — give it another try.
                        </p>
                        <button
                            type="button"
                            onClick={() => void refetch()}
                            disabled={isFetching}
                            className="sticker mt-2 rounded-pill bg-marigold px-4 py-1.5 font-pixel text-xs font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold disabled:opacity-60"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(data?.roadmaps ?? []).map((roadmap) => (
                        <PathCard key={roadmap.id} roadmap={roadmap} variant={variant} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function PathCard({ roadmap, variant }: { roadmap: RoadmapSummary; variant: SceneVariant }): JSX.Element {
    const sprite = landmarkSprite(roadmap, variant);
    return (
        <li className="min-w-0">
            <Link
                to={`/roadmaps/${roadmap.slug}`}
                className="sticker flex h-full items-center gap-3 rounded-card bg-card p-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
            >
                {sprite && <PixelSprite sprite={sprite} scale={2} className="shrink-0" />}
                <span className="min-w-0 flex-1">
                    <span className="font-display block truncate text-base font-bold leading-tight">
                        {roadmap.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-soft">{roadmap.summary}</span>
                </span>
                <span className={difficultyPill(roadmap.difficulty)}>{roadmap.difficulty}</span>
            </Link>
        </li>
    );
}

const STEPS = [
    {
        icon: SIGNPOST,
        title: 'Pick a path',
        body: 'Browse career trails mapped by working engineers — each one becomes a playable walk on campus.',
        rotate: -2,
    },
    {
        icon: FLAG,
        title: 'Walk the trail',
        body: 'One small quest at a time. Biscuit walks with you and every finished quest banks real XP.',
        rotate: 1,
    },
    {
        icon: CAP,
        title: 'Level up',
        body: 'Streaks, titles and new landmarks along the way. Finish a trail to mint your Skill Passport.',
        rotate: -1,
    },
] as const;

/** How it works — three scattered sticker cards on a dotted trail. */
function HowItWorks(): JSX.Element {
    return (
        <section aria-labelledby="how-heading" className="py-14 sm:py-20">
            <h2 id="how-heading" className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                How it works
            </h2>
            <div className="relative mt-8">
                {/* Dotted trail connecting the steps (decorative). */}
                <svg
                    aria-hidden
                    className="absolute left-10 right-10 top-1/2 hidden h-6 -translate-y-1/2 text-ink-soft opacity-40 md:block"
                    viewBox="0 0 600 24"
                    fill="none"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0 12 C 100 -2, 200 26, 300 12 S 500 -2, 600 12"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="0.5 8"
                        strokeLinecap="round"
                    />
                </svg>
                <ol className="relative grid gap-6 md:grid-cols-3">
                    {STEPS.map((step) => (
                        <li key={step.title} style={{ transform: `rotate(${step.rotate}deg)` }}>
                            <div className="sticker h-full rounded-card bg-card p-5">
                                <PixelSprite sprite={step.icon} scale={2} />
                                <h3 className="font-display mt-3 text-xl font-bold">{step.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** Featured paths — varied-size landmark cards from the seeded content. */
function FeaturedPaths({ variant }: { variant: SceneVariant }): JSX.Element | null {
    const { data, isLoading, isError } = useRoadmaps();
    if (isError) return null; // the hero picker already shows the retry
    const featured = (data?.roadmaps ?? []).slice(0, 2);

    return (
        <section aria-labelledby="featured-heading" className="py-14 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2
                    id="featured-heading"
                    className="font-display text-3xl font-black tracking-tight sm:text-4xl"
                >
                    Featured paths
                </h2>
                <Link
                    to="/roadmaps"
                    className="font-pixel text-sm text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
                >
                    Browse all paths
                </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <>
                        <Skeleton className="h-56 sm:col-span-2" />
                        <Skeleton className="h-56" />
                        <Skeleton className="h-56" />
                    </>
                ) : (
                    <>
                        {featured.map((roadmap, i) => (
                            <FeaturedCard
                                key={roadmap.id}
                                roadmap={roadmap}
                                variant={variant}
                                wide={i === 0}
                            />
                        ))}
                        <div className="sticker flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-card border-dashed bg-paper-2 p-5 text-center">
                            <PixelSprite sprite={LOCK} scale={2} />
                            <p className="font-display text-lg font-bold">More paths being mapped</p>
                            <p className="text-sm text-ink-soft">
                                The trail catalog is under construction — check back soon.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

function FeaturedCard({
    roadmap,
    variant,
    wide,
}: {
    roadmap: RoadmapSummary;
    variant: SceneVariant;
    wide: boolean;
}): JSX.Element {
    const sprite = landmarkSprite(roadmap, variant, 1);
    return (
        <Link
            to={`/roadmaps/${roadmap.slug}`}
            className={`sticker flex h-full flex-col rounded-card bg-card p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold ${
                wide ? 'sm:col-span-2' : ''
            }`}
        >
            {sprite && <PixelSprite sprite={sprite} scale={wide ? 5 : 4} />}
            <h3 className="font-display mt-3 text-xl font-bold leading-tight">{roadmap.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{roadmap.summary}</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <span className={difficultyPill(roadmap.difficulty)}>{roadmap.difficulty}</span>
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
        </Link>
    );
}

/** Skill Passport teaser — static sticker card (minting lands in Phase 5). */
function PassportTeaser(): JSX.Element {
    return (
        <section aria-labelledby="passport-heading" className="py-14 sm:py-20">
            <div
                className="sticker mx-auto max-w-2xl rounded-card bg-card p-8 text-center"
                style={{ transform: 'rotate(1deg)' }}
            >
                <div className="flex justify-center">
                    <PixelSprite sprite={SHIELD} scale={3} label="Skill Passport" />
                </div>
                <h2
                    id="passport-heading"
                    className="font-display mt-4 text-2xl font-black tracking-tight sm:text-3xl"
                >
                    Your Skill Passport
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                    Finish a trail and mint a public, shareable report of your skills, XP and stops. Coming
                    soon — the first passports are waiting for the first trail runners.
                </p>
            </div>
        </section>
    );
}

const HORIZON = [
    'tree',
    'library',
    'tower',
    'tree',
    'bridge',
    'tree',
    'observatory',
    'tree',
    'lab',
    'tree',
    'studio',
];

function horizonSprite(name: string, variant: SceneVariant) {
    return name === 'tree' ? TREE : (LANDMARKS[name]?.[variant] ?? TREE);
}

/** Pixel horizon — a dim strip of campus silhouettes closing the page. */
function HorizonFooter({ variant }: { variant: SceneVariant }): JSX.Element {
    return (
        <footer aria-hidden className="mt-4 border-t-2 border-dashed border-fog pb-10 pt-8">
            <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-2 opacity-50">
                {HORIZON.map((name, i) => (
                    <PixelSprite key={i} sprite={horizonSprite(name, variant)} scale={2} />
                ))}
            </div>
        </footer>
    );
}
