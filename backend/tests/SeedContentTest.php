<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Validates the seed JSON files (spec §10) WITHOUT a database: content
 * completeness, task-type legality, quiz shape (answers present for
 * server-side grading) and prerequisite-graph integrity (no cycles).
 */
final class SeedContentTest extends TestCase
{
    private const TASK_TYPES = ['reading', 'video', 'quiz', 'project', 'practice'];
    private const LANDMARKS = ['garden-gate', 'library', 'lab', 'workshop', 'studio', 'observatory', 'bridge', 'tower'];
    private const TINTS = ['ember', 'lagoon', 'moss', 'berry', 'marigold'];

    private static function seedsDir(): string
    {
        return dirname(__DIR__) . '/seeds';
    }

    /** @return array<string, mixed> */
    private static function load(string $path): array
    {
        $decoded = json_decode((string) file_get_contents(self::seedsDir() . $path), true);
        self::assertIsArray($decoded, "seed file {$path} must be valid JSON");

        return $decoded;
    }

    public static function roadmapFiles(): array
    {
        return [['frontend-developer.json', 12], ['data-analyst.json', 10]];
    }

    #[DataProvider('roadmapFiles')]
    public function testRoadmapContent(string $file, int $minNodes): void
    {
        $roadmap = self::load('/roadmaps/' . $file);

        self::assertArrayHasKey('slug', $roadmap);
        self::assertArrayHasKey('title', $roadmap);
        self::assertArrayHasKey('summary', $roadmap);
        self::assertArrayHasKey('nodes', $roadmap);
        self::assertTrue((bool) ($roadmap['is_published'] ?? false), 'seeded roadmaps must be published');

        // theme (spec §17.7 / §9A.7)
        $theme = $roadmap['theme'] ?? null;
        self::assertIsArray($theme, "{$file}: theme is required");
        self::assertContains($theme['tint'] ?? null, self::TINTS, "{$file}: theme.tint must be a known token");
        self::assertIsArray($theme['landmarks'] ?? null, "{$file}: theme.landmarks required");
        self::assertNotEmpty($theme['landmarks']);

        $nodes = $roadmap['nodes'];
        self::assertGreaterThanOrEqual($minNodes, count($nodes), "{$file}: needs >= {$minNodes} nodes");

        $slugs = [];
        $quizCount = 0;

        foreach ($nodes as $node) {
            self::assertArrayHasKey('slug', $node);
            self::assertArrayHasKey('title', $node);
            $slug = $node['slug'];
            $slugs[] = $slug;

            self::assertContains($node['landmark'] ?? null, self::LANDMARKS, "{$file}/{$slug}: unknown landmark");

            $pos = $node['pos'] ?? null;
            self::assertIsArray($pos, "{$file}/{$slug}: pos [x, y] required");
            self::assertCount(2, $pos);
            self::assertIsInt($pos[0]);
            self::assertIsInt($pos[1]);

            // prerequisites reference existing node slugs
            foreach ($node['prerequisites'] ?? [] as $prerequisite) {
                self::assertContains($prerequisite, $slugs, "{$file}/{$slug}: unknown prerequisite {$prerequisite}");
            }

            // 3–6 tasks per node (spec §10)
            $tasks = $node['tasks'] ?? [];
            self::assertGreaterThanOrEqual(3, count($tasks), "{$file}/{$slug}: needs >= 3 tasks");
            self::assertLessThanOrEqual(6, count($tasks), "{$file}/{$slug}: max 6 tasks");

            foreach ($tasks as $task) {
                self::assertContains($task['type'] ?? null, self::TASK_TYPES, "{$file}/{$slug}: illegal task type");
                self::assertNotEmpty($task['title'] ?? null, "{$file}/{$slug}: task title required");
                self::assertIsInt($task['xp'] ?? null);
                self::assertGreaterThanOrEqual(0, $task['xp']);

                if ($task['type'] === 'quiz') {
                    $quizCount++;
                    $this->assertQuizShape($file, $slug, $task);
                }
            }
        }

        self::assertNoDuplicateSlugs($slugs, $file);
        self::assertGreaterThanOrEqual(3, $quizCount, "{$file}: needs >= 3 quizzes");
        $this->assertNoPrerequisiteCycles($nodes, $file);
    }

