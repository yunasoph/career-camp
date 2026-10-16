import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FLAME } from '@/art/sprites/icons';
import { PixelSprite } from './PixelSprite';

describe('PixelSprite', () => {
    it('renders merged <rect> runs (fewer rects than filled cells)', () => {
        const { container } = render(<PixelSprite sprite={FLAME} scale={2} />);
        const rects = container.querySelectorAll('rect');
        expect(rects.length).toBeGreaterThan(8);
        const totalCells = FLAME.rows.reduce((sum, row) => sum + row.replace(/\./g, '').length, 0);
        expect(rects.length).toBeLessThan(totalCells);
    });

    it('uses crispEdges and the sprite dimensions', () => {
        const { container } = render(<PixelSprite sprite={FLAME} scale={3} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('shape-rendering')).toBe('crispEdges');
        expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${FLAME.rows[0]?.length ?? 0} ${FLAME.rows.length}`);
        expect(svg?.getAttribute('width')).toBe(String((FLAME.rows[0]?.length ?? 0) * 3));
    });

    it('is aria-hidden when decorative', () => {
        const { container } = render(<PixelSprite sprite={FLAME} />);
        expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('exposes an accessible label when provided', () => {
        render(<PixelSprite sprite={FLAME} label="A pixel flame" />);
        expect(screen.getByRole('img', { name: 'A pixel flame' })).toBeInTheDocument();
    });
});
