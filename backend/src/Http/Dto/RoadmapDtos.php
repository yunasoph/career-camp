<?php

declare(strict_types=1);

namespace CareerCampus\Http\Dto;

/**
 * Row → API payload mappers (spec §7). Row values come from Postgres as
 * strings, so every numeric is cast here. `stripQuiz()` is THE ONLY place
 * a task's quiz jsonb is serialized: questions go out as {id, prompt,
 * options} — `correct_index` and `explanation` never reach a client
 * (spec §6.1).
 */
final class RoadmapDtos
{
    /**
     * @param array<string, mixed> $task raw tasks row
     * @return array<string, mixed>
     */
    public static function task(array $task): array
    {
        $dto = [
            'id' => $task['id'],
            'type' => $task['type'],
            'title' => $task['title'],
            'description' => $task['description'],
            'resource_url' => $task['resource_url'],
            'xp' => (int) $task['xp'],
            'is_required' => (bool) $task['is_required'],
            'sort_order' => (int) $task['sort_order'],
            'est_minutes' => (int) ($task['est_minutes'] ?? 15),
        ];

        if ($task['type'] === 'quiz' && isset($task['quiz'])) {
            $dto['quiz'] = self::stripQuiz($task['quiz']);
        }

        return $dto;
    }

    /**
     * @param array<string, mixed> $row raw roadmaps row (with node_count/task_count)
     * @return array<string, mixed>
     */
    public static function summary(array $row): array
    {
        return [
            'id' => $row['id'],
            'slug' => $row['slug'],
            'title' => $row['title'],
            'summary' => $row['summary'],
            'icon' => $row['icon'],
            'difficulty' => $row['difficulty'],
            'est_hours' => $row['est_hours'] === null ? null : (int) $row['est_hours'],
            'node_count' => (int) $row['node_count'],
            'task_count' => (int) $row['task_count'],
            'theme' => self::theme($row['theme'] ?? '{}'),
        ];
    }

    /**
     * @param array<string, mixed> $roadmap raw roadmaps row
     * @param list<array<string, mixed>> $nodeRows
     * @param array<string, list<string>> $prerequisiteMap node id => prereq ids
     * @param array<string, string|null> $states node id => state ('null' values for guests)
     * @param array<string, array{completed: int, total: int}>|null $perNode progress (null for guests)
     * @param bool $enrolled
     * @return array<string, mixed>
     */
    public static function detail(
        array $roadmap,
        array $nodeRows,
        array $prerequisiteMap,
        array $states,
        ?array $perNode,
        bool $enrolled,
    ): array {
        $nodes = [];
        $completedNodes = 0;
        foreach ($nodeRows as $row) {
            $progress = $perNode[$row['id']] ?? ['completed' => 0, 'total' => 0];
            $state = $states[$row['id']] ?? null;
            if ($state === 'completed') {
                $completedNodes++;
            }

            $nodes[] = [
                'id' => $row['id'],
                'slug' => $row['slug'],
                'title' => $row['title'],
                'description' => $row['description'],
                'landmark' => $row['landmark'],
                'pos_x' => (int) $row['pos_x'],
                'pos_y' => (int) $row['pos_y'],
                'sort_order' => (int) $row['sort_order'],
                'state' => $state,
                'completed_tasks' => $progress['completed'],
                'total_tasks' => $progress['total'],
            ];
        }

        $edges = [];
        foreach ($prerequisiteMap as $nodeId => $prerequisiteIds) {
            foreach ($prerequisiteIds as $prerequisiteId) {
                $edges[] = ['node_id' => $nodeId, 'prerequisite_id' => $prerequisiteId];
            }
        }
        sort($edges);

        $detail = [
            'roadmap' => [
                'id' => $roadmap['id'],
                'slug' => $roadmap['slug'],
                'title' => $roadmap['title'],
                'summary' => $roadmap['summary'],
                'icon' => $roadmap['icon'],
                'difficulty' => $roadmap['difficulty'],
                'est_hours' => $roadmap['est_hours'] === null ? null : (int) $roadmap['est_hours'],
                'theme' => self::theme($roadmap['theme'] ?? '{}'),
            ],
            'nodes' => $nodes,
            'edges' => $edges,
        ];

        if ($perNode !== null) {
            $total = count($nodeRows);
            $detail['enrolled'] = $enrolled;
            $detail['percent_complete'] = $total === 0 ? 0 : (int) round($completedNodes / $total * 100);
        }

        return $detail;
    }

    /**
     * @param array<string, mixed> $row raw node row (with roadmap_slug/roadmap_published)
     * @param list<array<string, mixed>> $taskRows
     * @param list<string> $prerequisiteIds
     * @param array<string, bool>|null $completedTasks task id => completed (null for guests)
     * @return array<string, mixed>
     */
    public static function node(
        array $row,
        array $taskRows,
        array $prerequisiteIds,
        ?string $state,
        int $completedRequired,
        int $requiredTaskCount,
        ?array $completedTasks,
    ): array {
        $tasks = [];
        foreach ($taskRows as $taskRow) {
            $task = self::task($taskRow);
            $task['completed'] = $completedTasks !== null && ($completedTasks[$taskRow['id']] ?? false);
            $tasks[] = $task;
        }

        return [
            'node' => [
                'id' => $row['id'],
                'slug' => $row['slug'],
                'title' => $row['title'],
                'description' => $row['description'],
                'landmark' => $row['landmark'],
                'roadmap_slug' => $row['roadmap_slug'],
                'pos_x' => (int) $row['pos_x'],
                'pos_y' => (int) $row['pos_y'],
                'sort_order' => (int) $row['sort_order'],
                'state' => $state,
                'completed_tasks' => $completedRequired,
                'total_tasks' => $requiredTaskCount,
                'prerequisite_ids' => $prerequisiteIds,
            ],
            'tasks' => $tasks,
        ];
    }

    /**
     * Quiz jsonb → client-safe shape. NEVER includes correct_index or
     * explanation (spec §6.1).
     *
     * @param array<string, mixed>|string|null $quiz decoded-or-raw jsonb value
     * @return array<string, mixed> {"questions": [{"id","prompt","options"}]}
     */
    public static function stripQuiz(array|string|null $quiz): array
    {
        $decoded = is_string($quiz) ? json_decode($quiz, true) : $quiz;
        $questions = is_array($decoded) ? ($decoded['questions'] ?? []) : [];

        $safe = [];
        foreach (is_array($questions) ? $questions : [] as $question) {
            if (!is_array($question)) {
                continue;
            }
            $options = $question['options'] ?? [];
            $safe[] = [
                'id' => $question['id'] ?? '',
                'prompt' => $question['prompt'] ?? '',
                'options' => is_array($options) ? array_values($options) : [],
            ];
        }

        return ['questions' => $safe];
    }

    /**
     * @param array<string, mixed>|string $theme jsonb value (string from PDO)
     * @return array<string, mixed>
     */
    private static function theme(array|string $theme): array
    {
        $decoded = is_string($theme) ? json_decode($theme, true) : $theme;

        return is_array($decoded) ? $decoded : [];
    }
}
