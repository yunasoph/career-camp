import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NodeDetailResponse, RoadmapNode } from '@/api/types';
import { NodeDrawer } from './NodeDrawer';

const NODES: RoadmapNode[] = [
    {
        id: 'n1',
        slug: 'css',
        title: 'CSS & Layout',
        description: 'Box model.',
        landmark: 'studio',
        pos_x: 0,
        pos_y: 300,
        sort_order: 4,
        state: 'in_progress',
        completed_tasks: 1,
        total_tasks: 3,
    },
    {
        id: 'n2',
        slug: 'html',
        title: 'HTML Foundations',
        description: 'Semantics.',
        landmark: 'library',
        pos_x: 240,
        pos_y: 150,
        sort_order: 2,
        state: 'completed',
        completed_tasks: 4,
        total_tasks: 4,
    },
];

const NODE_DETAIL: NodeDetailResponse = {
    node: { ...NODES[0]!, roadmap_slug: 'frontend-developer', prerequisite_ids: ['n2'] },
    tasks: [
        {
            id: 't1',
            type: 'reading',
            title: 'Box model basics',
            description: 'Content, padding, border, margin.',
            resource_url: 'https://developer.mozilla.org/en-US/docs/Learn/CSS/First_steps/The_box_model',
            xp: 10,
            is_required: true,
            sort_order: 1,
            est_minutes: 15,
            completed: true,
        },
        {
            id: 't2',
            type: 'practice',
            title: 'Build a card',
            description: 'Style a card with padding and shadow.',
            resource_url: null,
            xp: 20,
            is_required: true,
            sort_order: 2,
            est_minutes: 30,
            completed: false,
        },
        {
            id: 't3',
            type: 'quiz',
            title: 'Layout quiz',
            description: 'Check your box model knowledge.',
            resource_url: null,
            xp: 20,
            is_required: true,
            sort_order: 3,
            est_minutes: 10,
            completed: false,
            quiz: {
                questions: [
                    {
                        id: 'q1',
                        prompt: 'What is inside the border?',
                        options: ['Content + padding', 'Margin'],
                    },
                    { id: 'q2', prompt: 'What sits outside the border?', options: ['Margin', 'Padding'] },
                    { id: 'q3', prompt: 'What is inside everything?', options: ['Content', 'Border'] },
                ],
            },
        },
    ],
};

/** Duck-typed Response — the client only reads status / ok / json(). */
function json(status: number, body: unknown): Response {
    return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response;
}

function renderDrawer(): void {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <NodeDrawer node={NODES[0]!} nodes={NODES} variant="day" onClose={vi.fn()} />
        </QueryClientProvider>,
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('NodeDrawer', () => {
    it('renders the node head, prerequisite chips and the task list', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, NODE_DETAIL)));
        renderDrawer();

        expect(await screen.findByRole('dialog', { name: 'Details: CSS & Layout' })).toBeInTheDocument();
        expect(screen.getByText('Box model.')).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();

        // prerequisite chip (completed → check state) — waits for the /nodes fetch
        expect(await screen.findByText('HTML Foundations')).toBeInTheDocument();

        // tasks
        expect(screen.getByText('Box model basics')).toBeInTheDocument();
        expect(screen.getByText('Build a card')).toBeInTheDocument();
        expect(screen.getByText('Layout quiz')).toBeInTheDocument();
        expect(screen.getByText('+10 XP')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Resource' })).toHaveAttribute(
            'href',
            'https://developer.mozilla.org/en-US/docs/Learn/CSS/First_steps/The_box_model',
        );
    });

    it('shows the quiz question count — never prompts, options or answers', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, NODE_DETAIL)));
        renderDrawer();

        expect(await screen.findByText('3 questions')).toBeInTheDocument();
        expect(screen.queryByText('What is inside the border?')).not.toBeInTheDocument();
        expect(screen.queryByText('Content + padding')).not.toBeInTheDocument();
    });
});
