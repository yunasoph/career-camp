import { render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { TrailEdge, type TrailFlowEdge } from './TrailEdge';
import { steppedPath } from './steppedPath';

function renderEdge(overrides: Partial<EdgeProps<TrailFlowEdge>> = {}): void {
    const props = {
        id: 'e1',
        sourceX: 96,
        sourceY: 96,
        targetX: 336,
        targetY: 240,
        data: { ants: false },
        ...overrides,
    } as unknown as EdgeProps<TrailFlowEdge>;
    render(<svg>{<TrailEdge {...props} />}</svg>);
}

describe('TrailEdge', () => {
    it('draws a stepped orthogonal path from the (already grid-aligned) endpoints', () => {
        renderEdge();
        expect(screen.getByTestId('trail-edge-path')).toHaveAttribute(
            'd',
            'M 96 96 L 216 96 L 216 240 L 336 240',
        );
    });

    it('quantises off-grid coordinates to the 8px pixel grid', () => {
        expect(steppedPath(100, 100, 340, 250)).toBe('M 104 104 L 224 104 L 224 248 L 344 248');
    });

    it('handles straight vertical trails', () => {
        expect(steppedPath(96, 96, 96, 240)).toBe('M 96 96 L 96 96 L 96 240 L 96 240');
    });

    it('adds a marching-ants overlay when flagged', () => {
        renderEdge({ data: { ants: true } });
        expect(document.querySelector('.trail-ants')).not.toBeNull();
    });

    it('does not render the ants overlay by default', () => {
        renderEdge();
        expect(document.querySelector('.trail-ants')).toBeNull();
    });
});
