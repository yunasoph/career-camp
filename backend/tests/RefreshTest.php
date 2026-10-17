<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * POST /auth/refresh — rotation and reuse detection (spec §7 + §11).
 * Tests send the cookie exactly like a browser would.
 */
final class RefreshTest extends AppTestCase
{
    private function refresh(?string $token)
    {
        return $this->call('POST', '/api/v1/auth/refresh', null, [], ['cc_refresh' => $token]);
    }

    public function testRefreshRotatesTheToken(): void
    {
        $user = $this->seedUser('rotating@example.com');
        $t1 = $this->seedRefreshToken((string) $user['id']);

        $r1 = $this->refresh($t1);
        $this->assertSame(200, $r1->getStatusCode());
        $p1 = $this->body($r1);
        $this->assertSame((string) $user['id'], $p1['user']['id']);
        $this->assertIsString($p1['access_token']);

        $t2 = $this->cookieValue($r1, 'cc_refresh');
        $this->assertNotNull($t2);
        $this->assertNotSame($t1, $t2, 'refresh must rotate the token');

        // The rotated chain keeps working.
        $r2 = $this->refresh($t2);
        $this->assertSame(200, $r2->getStatusCode());
        $t3 = $this->cookieValue($r2, 'cc_refresh');
        $this->assertNotNull($t3);
        $this->assertNotSame($t2, $t3);
    }

    public function testReuseOfRotatedTokenRevokesAllOfTheUsersTokens(): void
    {
        $user = $this->seedUser('thief-victim@example.com');
        $userId = (string) $user['id'];
        $t1 = $this->seedRefreshToken($userId); // "stolen" old session
        $t2 = $this->seedRefreshToken($userId); // current live session

        $r = $this->refresh($t1);
        $this->assertSame(200, $r->getStatusCode());
        $t3 = $this->cookieValue($r, 'cc_refresh');
        $this->assertNotNull($t3);

        // Attacker replays the rotated token → reuse detected.
        $replay = $this->refresh($t1);
        $this->assertSame(401, $replay->getStatusCode());
        $this->assertSame('invalid_refresh', $this->body($replay)['error']['code']);

        // The user's CURRENT session (and the fresh token) are revoked too.
        $this->assertSame(401, $this->refresh($t2)->getStatusCode());
        $this->assertSame(401, $this->refresh($t3)->getStatusCode());
    }

    public function testRefreshWithMissingCookieReturns401(): void
    {
        $this->seedUser('no-cookie@example.com');

        $response = $this->call('POST', '/api/v1/auth/refresh');
        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('invalid_refresh', $this->body($response)['error']['code']);
    }

    public function testRefreshWithUnknownTokenReturns401(): void
    {
        $response = $this->refresh(str_repeat('0', 64));
        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('invalid_refresh', $this->body($response)['error']['code']);
    }

    public function testRefreshWithExpiredTokenReturns401(): void
    {
        $user = $this->seedUser('expired@example.com');
        $token = $this->seedRefreshToken((string) $user['id'], -1); // already expired

        $response = $this->refresh($token);
        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('invalid_refresh', $this->body($response)['error']['code']);
    }

    public function testLogoutRevokesTheRefreshToken(): void
    {
        $user = $this->seedUser('signing-out@example.com');
        $token = $this->seedRefreshToken((string) $user['id']);

        $logout = $this->call('POST', '/api/v1/auth/logout', null, [], ['cc_refresh' => $token]);
        $this->assertSame(204, $logout->getStatusCode());

        $this->assertSame(401, $this->refresh($token)->getStatusCode());
    }
}
