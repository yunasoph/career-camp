import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoadmapListResponse } from '@/api/types';
import { useThemeStore } from '@/store/themeStore';
import { RoadmapCatalogPage } from './RoadmapCatalogPage';

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
        {
            id: 'r3',
            slug: 'devops-automation-trail',
            title: 'DevOps Automation Trail',
            summary: 'Pipes, deploys and everything that ships itself.',
            icon: null,
            difficulty: 'advanced',
            est_hours: 80,
            node_count: 10,
            task_count: 22,
            theme: { tint: 'berry', landmarks: ['lab', 'bridge', 'tower'] },
        },
    ],
};

/** Duck-typed Response — the client only reads status / ok / json(). */
function json(status: number, body: unknown): Response {
    return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

function renderCatalog(): void {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <RoadmapCatalogPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    useThemeStore.getState().setTheme('light');
});

afterEach(() => {
    vi.unstubAllGlobals();
    useThemeStore.getState().setTheme('light');
});

describe('RoadmapCatalogPage', () => {
    it('renders every trail from the roadmaps query with walk links', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ROADMAPS)));
        renderCatalog();

        expect(await screen.findAllByRole('link', { name: /Walk this trail/ })).toHaveLength(3);
        expect(screen.getByRole('link', { name: /Frontend Dev Trail/ })).toHaveAttribute(
            'href',
            '/roadmaps/frontend-dev-trail',
        );
        expect(screen.getByRole('img', { name: 'Difficulty: beginner' })).toBeInTheDocument();
    });

    it('filters trails by difficulty', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ROADMAPS)));
        renderCatalog();
        await screen.findAllByRole('link', { name: /Walk this trail/ });

        fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
        expect(await screen.findByRole('link', { name: /DevOps Automation Trail/ })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Frontend Dev Trail/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Backend PHP Trail/ })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
        expect(await screen.findByRole('link', { name: /Frontend Dev Trail/ })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /DevOps Automation Trail/ })).not.toBeInTheDocument();
    });

    it('filters by search and clears filters from the empty state', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, ROADMAPS)));
        renderCatalog();
        await screen.findAllByRole('link', { name: /Walk this trail/ });

        const search = screen.getByLabelText('Search trails');
        fireEvent.change(search, { target: { value: 'php' } });
        expect(await screen.findByRole('link', { name: /Backend PHP Trail/ })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Frontend Dev Trail/ })).not.toBeInTheDocument();

        fireEvent.change(search, { target: { value: 'zzzz' } });
        expect(await screen.findByText('No trails match.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(await screen.findAllByRole('link', { name: /Walk this trail/ })).toHaveLength(3);
    });

    it('shows Biscuit and a working retry when the query fails', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(json(500, { error: { code: 'http_error', message: 'Server error.' } }));
        vi.stubGlobal('fetch', fetchMock);
        renderCatalog();

        expect(await screen.findByRole('img', { name: 'Biscuit' })).toBeInTheDocument();
        const retry = await screen.findByRole('button', { name: /Try again/i });

        fetchMock.mockResolvedValueOnce(json(200, ROADMAPS));
        fireEvent.click(retry);

        expect(await screen.findAllByRole('link', { name: /Walk this trail/ })).toHaveLength(3);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('shows pixel-shimmer skeletons while the query is pending', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => new Promise<unknown>(() => {})),
        );
        renderCatalog();

        expect(document.querySelectorAll('.animate-checker-shimmer').length).toBeGreaterThan(0);
    });
});
