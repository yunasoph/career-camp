<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * POST /auth/login (spec §7 + §11).
 */
final class LoginTest extends AppTestCase
{
    public function testLoginReturnsSession(): void
    {
        $user = $this->seedUser('login.learner@example.com');

        $response = $this->call('POST', '/api/v1/auth/login', [
            'email' => 'login.learner@example.com',
            'password' => 'seed-password-123',
        ]);

        $this->assertSame(200, $response->getStatusCode());
        $payload = $this->body($response);
        $this->assertSame('login.learner@example.com', $payload['user']['email']);
        $this->assertSame((string) $user['id'], $payload['user']['id']);
        $this->assertIsString($payload['access_token']);
        $this->assertNotNull($this->cookieValue($response, 'cc_refresh'));
    }

    public function testLoginEmailIsCaseInsensitive(): void
    {
        $this->seedUser('Case.Mixed@example.com');

        $response = $this->call('POST', '/api/v1/auth/login', [
            'email' => 'case.mixed@EXAMPLE.com',
            'password' => 'seed-password-123',
        ]);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testLoginWithWrongPasswordReturns401(): void
    {
        $this->seedUser('locked.learner@example.com');

        $response = $this->call('POST', '/api/v1/auth/login', [
            'email' => 'locked.learner@example.com',
            'password' => 'wrong-password-999',
        ]);

        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('invalid_credentials', $this->body($response)['error']['code']);
    }

    public function testLoginWithUnknownEmailUsesTheSame401Code(): void
    {
        // No user enumeration: unknown email and wrong password must be
        // indistinguishable.
        $response = $this->call('POST', '/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'any-password-123',
        ]);

        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('invalid_credentials', $this->body($response)['error']['code']);
    }

    public function testLoginRejectsEmptyPassword(): void
    {
        $response = $this->call('POST', '/api/v1/auth/login', [
            'email' => 'someone@example.com',
            'password' => '',
        ]);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('validation_failed', $this->body($response)['error']['code']);
    }
}
