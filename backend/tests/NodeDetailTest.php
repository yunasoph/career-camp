<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * GET /api/v1/nodes/{id} (spec 7): node + tasks with per-task completed
 * flags, state when authed, quiz answers stripped (spec 6.1).
 */
final class NodeDetailTest extends AppTestCase
{
    /**
     * Node x (3 tasks: 2 required incl. a quiz, 1 optional) behind prereq p.
     *
     * @param array<string, string> $out filled with roadmap/node/task ids
     */
    private function seedNodeWithPrereq(array &$out): void
    {
        $out['roadmap'] = $this->seedRoadmap('node-trail');
        $out['prereq'] = $this->seedNode($out['roadmap'], 'p');
        $out['target'] = $this->seedNode($out['roadmap'], 'x', [$out['prereq']]);

        $out['tp'] = $this->seedTask($out['prereq'], 'reading');
        $out['t1'] = $this->seedTask($out['target'], 'reading');
        $out['t2'] = $this->seedTask(
            $out['target'],
            'quiz',
            20,
            true,
            ['questions' => [[
                'id' => 'q1',
                'prompt' => 'Pick one',
                'options' => ['A', 'B'],
                'correct_index' => 0,
                'explanation' => 'SECRET-NODE-EXPLANATION',
            ]]],
        );
        $out['t3'] = $this->seedTask($out['target'], 'practice', 5, false); // optional
    }

    public function testGuestGetsTasksWithoutCompletionState(): void
    {
        $fixture = [];
        $this->seedNodeWithPrereq($fixture);

        $response = $this->call('GET', '/api/v1/nodes/' . $fixture['target']);

        self::assertSame(200, $response->getStatusCode());
        $body = $this->body($response);

        self::assertSame('x', $body['node']['slug']);
        self::assertSame('node-trail', $body['node']['roadmap_slug']);
        self::assertNull($body['node']['state']);
        self::assertSame([$fixture['prereq']], $body['node']['prerequisite_ids']);
        self::assertCount(3, $body['tasks']);
        foreach ($body['tasks'] as $task) {
            self::assertFalse($task['completed']);
        }
    }

    public function testAuthedGetsStateAndCompletionFlags(): void
    {
        $fixture = [];
        $this->seedNodeWithPrereq($fixture);

        $user = $this->seedUser();
        $this->markCompleted($user['id'], [$fixture['tp'], $fixture['t1']]);

        $response = $this->call(
            'GET',
            '/api/v1/nodes/' . $fixture['target'],
            null,
            $this->bearer($this->issueAccessToken($user['id'])),
        );

        self::assertSame(200, $response->getStatusCode());
        $body = $this->body($response);

        // 1 of 2 required tasks done, prereq p fully done.
        self::assertSame('in_progress', $body['node']['state']);
        self::assertSame(1, $body['node']['completed_tasks']);
        self::assertSame(2, $body['node']['total_tasks'], 'required tasks only');

        $flags = [];
        foreach ($body['tasks'] as $task) {
            $flags[$task['id']] = $task['completed'];
        }
        self::assertTrue($flags[$fixture['t1']]);
        self::assertFalse($flags[$fixture['t2']]);
        self::assertFalse($flags[$fixture['t3']]);
    }

    public function testQuizAnswersAreNeverSent(): void
    {
        $fixture = [];
        $this->seedNodeWithPrereq($fixture);

        $response = $this->call('GET', '/api/v1/nodes/' . $fixture['target']);

        self::assertSame(200, $response->getStatusCode());
        $raw = (string) $response->getBody();

        self::assertStringNotContainsString('correct_index', $raw);
        self::assertStringNotContainsString('SECRET-NODE-EXPLANATION', $raw);
    }

    public function testUnknownNodeReturns404(): void
    {
        $response = $this->call('GET', '/api/v1/nodes/00000000-0000-0000-0000-000000000000');

        self::assertSame(404, $response->getStatusCode());
    }

    public function testNodeUnderUnpublishedRoadmapReturns404(): void
    {
        $roadmapId = $this->seedRoadmap('hidden-node-trail', false);
        $nodeId = $this->seedNode($roadmapId, 'ghost');

        $response = $this->call('GET', '/api/v1/nodes/' . $nodeId);

        self::assertSame(404, $response->getStatusCode());
    }
}