    /**
     * @param list<string> $slugs
     */
    private function assertNoDuplicateSlugs(array $slugs, string $file): void
    {
        $duplicates = array_diff_assoc($slugs, array_unique($slugs));
        self::assertSame([], $duplicates, "{$file}: duplicate node slugs: " . implode(', ', array_keys($duplicates)));
    }

    private function assertQuizShape(string $file, string $slug, array $task): void
    {
        $quiz = $task['quiz'] ?? null;
        self::assertIsArray($quiz, "{$file}/{$slug}: quiz task needs a quiz object");

        $questions = $quiz['questions'] ?? null;
        self::assertIsArray($questions, "{$file}/{$slug}: quiz.questions required");
        self::assertGreaterThanOrEqual(3, count($questions), "{$file}/{$slug}: 3–5 questions per quiz (spec §10)");
        self::assertLessThanOrEqual(5, count($questions), "{$file}/{$slug}: 3–5 questions per quiz (spec §10)");

        $questionIds = [];
        foreach ($questions as $question) {
            self::assertNotEmpty($question['id'] ?? null, "{$file}/{$slug}: question id required");
            self::assertNotEmpty($question['prompt'] ?? null, "{$file}/{$slug}/{$question['id']}: prompt required");
            self::assertIsArray($question['options'] ?? null);
            self::assertGreaterThanOrEqual(2, count($question['options']), "{$file}/{$slug}/{$question['id']}: >= 2 options");
            foreach ($question['options'] as $option) {
                self::assertNotEmpty($option, "{$file}/{$slug}/{$question['id']}: empty option");
            }
            self::assertIsInt($question['correct_index'] ?? null, "{$file}/{$slug}/{$question['id']}: correct_index required (server-side grading, §6.1)");
            self::assertGreaterThan(-1, $question['correct_index']);
            self::assertLessThan(count($question['options']), $question['correct_index'], "{$file}/{$slug}/{$question['id']}: correct_index out of range");
            self::assertNotEmpty($question['explanation'] ?? null, "{$file}/{$slug}/{$question['id']}: explanation required");
            $questionIds[] = $question['id'];
        }
        self::assertSame($questionIds, array_unique($questionIds), "{$file}/{$slug}: duplicate question ids");
    }

    /**
     * @param list<array<string, mixed>> $nodes
     */
    private function assertNoPrerequisiteCycles(array $nodes, string $file): void
    {
        $graph = [];
        foreach ($nodes as $node) {
            $graph[$node['slug']] = $node['prerequisites'] ?? [];
        }

        $state = []; // slug => 'visiting' | 'done'
        $visit = function (string $slug) use (&$visit, &$state, $graph, $file): void {
            if (($state[$slug] ?? null) === 'done') {
                return;
            }
            self::assertNotSame('visiting', $state[$slug] ?? null, "{$file}: prerequisite cycle at {$slug}");
            $state[$slug] = 'visiting';
            foreach ($graph[$slug] as $prerequisite) {
                $visit($prerequisite);
            }
            $state[$slug] = 'done';
        };

        foreach ($graph as $slug => $_) {
            $visit($slug);
        }
    }

    public function testBadgesContent(): void
    {
        $badges = self::load('/badges.json');

        self::assertCount(12, $badges, 'spec §5.5 defines 12 badges');

        $codes = [];
        foreach ($badges as $badge) {
            self::assertNotEmpty($badge['code'] ?? null);
            self::assertNotEmpty($badge['name'] ?? null);
            self::assertNotEmpty($badge['description'] ?? null);
            self::assertNotEmpty($badge['icon'] ?? null);

            $rule = $badge['rule'] ?? null;
            self::assertIsArray($rule, "{$badge['code']}: rule JSON required");
            self::assertArrayHasKey('type', $rule, "{$badge['code']}: rule.type required");
            self::assertArrayHasKey('value', $rule, "{$badge['code']}: rule.value required");

            $codes[] = $badge['code'];
        }

        self::assertCount(12, array_unique($codes), 'badge codes must be unique');
    }
}
