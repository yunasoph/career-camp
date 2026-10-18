<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

use CareerCampus\Config\Settings;
use PDO;
use PDOStatement;

/**
 * Counts prepared statements: the roadmap detail endpoint must stay
 * within its query budget (Phase 2 exit gate, plan step 4).
 */
final class CountingPdo extends PDO
{
    public int $prepared = 0;

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        $this->prepared++;

        return parent::prepare($query, $options);
    }
}

/**
 * GET /api/v1/roadmaps/{slug} (spec 7): roadmap + nodes + edges,
 * per-node state/counters when authed, quiz answers stripped, and a
 * hard 5-query budget for the authed path.
 */
final class RoadmapDetailTest extends AppTestCase
{
    protected function createDb(): PDO
    {
        $settings = Settings::fromEnv();

        return new CountingPdo(
            sprintf('pgsql:host=%s;port=%d;dbname=%s', $settings->dbHost, $settings->dbPort, $settings->dbName),
            $settings->dbUser,
            $settings->dbPassword,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
    }

    /**
     * Trail fixture: a (2 tasks) -> b (1 task) -> c (1 task); a -> d (1 quiz task).
     *
     * @param array<string, string> $out filled with roadmap/node/task ids
     */
    private function seedTrail(array &$out): void
    {
        $out['roadmap'] = $this->seedRoadmap('the-trail');
        $out['a'] = $this->seedNode($out['roadmap'], 'a');
        $out['b'] = $this->seedNode($out['roadmap'], 'b', [$out['a']]);
        $out['c'] = $this->seedNode($out['roadmap'], 'c', [$out['b']]);
        $out['d'] = $this->seedNode($out['roadmap'], 'd', [$out['a']]);

        $out['t1a'] = $this->seedTask($out['a'], 'reading');
        $out['t1b'] = $this->seedTask($out['a'], 'practice');
        $out['t2'] = $this->seedTask($out['b'], 'reading');
        $out['t3'] = $this->seedTask($out['c'], 'reading');
        $out['t4'] = $this->seedTask(
            $out['d'],
            'quiz',
            20,
            true,
            ['questions' => [[
                'id' => 'q1',
                'prompt' => 'What is the answer?',
                'options' => ['Forty-two', 'Seven'],
                'correct_index' => 1,
                'explanation' => 'SECRET-ANSWER-EXPLANATION',
            ]]],
        );
    }

    public function testGuestDetailHasNullStatesAndNoAuthFields(): void
    {
        $fixture = [];
        $this->seedTrail($fixture);

        $response = $this->call('GET', '/api/v1/roadmaps/the-trail');

        self::assertSame(200, $response->getStatusCode());
        $body = $this->body($response);

        self::assertSame('the-trail', $body['roadmap']['slug']);
        self::assertCount(4, $body['nodes']);
        self::assertCount(3, $body['edges']);
        foreach ($body['nodes'] as $node) {
            self::assertNull($node['state'], "guests get null state ({$node['slug']})");
        }
        self::assertArrayNotHasKey('enrolled', $body);
        self::assertArrayNotHasKey('percent_complete', $body);
    }

    public function testAuthedDetailComputesStatesAndProgress(): void
    {
        $fixture = [];
        $this->seedTrail($fixture);

        $user = $this->seedUser();
        $this->enroll($user['id'], $fixture['roadmap']);
        $this->markCompleted($user['id'], [$fixture['t1a'], $fixture['t1b'], $fixture['t4']]);

        $response = $this->call(
            'GET',
            '/api/v1/roadmaps/the-trail',
            null,
            $this->bearer($this->issueAccessToken($user['id'])),
        );

        self::assertSame(200, $response->getStatusCode());
        $body = $this->body($response);

        self::assertTrue($body['enrolled']);
        self::assertSame(50, $body['percent_complete'], '2 of 4 nodes completed');

        $states = [];
        $counts = [];
        foreach ($body['nodes'] as $node) {
            $states[$node['slug']] = $node['state'];
            $counts[$node['slug']] = [$node['completed_tasks'], $node['total_tasks']];
        }

        self::assertSame('completed', $states['a']);
        self::assertSame('available', $states['b'], 'prereq a completed, no tasks done');
        self::assertSame('locked', $states['c'], 'prereq b not completed');
        self::assertSame('completed', $states['d']);
        self::assertSame([0, 1], $counts['b'], 'node b: 1 required task, none done');
    }

    public function testQuizAnswersAreNeverSent(): void
    {
        $fixture = [];
        $this->seedTrail($fixture);

        $response = $this->call('GET', '/api/v1/roadmaps/the-trail');

        self::assertSame(200, $response->getStatusCode());
        $raw = (string) $response->getBody();

        self::assertStringNotContainsString('correct_index', $raw);
        self::assertStringNotContainsString('SECRET-ANSWER-EXPLANATION', $raw);
    }

    public function testUnknownSlugReturns404(): void
    {
        $response = $this->call('GET', '/api/v1/roadmaps/nope');

        self::assertSame(404, $response->getStatusCode());
    }

    public function testUnpublishedRoadmapReturns404(): void
    {
        $this->seedRoadmap('hidden-trail', false);

        $response = $this->call('GET', '/api/v1/roadmaps/hidden-trail');

        self::assertSame(404, $response->getStatusCode());
    }

    public function testAuthedDetailUsesAtMostFiveQueries(): void
    {
        $fixture = [];
        $this->seedTrail($fixture);

        $user = $this->seedUser();
        $this->enroll($user['id'], $fixture['roadmap']);
        $this->markCompleted($user['id'], [$fixture['t1a']]);

        self::assertInstanceOf(CountingPdo::class, $this->db);
        $this->db->prepared = 0;

        $response = $this->call(
            'GET',
            '/api/v1/roadmaps/the-trail',
            null,
            $this->bearer($this->issueAccessToken($user['id'])),
        );

        self::assertSame(200, $response->getStatusCode());
        self::assertLessThanOrEqual(
            5,
            $this->db->prepared,
            'roadmap detail must stay within its 5-query budget',
        );
    }
}
