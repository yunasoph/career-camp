<?php

declare(strict_types=1);

namespace CareerCampus\Http\Controllers;

use CareerCampus\Config\Settings;
use CareerCampus\Service\AuthService;
use CareerCampus\Support\ApiException;
use DateTimeImmutable;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * POST /auth/register | /auth/login | /auth/refresh | /auth/logout
 *
 * The access token goes in the JSON body (client keeps it in memory only,
 * spec §9.3); the refresh token goes in an httpOnly cookie (spec §7).
 */
final class AuthController
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly Settings $settings,
    ) {
    }

    public function register(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return $this->session($response, 201, $this->auth->register($this->body($request)));
    }

    public function login(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return $this->session($response, 200, $this->auth->login($this->body($request)));
    }

    public function refresh(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $token = $this->refreshToken($request);
        if ($token === null) {
            throw new ApiException(401, 'invalid_refresh', 'Refresh cookie is missing.');
        }

        return $this->session($response, 200, $this->auth->refresh($token));
    }

    /** Idempotent: a missing cookie simply clears nothing. */
    public function logout(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $token = $this->refreshToken($request);
        if ($token !== null) {
            $this->auth->logout($token);
        }

        return $response
            ->withAddedHeader('Set-Cookie', $this->cookie('', time() - 3600))
            ->withStatus(204);
    }

    /**
     * @param array{user: array<string, mixed>, access_token: string, refresh_token: string, refresh_expires_at: DateTimeImmutable} $result
     */
    private function session(ResponseInterface $response, int $status, array $result): ResponseInterface
    {
        $response->getBody()->write((string) json_encode([
            'user' => $result['user'],
            'access_token' => $result['access_token'],
        ], JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status)
            ->withAddedHeader(
                'Set-Cookie',
                $this->cookie($result['refresh_token'], $result['refresh_expires_at']->getTimestamp()),
            );
    }

    /** @return array<string, mixed> */
    private function body(ServerRequestInterface $request): array
    {
        $parsed = $request->getParsedBody();

        return is_array($parsed) ? $parsed : [];
    }

    private function refreshToken(ServerRequestInterface $request): ?string
    {
        $value = $request->getCookieParams()[$this->settings->refreshCookieName] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    /** Builds the httpOnly refresh-cookie header (Secure only in production). */
    private function cookie(string $value, int $expires): string
    {
        $parts = [
            $this->settings->refreshCookieName . '=' . rawurlencode($value),
            'Path=/api/v1',
            'HttpOnly',
            'SameSite=Lax',
            'Max-Age=' . max(0, $expires - time()),
            'Expires=' . gmdate('D, d M Y H:i:s', $expires) . ' GMT',
        ];
        if ($this->settings->isProduction()) {
            $parts[] = 'Secure';
        }

        return implode('; ', $parts);
    }
}
