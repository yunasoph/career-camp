<?php

declare(strict_types=1);

namespace CareerCampus\Repository;

use PDO;

/**
 * `roadmaps` read access (Phase 2: read-only). Query budget for the
 * roadmap detail endpoint is 5 total (spec plan §Phase 2): this class
 * contributes at most 1 of them (see progressForUser).
 */
final class RoadmapRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Published roadmaps with node/task counts — 1 query (scalar subqueries).
     *
     * @return list<array<string, mixed>>
     */
    public function listPublished(): array
    {
        $stmt = $this->db->prepare(
            'SELECT r.*,
                    (SELECT count(*) FROM nodes n WHERE n.roadmap_id = r.id) AS node_count,
                    (SELECT count(*) FROM tasks t JOIN nodes n ON t.node_id = n.id WHERE n.roadmap_id = r.id) AS task_count
             FROM roadmaps r
             WHERE r.is_published
             ORDER BY r.created_at, r.slug'
        );
        $stmt->execute();

        return $stmt->fetchAll() ?: [];
    }

    /** @return array<string, mixed>|null */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM roadmaps WHERE slug = ?');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * Enrollment flag + per-node completed/total REQUIRED-task counts for
     * ONE roadmap — a single query (nodes LEFT JOIN tasks LEFT JOIN
     * completions, LEFT JOIN enrollments for the flag).
     *
     * @return array{enrolled: bool, per_node: array<string, array{completed: int, total: int}>}
     */
    public function progressForUser(string $userId, string $roadmapId): array
    {
        $stmt = $this->db->prepare(
            'SELECT
                e.roadmap_id IS NOT NULL AS enrolled,
                n.id AS node_id,
                count(t.id) FILTER (WHERE t.is_required) AS total_required,
                count(c.id) FILTER (WHERE t.is_required) AS completed_required
             FROM nodes n
             LEFT JOIN enrollments e
                ON e.user_id = :user_id AND e.roadmap_id = n.roadmap_id
             LEFT JOIN tasks t ON t.node_id = n.id
             LEFT JOIN task_completions c ON c.task_id = t.id AND c.user_id = :user_id
             WHERE n.roadmap_id = :roadmap_id
             GROUP BY n.id, n.roadmap_id, e.roadmap_id'
        );
        $stmt->execute(['user_id' => $userId, 'roadmap_id' => $roadmapId]);

        $enrolled = false;
        $perNode = [];
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $enrolled = $enrolled || (bool) $row['enrolled'];
            $perNode[$row['node_id']] = [
                'completed' => (int) $row['completed_required'],
                'total' => (int) $row['total_required'],
            ];
        }

        return ['enrolled' => $enrolled, 'per_node' => $perNode];
    }

    /**
     * Per-enrolled-roadmap completed/total required-task counts — 1 query
     * (used by the /roadmaps list, keeps it at 2 queries when authed).
     *
     * @return array<string, array{completed: int, total: int}> roadmap id => counts
     */
    public function enrolledProgressForUser(string $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT e.roadmap_id,
                    count(t.id) FILTER (WHERE t.is_required) AS total_required,
                    count(c.id) FILTER (WHERE t.is_required) AS completed_required
             FROM enrollments e
             LEFT JOIN nodes n ON n.roadmap_id = e.roadmap_id
             LEFT JOIN tasks t ON t.node_id = n.id
             LEFT JOIN task_completions c ON c.task_id = t.id AND c.user_id = :user_id
             WHERE e.user_id = :user_id
             GROUP BY e.roadmap_id'
        );
        $stmt->execute(['user_id' => $userId]);

        $progress = [];
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $progress[$row['roadmap_id']] = [
                'completed' => (int) $row['completed_required'],
                'total' => (int) $row['total_required'],
            ];
        }

        return $progress;
    }

    /**
     * The user's completed REQUIRED-task counts for the given nodes — 1 query.
     *
     * @param list<string> $nodeIds
     * @return array<string, int> node id => completed required tasks
     */
    public function completedRequiredCountsForUser(string $userId, array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($nodeIds), '?'));
        $stmt = $this->db->prepare(
            "SELECT t.node_id, count(c.id) AS completed
             FROM tasks t
             JOIN task_completions c ON c.task_id = t.id AND c.user_id = :user_id
             WHERE t.node_id IN ($placeholders) AND t.is_required
             GROUP BY t.node_id"
        );
        $stmt->execute(array_merge([$userId], $nodeIds));

        $counts = [];
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $counts[$row['node_id']] = (int) $row['completed'];
        }

        return $counts;
    }
}
