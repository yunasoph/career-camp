import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNodeDetail } from '@/api/useRoadmap';
import type { RoadmapNode, TaskDto } from '@/api/types';
import type { SceneVariant } from '@/art/scene';
import { PixelSprite } from '@/art/PixelSprite';
import { LANDMARKS } from '@/art/sprites/landmarks';
import { TREE } from '@/art/sprites/nature';
import { FLAG, LOCK, STAR, TASK_TYPE_ICONS } from '@/art/sprites/icons';
import { stateLabel } from './stateLabel';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Node drawer (spec §9A) — right panel on desktop, bottom sheet on mobile.
 * Shows the node head, prerequisite chips (check/lock) and the full task
 * list from GET /nodes/{id} (quiz questions without answers — spec §6.1).
 */

interface NodeDrawerProps {
    node: RoadmapNode;
    /** Full node list — maps prerequisite ids to titles/states. */
    nodes: RoadmapNode[];
    variant: SceneVariant;
    onClose: () => void;
}

const DESKTOP_QUERY = '(min-width: 768px)';

/** Minimal matchMedia hook (framer-motion v11 does not export one). */
function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY).matches : true,
    );
    useEffect(() => {
        const list = window.matchMedia(DESKTOP_QUERY);
        const onChange = (): void => setIsDesktop(list.matches);
        list.addEventListener('change', onChange);
        setIsDesktop(list.matches);
        return () => list.removeEventListener('change', onChange);
    }, []);
    return isDesktop;
}

export function NodeDrawer({ node, nodes, variant, onClose }: NodeDrawerProps): JSX.Element {
    const { data, isError, refetch } = useNodeDetail(node.id);
    const reduced = useReducedMotion();
    const isDesktop = useIsDesktop();

    // Escape closes the drawer.
    useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const art = (node.landmark ? LANDMARKS[node.landmark] : undefined)?.[variant] ?? TREE;
    const prereqs = (data?.node.prerequisite_ids ?? [])
        .map((id) => nodes.find((n) => n.id === id))
        .filter((n): n is RoadmapNode => n !== undefined);

    // Bottom sheet slides up on mobile; desktop card slides in from the right.
    const initial = isDesktop ? { opacity: 0, x: 48 } : { opacity: 0, y: 240 };
    const animate = isDesktop ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 };
    const exit = isDesktop ? { opacity: 0, x: 48 } : { opacity: 0, y: 240 };

    return (
        <motion.aside
            role="dialog"
            aria-label={`Details: ${node.title}`}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={reduced ? { duration: 0 } : { type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t-2 border-ink bg-card p-5 shadow-2xl md:top-20 md:right-5 md:bottom-6 md:left-auto md:max-h-[calc(100vh-6.5rem)] md:w-[24rem] md:max-w-[calc(100vw-2.5rem)] md:rounded-card md:border-2 md:shadow-[0_4px_0_var(--ink)]"
        >
            <header className="flex items-start gap-3">
                <PixelSprite sprite={art} scale={2} />
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-black leading-tight">{node.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-pill bg-paper-2 px-2 py-0.5 font-pixel text-[10px] text-ink-soft">
                            {stateLabel(node.state)}
                        </span>
                        <span className="font-pixel text-[10px] text-ink-soft">
                            {node.completed_tasks}/{node.total_tasks} tasks
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close node details"
                    className="sticker rounded-pill bg-paper-2 px-2.5 py-1 font-pixel text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                >
                    ✕
                </button>
            </header>

            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{node.description}</p>

            {prereqs.length > 0 && (
                <div className="mt-4">
                    <p className="font-pixel text-xs uppercase tracking-[0.18em] text-ink-soft">
                        Unlocks from
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                        {prereqs.map((p) => (
                            <li
                                key={p.id}
                                className="inline-flex items-center gap-1 rounded-pill bg-paper-2 px-2 py-0.5 font-pixel text-[10px]"
                            >
                                <PixelSprite sprite={p.state === 'completed' ? FLAG : LOCK} scale={1} />
                                {p.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-4">
                <p className="font-pixel text-xs uppercase tracking-[0.18em] text-ink-soft">Quests</p>
                {isError ? (
                    <div className="mt-3 text-sm text-ink-soft">
                        <p>The quest list didn&apos;t load.</p>
                        <button
                            type="button"
                            onClick={() => void refetch()}
                            className="sticker mt-2 rounded-pill bg-marigold px-3 py-1 font-pixel text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                        >
                            Try again
                        </button>
                    </div>
                ) : data ? (
                    <ul className="mt-2 space-y-3">
                        {data.tasks.map((task) => (
                            <TaskRow key={task.id} task={task} />
                        ))}
                    </ul>
                ) : (
                    <div className="mt-2 space-y-3">
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                    </div>
                )}
            </div>
        </motion.aside>
    );
}

function TaskRow({ task }: { task: TaskDto }): JSX.Element {
    return (
        <li className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0" aria-hidden>
                <PixelSprite sprite={TASK_TYPE_ICONS[task.type] ?? TASK_TYPE_ICONS.reading} scale={1} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">
                    {task.title}
                    <span className="sr-only">, {task.type}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{task.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Chip
                        icon={<PixelSprite sprite={STAR} scale={1} />}
                        value={`+${task.xp} XP`}
                        label={`${task.xp} experience points`}
                    />
                    {task.resource_url && (
                        <a
                            href={task.resource_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-pixel text-[10px] underline decoration-dotted underline-offset-2 hover:text-ink"
                        >
                            Resource
                        </a>
                    )}
                    {task.type === 'quiz' && task.quiz && (
                        <span className="font-pixel text-[10px] text-ink-soft">
                            {task.quiz.questions.length} questions
                        </span>
                    )}
                    {task.completed && (
                        <span className="ml-auto" aria-label="Completed">
                            <PixelSprite sprite={FLAG} scale={1} />
                        </span>
                    )}
                </div>
            </div>
        </li>
    );
}
