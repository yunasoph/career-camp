<?php

declare(strict_types=1);

namespace CareerCampus\Repository;

use PDO;

/** `tasks` read access (Phase 2: read-only). Quiz jsonb arrives as a string. */
final class TaskRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return list<array<string, mixed>> in sort order */
    public function findByNode(string $nodeId): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM tasks WHERE node_id = ? ORDER BY sort_order'
        );
        $stmt->execute([$nodeId]);

        return $stmt->fetchAll() ?: [];
    }

    /**
     * Tasks for the given node ids, grouped by node — 1 query (IN list).
     *
     * @param list<string> $nodeIds
     * @return array<string, list<array<string, mixed>>> node id => tasks (sort order)
     */
    public function findByNodes(array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($nodeIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT * FROM tasks WHERE node_id IN ($placeholders) ORDER BY sort_order"
        );
        $stmt->execute($nodeIds);

        $map = [];
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $map[$row['node_id']][] = $row;
        }

        return $map;
    }

    /**
     * The user's completed tasks for the given nodes, 1 query (IN list).
     *
     * @param list<string> $nodeIds
     * @return list<array{task_id: string, node_id: string, is_required: bool}>
     */
    public function completedTasksForUser(string $userId, array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($nodeIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT t.id AS task_id, t.node_id, t.is_required
             FROM tasks t
             JOIN task_completions c ON c.task_id = t.id AND c.user_id = ?
             WHERE t.node_id IN ($placeholders)"
        );
        $stmt->execute(array_merge([$userId], $nodeIds));

        $rows = $stmt->fetchAll() ?: [];
        foreach ($rows as &$row) {
            $row['is_required'] = (bool) $row['is_required'];
        }
        unset($row);

        return $rows;
    }

    /**
     * Required-task counts per node, 1 query (IN list).
     *
     * @param list<string> $nodeIds
     * @return array<string, int> node id => required task count
     */
    public function requiredCountsForNodes(array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($nodeIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT node_id, count(*) AS required
             FROM tasks
             WHERE node_id IN ($placeholders) AND is_required
             GROUP BY node_id"
        );
        $stmt->execute($nodeIds);

        $counts = [];
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $counts[$row['node_id']] = (int) $row['required'];
        }

        return $counts;
    }
}
