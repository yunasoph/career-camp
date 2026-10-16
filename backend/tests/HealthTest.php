<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

use Slim\Psr7\Factory\ServerRequestFactory;

final class HealthTest extends AppTestCase
{
    public function test_health_reports_ok_when_db_reachable(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/health');
        $response = $this->app->handle($request);

        self::assertSame(200, $response->getStatusCode());
        self::assertSame('application/json', $response->getHeaderLine('Content-Type'));
        self::assertJsonStringEqualsJsonString('{"ok":true,"db":true}', (string) $response->getBody());
    }

    public function test_unknown_route_returns_error_envelope(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/nope');
        $response = $this->app->handle($request);

        self::assertSame(404, $response->getStatusCode());
        $payload = json_decode((string) $response->getBody(), true);
        self::assertSame('not_found', $payload['error']['code'] ?? null);
        self::assertArrayHasKey('message', $payload['error'] ?? []);
    }

    public function test_cors_preflight_for_allowed_origin(): void
    {
        $request = (new ServerRequestFactory())
            ->createServerRequest('OPTIONS', '/api/v1/health')
            ->withHeader('Origin', 'http://localhost:5173');
        $response = $this->app->handle($request);

        self::assertSame(204, $response->getStatusCode());
        self::assertSame('http://localhost:5173', $response->getHeaderLine('Access-Control-Allow-Origin'));
        self::assertSame('true', $response->getHeaderLine('Access-Control-Allow-Credentials'));
    }

    public function test_cors_headers_absent_for_other_origins(): void
    {
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/health')
            ->withHeader('Origin', 'https://evil.example');
        $response = $this->app->handle($request);

        self::assertSame('', $response->getHeaderLine('Access-Control-Allow-Origin'));
    }
}
