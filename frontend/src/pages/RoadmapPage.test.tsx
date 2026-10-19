import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeDetailResponse, RoadmapDetail, User } from '@/api/types';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { RoadmapPage } from './RoadmapPage';

type MockNode = { id: string; data: { node: { title: string } } };

// React Flow needs a real canvas — the page test mocks it (plan: no canvas).
vi.mock('@xyflow/react', () => ({
    ReactFlow: ({
        nodes,
        onNodeClick,
    }: {
        nodes?: MockNode[];
        onNodeClick?: (_e: unknown, node: { id: string }) => void;
    }) => (
        <div data-testid="mock-flow">
            {(nodes ?? []).map((n) => (
                <button
                    key={n.id}
                    type="button"
                    aria-label={`Open ${n.data.node.title}`}
                    onClick={() => onNodeClick?.(undefined, { id: n.id })}
                >
                    {n.data.node.title}
                </button>
            ))}
        </div>
    ),
    MiniMap: () => null,
    ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ fitView: vi.fn(), setCenter: vi.fn() }),
    PanOnScrollMode: { Free: 'free', Vertical: 'vertical', Horizontal: 'horizontal' },
    Handle: () => null,
    Position: { Top: 'Top', Bottom: 'Bottom' },
}));

const USER: User = {
    id: 'user-1',
    email: 'tester@example.com',
    display_name: 'Test Runner',
    avatar_url: null,
    role: 'learner',
    timezone: 'UTC',
    total_xp: 105,
    level: 2,
    xp_to_next: 95,
    title: 'Trail Blazer',
    current_streak: 1,
    longest_streak: 3,
    last_active_date: '2026-07-09',
};

const DETAIL: RoadmapDetail = {
    roadmap: {
        id: 'r1',
        slug: 'frontend-developer',
        title: 'Frontend Developer',
        summary: 'From first component to shipping a product.',
        icon: null,
        difficulty: 'beginner',
        est_hours: 80,
        theme: { tint: 'ember', landmarks: ['workshop', 'tower', 'bridge', 'studio'] },
    },
    nodes: [
        {
            id: 'n1',
            slug: 'web',
            title: 'How the Web Works',
            description: 'Browsers, servers, HTTP.',
            landmark: 'garden-gate',
            pos_x: 0,
            pos_y: 0,
            sort_order: 1,
            state: 'completed',
            completed_tasks: 4,
            total_tasks: 4,
        },
        {
            id: 'n2',
            slug: 'html',
            title: 'HTML Foundations',
            description: 'Semantics and structure.',
            landmark: 'library',
            pos_x: 240,
            pos_y: 150,
            sort_order: 2,
            state: 'in_progress',
            completed_tasks: 1,
            total_tasks: 3,
        },
        {
            id: 'n3',
            slug: 'css',
            title: 'CSS & Layout',
            description: 'Box model and friends.',
            landmark: 'studio',
            pos_x: 0,
            pos_y: 300,
            sort_order: 3,
            state: 'available',
            completed_tasks: 0,
            total_tasks: 3,
        },
        {
            id: 'n4',
            slug: 'js',
            title: 'JavaScript Essentials',
            description: 'The language of the web.',
            landmark: 'workshop',
            pos_x: 240,
            pos_y: 300,
            sort_order: 4,
            state: 'locked',
            completed_tasks: 0,
            total_tasks: 5,
        },
    ],
    edges: [
        { node_id: 'n2', prerequisite_id: 'n1' },
        { node_id: 'n3', prerequisite_id: 'n1' },
        { node_id: 'n4', prerequisite_id: 'n2' },
    ],
    enrolled: true,
    percent_complete: 25,
};

