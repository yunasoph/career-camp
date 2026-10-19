import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import { MiniMap, PanOnScrollMode, ReactFlow, useReactFlow } from '@xyflow/react';
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

/** Node tile is w-48 (192px) × ~190px — flow-space centre offsets. */
const NODE_CENTER_X = 96;
const NODE_CENTER_Y = 95;
/** Place the focus node in the upper third so the trail ahead is visible. */
const FOCUS_OFFSET_Y = 150;
/** Open at full size — the trail stays enlarged; scroll to travel it. */
const START_ZOOM = 1;

interface TrailMapProps {
    detail: RoadmapDetail;
    variant: SceneVariant;
    /** Authenticated user — enables the marching-ants "next stop" edge. */
    authed: boolean;
    onOpen: (nodeId: string) => void;
}

export function TrailMap({ detail, variant, authed, onOpen }: TrailMapProps): JSX.Element {
    const { fitView, setCenter } = useReactFlow();
    const [centered, setCentered] = useState(false);

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

    // Open at full-size zoom, horizontally centred on the whole trail (so
    // the path sits in the middle of the canvas, not hugging one side) and
    // vertically on the trail start — the trail is taller than the viewport,
    // so it travels by scrolling: wheel/trackpad pan the canvas both ways
    // (page-like), drag pans, pinch/ctrl+wheel zooms, "Fit view" shows the
    // full trail, MiniMap orients. Guests start at the first stop; authed
    // users at their current node.
    useEffect(() => {
        if (centered) return;
        const targetIds = new Set(detail.edges.map((e) => e.node_id));
        const head =
            detail.nodes.find((n) => !targetIds.has(n.id)) ??
            [...detail.nodes].sort((a, b) => a.sort_order - b.sort_order)[0];
        const current = authed
            ? (detail.nodes.find((n) => n.state === 'in_progress') ??
              [...detail.nodes]
                  .filter((n) => n.state === 'available')
                  .sort((a, b) => a.sort_order - b.sort_order)[0])
            : undefined;
        const focus = current ?? head;
        if (focus) {
            const xs = detail.nodes.map((n) => n.pos_x);
            const midX = (Math.min(...xs) + Math.max(...xs)) / 2 + NODE_CENTER_X;
            setCenter(midX, focus.pos_y + NODE_CENTER_Y + FOCUS_OFFSET_Y, {
                zoom: START_ZOOM,
                duration: 0,
            });
        }
        setCentered(true);
    }, [centered, detail, authed, setCenter]);

    return (
        <div className="trail-canvas h-full w-full overflow-hidden rounded-card">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultViewport={{ x: 0, y: 0, zoom: START_ZOOM }}
                minZoom={0.3}
                maxZoom={1.75}
                zoomOnScroll={false}
                panOnScroll
                panOnScrollMode={PanOnScrollMode.Free}
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
                    position="bottom-right"
                    style={{ width: 144, height: 100 }}
                    className="!rounded-xl !border-2 !border-ink !bg-card"
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
