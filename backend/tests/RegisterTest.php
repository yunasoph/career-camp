<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * POST /auth/register (spec §7 + §11).
 */
final class RegisterTest extends AppTestCase
{
    /** @return array<string, mixed> */
    private function validBody(): array
    {
        return [
            'email' => 'new.learner@example.com',
            'password' => 'sup3r-secret-pass',
            'display_name' => 'New Learner',
        ];
    }

    public function testRegisterCreatesUserAndReturnsSession(): void
    {
        $response = $this->call('POST', '/api/v1/auth/register', $this->validBody());
        $this->assertSame(201, $response->getStatusCode());

        $payload = $this->body($response);
        $user = $payload['user'];
        $this->assertSame('new.learner@example.com', $user['email']);
        $this->assertSame('New Learner', $user['display_name']);
        $this->assertSame('learner', $user['role']);
        $this->assertSame('UTC', $user['timezone']);
        $this->assertSame(0, $user['total_xp']);
        $this->assertSame(1, $user['level']);
        $this->assertSame(50, $user['xp_to_next']);
        $this->assertSame('Freshman', $user['title']);
        $this->assertSame(0, $user['current_streak']);
        $this->assertSame(0, $user['longest_streak']);
        $this->assertArrayNotHasKey('password_hash', $user);

        $this->assertIsString($payload['access_token']);
        $this->assertNotEmpty($payload['access_token']);

        // Register sets the refresh cookie too (DECISIONS.md: reload works
        // immediately after registration).
        $this->assertNotNull(
            $this->cookieValue($response, 'cc_refresh'),
            'refresh cookie must be set on register',
        );
    }

    public function testRegisterPersistsAnArgon2idHash(): void
    {
        $this->call('POST', '/api/v1/auth/register', $this->validBody());

        $stmt = $this->db->prepare('SELECT password_hash FROM users WHERE email = ?');
        $stmt->execute(['new.learner@example.com']);
        $hash = (string) $stmt->fetchColumn();

        $this->assertStringStartsWith('$argon2id$', $hash);
    }

    public function testRegisterWithDuplicateEmailReturns409(): void
    {
        $this->call('POST', '/api/v1/auth/register', $this->validBody());

        $response = $this->call('POST', '/api/v1/auth/register', $this->validBody());
        $this->assertSame(409, $response->getStatusCode());
        $this->assertSame('email_taken', $this->body($response)['error']['code']);
    }

    public function testRegisterRejectsInvalidInputWithFieldDetails(): void
    {
        $response = $this->call('POST', '/api/v1/auth/register', [
            'email' => 'not-an-email',
            'password' => 'short',
            'display_name' => '',
        ]);

        $this->assertSame(422, $response->getStatusCode());
        $payload = $this->body($response);
        $this->assertSame('validation_failed', $payload['error']['code']);
        $this->assertArrayHasKey('email', $payload['error']['details']);
        $this->assertArrayHasKey('password', $payload['error']['details']);
        $this->assertArrayHasKey('display_name', $payload['error']['details']);
    }

    public function testRegisteredUserCanCallMeWithTheReturnedToken(): void
    {
        $response = $this->call('POST', '/api/v1/auth/register', $this->validBody());
        $token = (string) $this->body($response)['access_token'];

        $payload = $this->body($this->call('GET', '/api/v1/me', null, $this->bearer($token)));

        $this->assertSame('new.learner@example.com', $payload['user']['email']);
    }
}
