import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ReactFlowProvider } from '@xyflow/react';
import { useRoadmap } from '@/api/useRoadmap';
import type { RoadmapDifficulty, RoadmapNode } from '@/api/types';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import type { SceneVariant } from '@/art/scene';
import { PixelSprite } from '@/art/PixelSprite';
import { BISCUIT_IDLE_A } from '@/art/sprites/biscuit';
import { LANDMARKS } from '@/art/sprites/landmarks';
import { CAP, LANTERN } from '@/art/sprites/icons';
import { DifficultyPill } from '@/components/ui/DifficultyPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { NodeDrawer } from '@/components/trail/NodeDrawer';
import { TrailMap } from '@/components/trail/TrailMap';

/**
 * Roadmap page (spec §9A) — sticky header + React Flow trail map + node
 * drawer. Public (neutral preview); personalised when an authed session is
 * present (states, % complete, "You are here").
 */
export function RoadmapPage(): JSX.Element {
    const { slug } = useParams<{ slug: string }>();
    const { data, isLoading, isError, isFetching, refetch } = useRoadmap(slug ?? '');
    const authed = useAuthStore((s) => s.status === 'authenticated');
    const variant = useThemeStore((s) => (s.theme === 'dark' ? 'dusk' : 'day'));
    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (isLoading) return <RoadmapSkeleton />;
    if (isError || !data) return <BiscuitLost onRetry={() => void refetch()} busy={isFetching} />;

    const selected = data.nodes.find((n) => n.id === selectedId) ?? null;
    const here = authed
        ? (data.nodes.find((n) => n.state === 'in_progress') ??
          [...data.nodes]
              .filter((n) => n.state === 'available')
              .sort((a, b) => a.sort_order - b.sort_order)[0] ??
          null)
        : null;

    return (
        <ReactFlowProvider>
            <div className="flex h-[calc(100vh-8.5rem)] min-h-[480px] flex-col">
                <RoadmapHeader
                    variant={variant}
                    title={data.roadmap.title}
                    themeLandmarks={
                        Array.isArray(data.roadmap.theme.landmarks) ? data.roadmap.theme.landmarks : []
                    }
                    difficulty={data.roadmap.difficulty}
                    estHours={data.roadmap.est_hours}
                    percent={data.percent_complete}
                    nodes={data.nodes}
                    here={here}
                    onOpen={setSelectedId}
                />
                <div className="soft-card relative mt-4 min-h-0 flex-1 overflow-hidden rounded-card">
                    <TrailMap detail={data} variant={variant} authed={authed} onOpen={setSelectedId} />
                </div>
                <AnimatePresence>
                    {selected && (
                        <NodeDrawer
                            key={selected.id}
                            node={selected}
                            nodes={data.nodes}
                            variant={variant}
                            onClose={() => setSelectedId(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </ReactFlowProvider>
    );
}

interface RoadmapHeaderProps {
    variant: SceneVariant;
    title: string;
    themeLandmarks: string[];
    difficulty: RoadmapDifficulty;
    estHours: number | null;
    percent: number | undefined;
    nodes: RoadmapNode[];
    here: RoadmapNode | null;
    onOpen: (nodeId: string) => void;
}

/** Sticky header — back link, title + icon, difficulty, %, "You are here". */
function RoadmapHeader({
    variant,
    title,
    themeLandmarks,
    difficulty,
    estHours,
    percent,
    nodes,
    here,
    onOpen,
}: RoadmapHeaderProps): JSX.Element {
    const headArt = (themeLandmarks[0] ? LANDMARKS[themeLandmarks[0]] : undefined)?.[variant] ?? CAP;
    const completed = nodes.filter((n) => n.state === 'completed').length;
    return (
        <header className="sticky top-14 z-30 bg-paper py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link to="/roadmaps" className="font-pixel text-xs text-ink-soft hover:text-ink">
                    ← All paths
                </Link>
                <div className="flex min-w-0 items-center gap-2.5">
                    <PixelSprite sprite={headArt} scale={2} />
                    <h1 className="font-display truncate text-2xl font-black tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    <DifficultyPill difficulty={difficulty} />
                    {estHours != null && (
                        <span className="font-pixel text-xs text-ink-soft">≈ {estHours} h</span>
                    )}
                </div>
                {percent !== undefined && (
                    <div className="flex items-center gap-2">
                        <span className="font-pixel text-xs text-ink-soft">{percent}%</span>
                        <div
                            className="flex h-2 w-28 gap-0.5"
                            role="img"
                            aria-label={`${completed} of ${nodes.length} stops completed`}
                        >
                            {nodes.map((n) => (
                                <span
                                    key={n.id}
                                    className={`h-full flex-1 rounded-[1px] ${n.state === 'completed' ? 'bg-moss' : 'bg-fog'}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {here && (
                    <button
                        type="button"
                        onClick={() => onOpen(here.id)}
                        className="sticker ml-auto inline-flex items-center gap-1.5 rounded-pill bg-card px-3 py-1 font-pixel text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                    >
                        <PixelSprite sprite={LANTERN} scale={1} />
                        You are here: {here.title}
                    </button>
                )}
            </div>
        </header>
    );
}

/** Loading — pixel-shimmer header + map placeholder. */
function RoadmapSkeleton(): JSX.Element {
    return (
        <div className="py-4" aria-busy="true">
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-10 w-56" />
            </div>
            <Skeleton className="mt-4 h-[calc(100vh-14rem)] min-h-[380px]" />
        </div>
    );
}

/** Error / unknown slug — Biscuit lost on the trail + retry. */
function BiscuitLost({ onRetry, busy }: { onRetry: () => void; busy: boolean }): JSX.Element {
    return (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
            <PixelSprite sprite={BISCUIT_IDLE_A} scale={4} label="Biscuit" />
            <h1 className="font-display text-3xl font-black tracking-tight">Biscuit is lost on the trail.</h1>
            <p className="max-w-md text-ink-soft">
                That trail doesn&apos;t exist, or the map didn&apos;t load. Try again, or head back to the
                catalog.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={busy}
                    className="sticker rounded-pill bg-marigold px-4 py-1.5 font-pixel text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold disabled:opacity-60"
                >
                    Try again
                </button>
                <Link
                    to="/roadmaps"
                    className="sticker rounded-pill bg-card px-4 py-1.5 font-pixel text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                >
                    All paths
                </Link>
            </div>
        </div>
    );
}
