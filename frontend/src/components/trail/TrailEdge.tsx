import type { EdgeProps } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import { steppedPath } from './steppedPath';

/**
 * Trail edge — stepped/orthogonal dotted dirt path (spec §9A).
 */

export interface TrailEdgeData {
    /** Marching-ants marigold overlay (edge into the first available node, authed only). */
    ants: boolean;
    /** React Flow v12 requires edge data to carry an index signature. */
    [key: string]: unknown;
}

export type TrailFlowEdge = Edge<TrailEdgeData, 'trail'>;

export function TrailEdge({
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
}: EdgeProps<TrailFlowEdge>): JSX.Element {
    const d = steppedPath(sourceX, sourceY, targetX, targetY);
    return (
        <g>
            {/* Soft dirt underlay. */}
            <path
                d={d}
                fill="none"
                stroke="var(--fog)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.6}
            />
            {/* Dotted trail line. */}
            <path
                data-testid="trail-edge-path"
                d={d}
                fill="none"
                stroke="var(--ink-soft)"
                strokeWidth={3}
                strokeDasharray="0.5 10"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {data?.ants && (
                <path
                    className="trail-ants"
                    d={d}
                    fill="none"
                    stroke="var(--marigold)"
                    strokeWidth={3}
                    strokeDasharray="2 8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </g>
    );
}
