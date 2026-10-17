<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * Admin route guard (spec §7: admin routes reject learners with 403).
 * Uses the GET /api/v1/admin/ping probe (DECISIONS.md, Phase 1).
 */
final class AdminGuardTest extends AppTestCase
{
    public function testLearnerGets403OnAdminRoute(): void
    {
        $user = $this->seedUser('pleb@example.com', 'learner');
        $response = $this->call('GET', '/api/v1/admin/ping', null, $this->bearer($this->issueAccessToken((string) $user['id'])));

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('forbidden', $this->body($response)['error']['code']);
    }

    public function testAdminGets200OnAdminRoute(): void
    {
        $user = $this->seedUser('boss@example.com', 'admin');
        $response = $this->call('GET', '/api/v1/admin/ping', null, $this->bearer($this->issueAccessToken((string) $user['id'])));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($this->body($response)['ok']);
    }

    public function testUnauthenticatedRequestGets401OnAdminRoute(): void
    {
        $response = $this->call('GET', '/api/v1/admin/ping');
        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('unauthenticated', $this->body($response)['error']['code']);
    }
}
