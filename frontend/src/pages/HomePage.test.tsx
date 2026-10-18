import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoadmapListResponse } from '@/api/types';
import { useThemeStore } from '@/store/themeStore';
import { HomePage } from './HomePage';

const ROADMAPS: RoadmapListResponse = {
    roadmaps: [
        {
            id: 'r1',
            slug: 'frontend-dev-trail',
            title: 'Frontend Dev Trail',
            summary: 'From first component to shipping a product.',
            icon: null,
            difficulty: 'beginner',
            est_hours: 40,
            node_count: 8,
            task_count: 17,
            theme: { tint: 'ember', landmarks: ['workshop', 'studio', 'bridge'] },
        },
        {
            id: 'r2',
            slug: 'backend-php-trail',
            title: 'Backend PHP Trail',
            summary: 'APIs, queues and the roads less travelled.',
            icon: null,
            difficulty: 'intermediate',
            est_hours: 60,
            node_count: 12,
            task_count: 26,
            theme: { tint: 'lagoon', landmarks: ['tower', 'library', 'observatory'] },
        },
    ],
};

/** Duck-typed Response — the client only reads status / ok / json(). */
function json(status: number, body: unknown): Response {
    return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

/** jsdom has no matchMedia — CampusScene reads prefers-reduced-motion in an effect. */
function stubMatchMedia(matches = false): void {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((media: string) => ({
            matches,
            media,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    );
}

function renderHome(): void {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    stubMatchMedia(false);
    useThemeStore.getState().setTheme('light');
});

afterEach(() => {
    vi.unstubAllGlobals();
    useThemeStore.getState().setTheme('light');
});

describe('HomePage (landing)', () => {
    it('renders the path picker and featured cards from the roadmaps query fixture', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ROADMAPS)));
        renderHome();

        const pickerLinks = await screen.findAllByRole('link', { name: /Frontend Dev Trail/ });
        expect(pickerLinks).toHaveLength(2); // hero picker + featured card
        expect(pickerLinks[0]?.getAttribute('href')).toBe('/roadmaps/frontend-dev-trail');

        expect(await screen.findAllByRole('link', { name: /Backend PHP Trail/ })).toHaveLength(2);

        expect(screen.getByRole('heading', { level: 1, name: /Map your career/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /How it works/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Featured paths/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Your Skill Passport/ })).toBeInTheDocument();
        expect(screen.getByText('More paths being mapped')).toBeInTheDocument();

        // The panorama renders twice (desktop + mobile) with three parallax layers each.
        expect(document.querySelectorAll('[data-layer="near"]').length).toBe(2);
    });

    it('shows Biscuit and a working retry when the roadmaps request fails', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(json(500, { error: { code: 'http_error', message: 'Server error.' } }));
        vi.stubGlobal('fetch', fetchMock);
        renderHome();

        expect(await screen.findByRole('img', { name: 'Biscuit' })).toBeInTheDocument();
        const retry = await screen.findByRole('button', { name: /Try again/i });

        fetchMock.mockResolvedValueOnce(json(200, ROADMAPS));
        fireEvent.click(retry);

        expect(await screen.findAllByRole('link', { name: /Frontend Dev Trail/ })).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('shows pixel-shimmer skeletons while the query is pending', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => new Promise<unknown>(() => {})),
        );
        renderHome();

        expect(document.querySelectorAll('.animate-checker-shimmer').length).toBeGreaterThan(0);
        expect(screen.queryByRole('link', { name: /Frontend Dev Trail/ })).not.toBeInTheDocument();
    });

    it('renders a static dusk panorama in dark mode with reduced motion', async () => {
        stubMatchMedia(true);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ROADMAPS)));
        useThemeStore.getState().setTheme('dark');
        renderHome();

        expect(
            await screen.findByRole('heading', { level: 3, name: /Frontend Dev Trail/ }),
        ).toBeInTheDocument();
        const layer = document.querySelector('[data-layer="far"]');
        expect(layer).not.toBeNull();
        const root = layer!.parentElement;
        expect((root?.getAttribute('style') ?? '').toLowerCase()).toContain('2b2140');
        expect(document.querySelectorAll('[data-layer="near"]').length).toBe(2);
    });
});