const NODE_DETAIL: NodeDetailResponse = {
    node: {
        id: 'n3',
        slug: 'css',
        title: 'CSS & Layout',
        description: 'Box model.',
        landmark: 'studio',
        pos_x: 0,
        pos_y: 300,
        sort_order: 3,
        state: 'available',
        completed_tasks: 0,
        total_tasks: 3,
        roadmap_slug: 'frontend-developer',
        prerequisite_ids: ['n1'],
    },
    tasks: [
        {
            id: 't1',
            type: 'reading',
            title: 'Box model basics',
            description: 'Content, padding, border, margin.',
            resource_url: 'https://developer.mozilla.org/',
            xp: 10,
            is_required: true,
            sort_order: 1,
            est_minutes: 15,
            completed: false,
        },
        {
            id: 't2',
            type: 'quiz',
            title: 'Layout quiz',
            description: 'Two quick questions.',
            resource_url: null,
            xp: 20,
            is_required: true,
            sort_order: 2,
            est_minutes: 10,
            completed: false,
            quiz: {
                questions: [
                    { id: 'q1', prompt: 'p1', options: ['A', 'B'] },
                    { id: 'q2', prompt: 'p2', options: ['C', 'D'] },
                ],
            },
        },
    ],
};

/** Duck-typed Response — the client only reads status / ok / json(). */
function json(status: number, body: unknown): Response {
    return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

function stubContentFetch(): void {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.startsWith('/api/v1/roadmaps/frontend-developer')) return json(200, DETAIL);
            if (url.startsWith('/api/v1/nodes/')) return json(200, NODE_DETAIL);
            return json(404, { error: { code: 'not_found', message: 'Trail not found.' } });
        }),
    );
}

/** jsdom has no matchMedia — framer-motion / scene hooks read it. */
function stubMatchMedia(): void {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((media: string) => ({
            matches: false,
            media,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    );
}

function renderPage(path = '/roadmaps/frontend-developer'): void {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/roadmaps" element={<div>catalog</div>} />
                    <Route path="/roadmaps/:slug" element={<RoadmapPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    stubMatchMedia();
    useThemeStore.getState().setTheme('light');
});

afterEach(() => {
    vi.unstubAllGlobals();
    useThemeStore.getState().setTheme('light');
    useAuthStore.getState().clear();
});

describe('RoadmapPage', () => {
    it('renders the sticky header with difficulty, est. hours and % complete (authed)', async () => {
        useAuthStore.getState().setSession('tok', USER);
        stubContentFetch();
        renderPage();

        expect(
            await screen.findByRole('heading', { level: 1, name: 'Frontend Developer' }),
        ).toBeInTheDocument();
        expect(screen.getByText('beginner')).toBeInTheDocument();
        expect(screen.getByText('≈ 80 h')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: '1 of 4 stops completed' })).toBeInTheDocument();
        // "You are here" prefers the in-progress node
        expect(screen.getByRole('button', { name: /You are here: HTML Foundations/ })).toBeInTheDocument();
        // back link
        expect(screen.getByRole('link', { name: /All paths/ })).toHaveAttribute('href', '/roadmaps');
    });

    it('opens the node drawer with tasks from GET /nodes/{id}', async () => {
        useAuthStore.getState().setSession('tok', USER);
        stubContentFetch();
        renderPage();

        const css = await screen.findByRole('button', { name: 'Open CSS & Layout' });
        fireEvent.click(css);

        expect(await screen.findByRole('dialog', { name: 'Details: CSS & Layout' })).toBeInTheDocument();
        // tasks arrive from GET /nodes/{id} — wait for the fetch
        expect(await screen.findByText('Box model basics')).toBeInTheDocument();
        expect(screen.getByText('Layout quiz')).toBeInTheDocument();
        expect(screen.getByText('2 questions')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Resource' })).toHaveAttribute(
            'href',
            'https://developer.mozilla.org/',
        );
    });

    it('shows Biscuit lost-on-the-trail for unknown slugs with a retry', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(json(404, { error: { code: 'not_found', message: 'Trail not found.' } })),
        );
        renderPage('/roadmaps/no-such-trail');

        expect(await screen.findByRole('heading', { name: /lost on the trail/ })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Try again/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'All paths' })).toHaveAttribute('href', '/roadmaps');
    });

    it('shows pixel-shimmer skeletons while the query is pending', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => new Promise<unknown>(() => {})),
        );
        renderPage();

        expect(document.querySelectorAll('.animate-checker-shimmer').length).toBeGreaterThan(0);
    });
});
