import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { MiniMap, ReactFlow, useReactFlow } from '@xyflow/react';
import type { Edge, EdgeTypes, Node, NodeTypes } from '@xyflow/react';
import type { RoadmapDetail } from '@/api/types';
import type { SceneVariant } from '@/art/scene';
import { TrailEdge, type TrailEdgeData } from './TrailEdge';
import { TrailNode, type TrailNodeData } from './TrailNode';

/**
 * Trail map (spec §9A) — React Flow with the custom trail node/edge types,
 * parchment canvas (CSS on .trail-canvas), MiniMap + fit-view control.
 * Must be rendered inside a <ReactFlowProvider>.
 */

const nodeTypes = { trail: TrailNode } satisfies NodeTypes;
const edgeTypes = { trail: TrailEdge } satisfies EdgeTypes;

interface TrailMapProps {
    detail: RoadmapDetail;
    variant: SceneVariant;
    /** Authenticated user — enables the marching-ants "next stop" edge. */
    authed: boolean;
    onOpen: (nodeId: string) => void;
}

export function TrailMap({ detail, variant, authed, onOpen }: TrailMapProps): JSX.Element {
    const { fitView } = useReactFlow();

    const nodes = useMemo<Node<TrailNodeData, 'trail'>[]>(
        () =>
            detail.nodes.map((n) => ({
                id: n.id,
                type: 'trail',
                position: { x: n.pos_x, y: n.pos_y },
                data: { node: n, variant, onOpen },
            })),
        [detail, variant, onOpen],
    );

    const edges = useMemo<Edge<TrailEdgeData, 'trail'>[]>(() => {
        const firstAvailable = authed
            ? detail.nodes
                  .filter((n) => n.state === 'available')
                  .sort((a, b) => a.sort_order - b.sort_order)[0]
            : undefined;
        return detail.edges.map((e) => ({
            id: `e-${e.prerequisite_id}-${e.node_id}`,
            type: 'trail',
            source: e.prerequisite_id,
            target: e.node_id,
            data: { ants: firstAvailable !== undefined && e.node_id === firstAvailable.id },
        }));
    }, [detail, authed]);

    return (
        <div className="trail-canvas h-full w-full overflow-hidden rounded-card">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.15}
                maxZoom={1.75}
                nodesFocusable
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                proOptions={{ hideAttribution: true }}
                onNodeClick={(_event, node) => onOpen(node.id)}
            >
                <MiniMap
                    pannable
                    zoomable
                    className="!bg-card"
                    maskColor="color-mix(in srgb, var(--paper) 70%, transparent)"
                    nodeColor="var(--marigold)"
                    nodeStrokeColor="var(--ink)"
                />
                <button
                    type="button"
                    onClick={() => fitView({ padding: 0.15 })}
                    aria-label="Fit trail to screen"
                    className="sticker absolute bottom-4 left-4 z-10 rounded-pill bg-card px-3 py-1.5 font-pixel text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                >
                    Fit view
                </button>
            </ReactFlow>
        </div>
    );
}
