<?php

declare(strict_types=1);

namespace CareerCampus\Service;

use CareerCampus\Domain\NodeFacts;
use CareerCampus\Domain\NodeStateResolver;
use CareerCampus\Http\Dto\RoadmapDtos;
use CareerCampus\Repository\NodeRepository;
use CareerCampus\Repository\RoadmapRepository;
use CareerCampus\Repository\TaskRepository;
use CareerCampus\Support\ApiException;

/**
 * Read-only roadmap content (Phase 2; spec §7). Controllers stay thin;
 * all query budgeting lives here.
 *
 * Query counts per request:
 *   GET /roadmaps            1 (guest) / 2 (authed: + enrollment progress)
 *   GET /roadmaps/{slug}     3 (guest) / 4 (authed: + per-node progress)
 *   GET /nodes/{id}          3 (guest) / 5 (authed)
 */
final class RoadmapService
{
    public function __construct(
        private readonly RoadmapRepository $roadmaps,
        private readonly NodeRepository $nodes,
        private readonly TaskRepository $tasks,
    ) {
    }

    /** @return list<array<string, mixed>> */
    public function listFor(?string $userId): array
    {
        $rows = $this->roadmaps->listPublished();

        if ($userId === null) {
            return array_map(
                static fn (array $row): array => RoadmapDtos::summary($row),
                $rows,
            );
        }

        $progress = $this->roadmaps->enrolledProgressForUser($userId);

        $summaries = [];
        foreach ($rows as $row) {
            $summary = RoadmapDtos::summary($row);
            $counts = $progress[$row['id']] ?? null;
            $summary['enrolled'] = $counts !== null;
            $summary['percent_complete'] = $counts === null || $counts['total'] === 0
                ? 0
                : (int) round($counts['completed'] / $counts['total'] * 100);
            $summaries[] = $summary;
        }

        return $summaries;
    }

    /** @return array<string, mixed> */
    public function detailFor(string $slug, ?string $userId): array
    {
        $roadmap = $this->roadmaps->findBySlug($slug);
        if ($roadmap === null || !(bool) $roadmap['is_published']) {
            throw new ApiException(404, 'not_found', 'Roadmap not found.');
        }

        $nodeRows = $this->nodes->findByRoadmap($roadmap['id']);
        $nodeIds = array_map(static fn (array $row): string => (string) $row['id'], $nodeRows);
        $prerequisiteMap = $this->nodes->prerequisitesFor($nodeIds);

        $enrolled = false;
        $perNode = null;
        $states = [];

        if ($userId !== null) {
            $progress = $this->roadmaps->progressForUser($userId, $roadmap['id']);
            $enrolled = $progress['enrolled'];
            $perNode = $progress['per_node'];

            $facts = [];
            foreach ($nodeRows as $row) {
                $counts = $perNode[$row['id']] ?? ['completed' => 0, 'total' => 0];
                $facts[] = new NodeFacts(
                    (string) $row['id'],
                    $prerequisiteMap[$row['id']] ?? [],
                    $counts['total'],
                    $counts['completed'],
                );
            }

            foreach (NodeStateResolver::resolve($facts) as $id => $state) {
                $states[$id] = $state->value;
            }
        }

        return RoadmapDtos::detail($roadmap, $nodeRows, $prerequisiteMap, $states, $perNode, $enrolled);
    }

    /** @return array<string, mixed> */
    public function nodeFor(string $nodeId, ?string $userId): array
    {
        $node = $this->nodes->findByIdWithRoadmap($nodeId);
        if ($node === null || !(bool) $node['roadmap_published']) {
            throw new ApiException(404, 'not_found', 'Node not found.');
        }

        $taskRows = $this->tasks->findByNode($nodeId);
        $prerequisiteIds = $this->nodes->prerequisiteIdsFor($nodeId);

        $requiredTaskCount = 0;
        foreach ($taskRows as $taskRow) {
            if ((bool) $taskRow['is_required']) {
                $requiredTaskCount++;
            }
        }

        $state = null;
        $completedRequired = 0;
        $completedTasks = null;

        if ($userId !== null) {
            $allNodeIds = array_merge([$nodeId], $prerequisiteIds);
            // Prereq nodes' required-task counts (the node's own count is
            // already known from $taskRows above).
            $requiredCounts = $this->tasks->requiredCountsForNodes($prerequisiteIds);

            $completedRows = $this->tasks->completedTasksForUser($userId, $allNodeIds);
            $completedTasks = [];
            $completedByNode = [];
            foreach ($completedRows as $row) {
                $completedTasks[$row['task_id']] = true;
                if ($row['is_required']) {
                    $completedByNode[$row['node_id']] = ($completedByNode[$row['node_id']] ?? 0) + 1;
                }
            }
            $completedRequired = $completedByNode[$nodeId] ?? 0;

            // The node's own prerequisites only need their task facts: a
            // node is `completed` purely from its own required tasks
            // (Phase 3's server gate makes deeper chains impossible).
            $facts = [
                new NodeFacts(
                    $nodeId,
                    $prerequisiteIds,
                    $requiredTaskCount,
                    $completedRequired,
                ),
            ];
            foreach ($prerequisiteIds as $prerequisiteId) {
                $facts[] = new NodeFacts(
                    $prerequisiteId,
                    [],
                    $requiredCounts[$prerequisiteId] ?? 0,
                    $completedByNode[$prerequisiteId] ?? 0,
                );
            }

            $state = NodeStateResolver::resolve($facts)[$nodeId]->value;
        }

        return RoadmapDtos::node(
            $node,
            $taskRows,
            $prerequisiteIds,
            $state,
            $completedRequired,
            $requiredTaskCount,
            $completedTasks,
        );
    }
}
