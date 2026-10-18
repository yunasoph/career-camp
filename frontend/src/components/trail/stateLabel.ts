import type { RoadmapNode } from '@/api/types';

const STATE_LABEL: Record<NonNullable<RoadmapNode['state']>, string> = {
    locked: 'Locked',
    available: 'Available',
    in_progress: 'In progress',
    completed: 'Completed',
};

/** Human label for a node state (guest `null` → "Preview"). */
export function stateLabel(state: RoadmapNode['state']): string {
    return state ? (STATE_LABEL[state] ?? 'Preview') : 'Preview';
}
