<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * GET /api/v1/roadmaps (spec §7): published-only list with node/task
 * counts; authed requests additionally get enrolled + percent_complete.
 */
final class RoadmapsListTest extends AppTestCase
{
    public function testGuestSeesOnlyPublishedRoadmaps(): void
    {
        $roadmapId = $this->seedRoadmap('published-path');
        $this->seedRoadmap('hidden-path', false);

        $nodeId = $this->seedNode($roadmapId, 'first');
        $this->seedTask($nodeId, 'reading');
        $this->seedTask($nodeId, 'practice');

        $response = $this->call('GET', '/api/v1/roadmaps');

        self::assertSame(200, $response->getStatusCode());
        $body = $this->body($response);
        self::assertCount(1, $body['roadmaps']);

        $summary = $body['roadmaps'][0];
        self::assertSame('published-path', $summary['slug']);
        self::assertSame(1, $summary['node_count']);
        self::assertSame(2, $summary['task_count']);
        self::assertSame('ember', $summary['theme']['tint']);
        self::assertArrayNotHasKey('enrolled', $summary);
        self::assertArrayNotHasKey('percent_complete', $summary);
    }

    public function testAuthedListIncludesEnrollmentAndProgress(): void
    {
        $user = $this->seedUser();

        $roadmapId = $this->seedRoadmap('published-path');
        $otherId = $this->seedRoadmap('other-path');

        $firstNode = $this->seedNode($roadmapId, 'first');
        $task1 = $this->seedTask($firstNode, 'reading');
        $task2 = $this->seedTask($firstNode, 'practice');
        $extraNode = $this->seedNode($roadmapId, 'extra');
        $this->seedTask($extraNode, 'reading', 10, false); // optional task: excluded from progress

        $otherNode = $this->seedNode($otherId, 'solo');
        $this->seedTask($otherNode, 'reading');

        $this->enroll($user['id'], $roadmapId);
        $this->markCompleted($user['id'], [$task1]);

        $response = $this->call(
            'GET',
            '/api/v1/roadmaps',
            null,
            $this->bearer($this->issueAccessToken($user['id'])),
        );

        self::assertSame(200, $response->getStatusCode());
        $summaries = $this->body($response)['roadmaps'];
        self::assertCount(2, $summaries);

        $mine = null;
        $other = null;
        foreach ($summaries as $summary) {
            if ($summary['slug'] === 'published-path') {
                $mine = $summary;
            }
            if ($summary['slug'] === 'other-path') {
                $other = $summary;
            }
        }

        self::assertNotNull($mine);
        self::assertNotNull($other);
        self::assertTrue($mine['enrolled']);
        self::assertSame(50, $mine['percent_complete'], '1 of 2 REQUIRED tasks done');
        self::assertFalse($other['enrolled']);
        self::assertSame(0, $other['percent_complete']);
    }

    public function testPresentButInvalidBearerTokenIsRejected(): void
    {
        $this->seedRoadmap('published-path');

        $response = $this->call('GET', '/api/v1/roadmaps', null, $this->bearer('garbage'));

        self::assertSame(401, $response->getStatusCode());
    }

    public function testEmptyCatalogReturnsEmptyList(): void
    {
        $response = $this->call('GET', '/api/v1/roadmaps');

        self::assertSame(200, $response->getStatusCode());
        self::assertSame([], $this->body($response)['roadmaps']);
    }
}
