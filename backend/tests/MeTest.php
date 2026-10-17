<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * GET/PATCH /me (spec §7 + §5.3 level rules).
 */
final class MeTest extends AppTestCase
{
    public function testGetMeWithoutTokenReturns401(): void
    {
        $this->assertSame(401, $this->call('GET', '/api/v1/me')->getStatusCode());
    }

    public function testGetMeWithGarbageTokenReturns401(): void
    {
        $response = $this->call('GET', '/api/v1/me', null, $this->bearer('not-a-jwt'));
        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('unauthenticated', $this->body($response)['error']['code']);
    }

    public function testGetMeReturnsGamifiedProfile(): void
    {
        $user = $this->seedUser('gamer@example.com', 'learner', 200);
        $token = $this->issueAccessToken((string) $user['id']);

        $payload = $this->body($this->call('GET', '/api/v1/me', null, $this->bearer($token)));
        $me = $payload['user'];

        // §5.3: level(200) = floor(sqrt(200/50)) + 1 = 3
        //        xp_to_next = 50 * 3^2 - 200 = 250 (level 4 starts at 450)
        $this->assertSame(200, $me['total_xp']);
        $this->assertSame(3, $me['level']);
        $this->assertSame(250, $me['xp_to_next']);
        $this->assertSame('Freshman', $me['title']); // 1–4 = Freshman
        $this->assertSame(0, $me['current_streak']);
        $this->assertSame(0, $me['longest_streak']);
        $this->assertSame('learner', $me['role']);
        $this->assertSame('UTC', $me['timezone']);
        $this->assertArrayNotHasKey('password_hash', $me);
    }

    public function testPatchMeUpdatesProfileFields(): void
    {
        $user = $this->seedUser('patcher@example.com');
        $token = $this->issueAccessToken((string) $user['id']);

        $response = $this->call('PATCH', '/api/v1/me', [
            'display_name' => 'Patched Name',
            'timezone' => 'Asia/Kolkata',
        ], $this->bearer($token));

        $this->assertSame(200, $response->getStatusCode());
        $me = $this->body($response)['user'];
        $this->assertSame('Patched Name', $me['display_name']);
        $this->assertSame('Asia/Kolkata', $me['timezone']);

        // …and it persisted.
        $stmt = $this->db->prepare('SELECT display_name, timezone FROM users WHERE id = ?');
        $stmt->execute([(string) $user['id']]);
        $row = $stmt->fetch();
        $this->assertSame('Patched Name', $row['display_name']);
        $this->assertSame('Asia/Kolkata', $row['timezone']);
    }

    public function testPatchMeRejectsInvalidTimezone(): void
    {
        $user = $this->seedUser('tz@example.com');
        $token = $this->issueAccessToken((string) $user['id']);

        $response = $this->call('PATCH', '/api/v1/me', ['timezone' => 'Mars/OlympusMons'], $this->bearer($token));
        $this->assertSame(422, $response->getStatusCode());
        $this->assertArrayHasKey('timezone', $this->body($response)['error']['details']);
    }

    public function testPatchMeRejectsEmptyDisplayName(): void
    {
        $user = $this->seedUser('noname@example.com');
        $token = $this->issueAccessToken((string) $user['id']);

        $response = $this->call('PATCH', '/api/v1/me', ['display_name' => ''], $this->bearer($token));
        $this->assertSame(422, $response->getStatusCode());
        $this->assertArrayHasKey('display_name', $this->body($response)['error']['details']);
    }

    public function testPatchMeWithoutTokenReturns401(): void
    {
        $this->assertSame(401, $this->call('PATCH', '/api/v1/me', ['display_name' => 'X'])->getStatusCode());
    }
}
