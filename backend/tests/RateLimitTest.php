<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

/**
 * Rate limiting on auth endpoints: 10 req/min/IP (spec §7).
 * The file-based limiter's dir is unique per test run (tests/bootstrap.php)
 * and cleared between tests (AppTestCase).
 */
final class RateLimitTest extends AppTestCase
{
    /** @return array<string, mixed> */
    private function loginBody(int $i): array
    {
        return [
            'email' => "burst$i@example.com",
            'password' => 'whatever-12345',
        ];
    }

    public function testEleventhAuthRequestWithinAMinuteIsLimited(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            $response = $this->call('POST', '/api/v1/auth/login', $this->loginBody($i));
            $this->assertNotSame(
                429,
                $response->getStatusCode(),
                "request {$i} of 10 must not be rate limited",
            );
        }

        $limited = $this->call('POST', '/api/v1/auth/login', $this->loginBody(11));
        $this->assertSame(429, $limited->getStatusCode());
        $this->assertSame('rate_limited', $this->body($limited)['error']['code']);
    }

    public function testRateLimitIsPerClientIp(): void
    {
        $ipA = ['X-Forwarded-For' => '203.0.113.1'];
        for ($i = 1; $i <= 10; $i++) {
            $this->call('POST', '/api/v1/auth/login', $this->loginBody($i), $ipA);
        }

        $limited = $this->call('POST', '/api/v1/auth/login', $this->loginBody(99), $ipA);
        $this->assertSame(429, $limited->getStatusCode());

        // A different client IP has its own budget.
        $other = $this->call('POST', '/api/v1/auth/login', $this->loginBody(1), ['X-Forwarded-For' => '203.0.113.2']);
        $this->assertNotSame(429, $other->getStatusCode());
    }

    public function testNonAuthRoutesAreNotRateLimited(): void
    {
        // /me sits outside the rate-limited auth group.
        for ($i = 1; $i <= 15; $i++) {
            $response = $this->call('GET', '/api/v1/me');
            $this->assertSame(401, $response->getStatusCode());
        }
    }
}
