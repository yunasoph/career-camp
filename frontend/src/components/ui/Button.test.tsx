import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
    it('applies the sticker style', () => {
        render(<Button>Go</Button>);
        expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('sticker');
    });

    it('defaults to the primary (marigold) variant', () => {
        render(<Button>Go</Button>);
        expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('bg-marigold');
    });

    it('switches variants', () => {
        render(<Button variant="danger">Stop</Button>);
        expect(screen.getByRole('button', { name: 'Stop' })).toHaveClass('bg-ember');
    });
});
