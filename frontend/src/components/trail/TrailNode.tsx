import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { RoadmapNode } from '@/api/types';
import type { SceneVariant } from '@/art/scene';
import { PixelSprite } from '@/art/PixelSprite';
import { LANDMARKS } from '@/art/sprites/landmarks';
import { FOG_PUFF, TREE } from '@/art/sprites/nature';
import { FLAG, LANTERN, LOCK } from '@/art/sprites/icons';
import { stateLabel } from './stateLabel';

/**
 * Trail node (spec §9A) — round sticker tile with landmark sprite + state
 * dressing:
 *   locked      → fog puff + desaturated sprite + LOCK badge
 *   available   → LANTERN badge + lagoon glow pulse (motion-safe)
 *   in_progress → 20-segment pixel progress ring
 *   completed   → full colour + moss FLAG badge
 *   null (guest)→ full colour, neutral preview
 */

export interface TrailNodeData {
    node: RoadmapNode;
    variant: SceneVariant;
    onOpen: (nodeId: string) => void;
    /** React Flow v12 requires node data to carry an index signature. */
    [key: string]: unknown;
}

export type TrailFlowNode = Node<TrailNodeData>;

export function TrailNode({ id, data, selected }: NodeProps<TrailFlowNode>): JSX.Element {
    const { node, variant, onOpen } = data;
    const state = node.state ?? 'preview';
    const art = (node.landmark ? LANDMARKS[node.landmark] : undefined)?.[variant] ?? TREE;
    const label = `${stateLabel(node.state)}: ${node.title}`;
    const progress = node.total_tasks > 0 ? node.completed_tasks / node.total_tasks : 0;

    const open = (): void => onOpen(node.id);
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
        }
    };

    return (
        <div id={`trail-node-${id}`} className="relative">
            {/* Lagoon glow pulse for the next stop (authed, available). */}
            {node.state === 'available' && (
                <div
                    aria-hidden
                    className="absolute -inset-1.5 rounded-3xl motion-safe:animate-pulse"
                    style={{ boxShadow: '0 0 0 6px color-mix(in srgb, var(--lagoon) 30%, transparent)' }}
                />
            )}
            {/* 20-segment pixel progress ring (in_progress). */}
            {node.state === 'in_progress' && (
                <svg
                    aria-hidden
                    viewBox="0 0 100 100"
                    className="absolute -inset-2.5 h-[calc(100%+20px)] w-[calc(100%+20px)]"
                >
                    <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="var(--fog)"
                        strokeWidth="6"
                        pathLength={20}
                        strokeDasharray="1 1"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="var(--marigold)"
                        strokeWidth="6"
                        pathLength={20}
                        strokeDasharray={`${20 * progress} ${20 - 20 * progress}`}
                    />
                </svg>
            )}
            <div
                data-state={state}
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={open}
                onKeyDown={onKeyDown}
                className={`sticker relative w-48 cursor-pointer rounded-2xl bg-card px-3 pb-3 pt-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold ${
                    selected ? 'ring-2 ring-marigold' : ''
                }`}
            >
                <div className="relative mx-auto w-fit">
                    <PixelSprite
                        sprite={art}
                        scale={3}
                        className={node.state === 'locked' ? 'opacity-60 grayscale' : undefined}
                    />
                    {/* Fog puff over locked landmarks. */}
                    {node.state === 'locked' && (
                        <div aria-hidden className="absolute inset-x-0 bottom-0 flex justify-center">
                            <PixelSprite sprite={FOG_PUFF} scale={2} className="opacity-80" />
                        </div>
                    )}
                    {/* State badge (LOCK / LANTERN / FLAG). */}
                    {node.state === 'locked' && (
                        <span className="absolute -right-2 -top-2 rounded-pill border-2 border-ink bg-card p-1">
                            <PixelSprite sprite={LOCK} scale={1} />
                        </span>
                    )}
                    {node.state === 'available' && (
                        <span className="absolute -right-2 -top-2 rounded-pill border-2 border-ink bg-card p-1">
                            <PixelSprite sprite={LANTERN} scale={1} />
                        </span>
                    )}
                    {node.state === 'completed' && (
                        <span className="absolute -right-2 -top-2 rounded-pill border-2 border-ink bg-card p-1">
                            <PixelSprite sprite={FLAG} scale={1} />
                        </span>
                    )}
                </div>
                <p className="font-display mt-2 line-clamp-2 text-base font-bold leading-tight">
                    {node.title}
                </p>
                <p className="mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-pill bg-paper-2 px-2 py-0.5 font-pixel text-[10px] text-ink-soft">
                        {node.completed_tasks}/{node.total_tasks}
                        <span className="sr-only">tasks completed</span>
                    </span>
                </p>
            </div>
            {/* Invisible centred handles — edges anchor at node borders. */}
            <Handle type="target" position={Position.Top} className="!h-0 !w-0 !border-0 !bg-transparent" />
            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-0 !w-0 !border-0 !bg-transparent"
            />
        </div>
    );
}
