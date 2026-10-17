<?php

declare(strict_types=1);

namespace CareerCampus\Repository;

use PDO;

/** `nodes` + `node_prerequisites` read access (Phase 2: read-only). */
final class NodeRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return list<array<string, mixed>> in layout order */
    public function findByRoadmap(string $roadmapId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM nodes WHERE roadmap_id = ? ORDER BY sort_order, pos_y, pos_x'
        );
        $stmt->execute([$roadmapId]);

        return $stmt->fetchAll() ?: [];
    }

    /**
     * Node row joined with its roadmap (slug + published flag) — 1 query.
     *
     * @return array<string, mixed>|null
     */
    public function findByIdWithRoadmap(string $nodeId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT n.*, r.slug AS roadmap_slug, r.is_published AS roadmap_published
             FROM nodes n
             JOIN roadmaps r ON r.id = n.roadmap_id
             WHERE n.id = ?'
        );
        $stmt->execute([$nodeId]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * Prerequisites for the given node ids — 1 query (IN list).
     *
     * @param list<string> $nodeIds
     * @return array<string, list<string>> node id => prerequisite ids
     */
    public function prerequisitesFor(array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($nodeIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT node_id, prerequisite_id
             FROM node_prerequisites
             WHERE node_id IN ($placeholders)"
        );
        $stmt->execute($nodeIds);

        $map = [];
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $map[$row['node_id']][] = $row['prerequisite_id'];
        }

        return $map;
    }

    /** @return list<string> */
    public function prerequisiteIdsFor(string $nodeId): array
    {
        return $this->prerequisitesFor([$nodeId])[$nodeId] ?? [];
    }
}
