import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { NodeDetailResponse, RoadmapDetail } from './types';

/**
 * Trail-map detail (spec §7) — public, personalised when a Bearer token is
 * attached by `api()` (the client does that automatically when authed).
 */
export function useRoadmap(slug: string) {
    return useQuery({
        queryKey: ['roadmap', slug],
        queryFn: () => api<RoadmapDetail>(`/api/v1/roadmaps/${slug}`),
        enabled: slug.length > 0,
    });
}

/** Node detail for the drawer (quiz answers never come back — spec §6.1). */
export function useNodeDetail(nodeId: string | null) {
    return useQuery({
        queryKey: ['node', nodeId],
        queryFn: () => api<NodeDetailResponse>(`/api/v1/nodes/${nodeId}`),
        enabled: nodeId !== null,
    });
}
