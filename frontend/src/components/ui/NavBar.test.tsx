import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NavBar } from './NavBar';

function renderNav(entry = '/'): void {
    render(
        <MemoryRouter initialEntries={[entry]}>
            <NavBar />
        </MemoryRouter>,
    );
}

describe('NavBar', () => {
    it('renders all navigation links', () => {
        renderNav();
        for (const label of ['Home', 'Paths', 'Quests', 'Leaderboard']) {
            expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
        }
    });

    it('marks the active route with the marigold pill', () => {
        renderNav('/');
        expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('bg-marigold');
        expect(screen.getByRole('link', { name: 'Paths' })).not.toHaveClass('bg-marigold');
    });

    it('renders an accessible theme toggle', () => {
        renderNav();
        expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument();
    });

    it('renders the pixel logo mark', () => {
        renderNav();
        expect(screen.getByRole('link', { name: 'CareerCampus home' })).toBeInTheDocument();
    });
});
