import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { RoadmapListResponse } from './types';

/**
 * Shared public roadmap list (spec §7) — landing path picker + featured paths
 * now, the catalog page later; one TanStack cache entry per `['roadmaps']` key.
 */
export function useRoadmaps() {
    return useQuery({
        queryKey: ['roadmaps'],
        queryFn: () => api<RoadmapListResponse>('/api/v1/roadmaps'),
    });
}
