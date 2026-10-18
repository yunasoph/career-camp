import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import type { RoadmapNode } from '@/api/types';
import { TrailNode, type TrailFlowNode } from './TrailNode';

function makeNode(state: RoadmapNode['state']): RoadmapNode {
    return {
        id: 'n1',
        slug: 'css',
        title: 'CSS & Layout',
        description: 'Box model and friends.',
        landmark: 'studio',
        pos_x: 0,
        pos_y: 300,
        sort_order: 4,
        state,
        completed_tasks: state === 'completed' ? 3 : state === 'in_progress' ? 1 : 0,
        total_tasks: 3,
    };
}

function renderNode(state: RoadmapNode['state'], onOpen = vi.fn()): void {
    const props = {
        id: 'n1',
        data: { node: makeNode(state), variant: 'day' as const, onOpen },
        selected: false,
        isConnectable: false,
    } as unknown as NodeProps<TrailFlowNode>;
    // Handles need React Flow's store context — the provider is enough (no canvas).
    render(
        <ReactFlowProvider>
            <TrailNode {...props} />
        </ReactFlowProvider>,
    );
}

describe('TrailNode', () => {
    it('renders a locked node: fog + desaturated sprite + LOCK badge', () => {
        renderNode('locked');
        const tile = screen.getByRole('button', { name: 'Locked: CSS & Layout' });
        expect(tile).toHaveAttribute('data-state', 'locked');
        // sprite is desaturated
        const sprite = tile.querySelector('svg');
        expect(sprite?.getAttribute('class')).toContain('grayscale');
        // no lagoon glow for locked nodes
        const root = tile.closest('[id]');
        const glow = Array.from(root?.children ?? []).find((el) =>
            (el.getAttribute('style') ?? '').includes('lagoon'),
        );
        expect(glow).toBeUndefined();
    });

    it('renders an available node with a lagoon glow pulse', () => {
        renderNode('available');
        const tile = screen.getByRole('button', { name: 'Available: CSS & Layout' });
        expect(tile).toHaveAttribute('data-state', 'available');
        const root = tile.closest('[id]');
        const glow = Array.from(root?.children ?? []).find((el) =>
            (el.getAttribute('style') ?? '').includes('lagoon'),
        );
        expect(glow).toBeDefined();
    });

    it('renders an in-progress node with a 20-segment pixel ring', () => {
        renderNode('in_progress');
        const tile = screen.getByRole('button', { name: 'In progress: CSS & Layout' });
        expect(tile).toHaveAttribute('data-state', 'in_progress');
        const root = tile.closest('[id]');
        expect(root?.querySelectorAll('svg circle')).toHaveLength(2);
    });

    it('renders a completed node without a ring', () => {
        renderNode('completed');
        const tile = screen.getByRole('button', { name: 'Completed: CSS & Layout' });
        expect(tile).toHaveAttribute('data-state', 'completed');
        const root = tile.closest('[id]');
        expect(root?.querySelectorAll('svg circle')).toHaveLength(0);
    });

    it('renders a neutral preview for guests (state null)', () => {
        renderNode(null);
        const tile = screen.getByRole('button', { name: 'Preview: CSS & Layout' });
        expect(tile).toHaveAttribute('data-state', 'preview');
        // task chip shows 0/3
        expect(tile).toHaveTextContent('0/3');
    });

    it('opens the drawer on Enter', () => {
        const onOpen = vi.fn();
        renderNode('available', onOpen);
        fireEvent.keyDown(screen.getByRole('button', { name: 'Available: CSS & Layout' }), { key: 'Enter' });
        expect(onOpen).toHaveBeenCalledWith('n1');
    });
});
