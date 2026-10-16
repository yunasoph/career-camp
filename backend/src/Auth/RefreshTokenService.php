<?php

declare(strict_types=1);

namespace CareerCampus\Auth;

use CareerCampus\Config\Settings;
use CareerCampus\Repository\RefreshTokenRepository;
use CareerCampus\Support\ApiException;
use CareerCampus\Support\Clock;
use DateTimeImmutable;

/**
 * Opaque 256-bit refresh tokens, stored as SHA-256 hashes (spec §7).
 * Every successful refresh rotates the token; presenting a revoked token
 * revokes ALL of the user's tokens (reuse detection).
 */
final class RefreshTokenService
{
    public function __construct(
        private readonly RefreshTokenRepository $tokens,
        private readonly Settings $settings,
        private readonly Clock $clock,
    ) {
    }

    /** @return array{token: string, expiresAt: DateTimeImmutable} */
    public function issue(string $userId): array
    {
        $token = bin2hex(random_bytes(32)); // 256-bit opaque value
        $expiresAt = $this->clock->now()->modify('+' . $this->settings->refreshCookieTtlDays . ' days');

        $this->tokens->create($userId, self::hash($token), $expiresAt);

        return ['token' => $token, 'expiresAt' => $expiresAt];
    }

    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Validates and rotates a raw refresh token.
     *
     * @return array{userId: string, token: string, expiresAt: DateTimeImmutable}
     *
     * @throws ApiException 401 invalid_refresh (unknown / expired / reused)
     */
    public function rotate(string $rawToken): array
    {
        $row = $this->tokens->findByHash(self::hash($rawToken));

        if ($row === null) {
            throw new ApiException(401, 'invalid_refresh', 'Refresh token is not recognized.');
        }

        $userId = (string) $row['user_id'];

        if ($row['revoked_at'] !== null) {
            // Reuse of an already-rotated token — assume theft, nuke the family.
            $this->tokens->revokeAllForUser($userId);
            throw new ApiException(401, 'invalid_refresh', 'Refresh token reuse detected; all sessions were revoked.');
        }

        $expiresAt = new DateTimeImmutable((string) $row['expires_at']);
        if ($expiresAt < $this->clock->now()) {
            throw new ApiException(401, 'invalid_refresh', 'Refresh token has expired.');
        }

        $this->tokens->revoke((string) $row['id']);

        $fresh = $this->issue($userId);

        return ['userId' => $userId, 'token' => $fresh['token'], 'expiresAt' => $fresh['expiresAt']];
    }

    /** Best-effort revoke for logout — a missing/unknown token is fine. */
    public function revokeRaw(string $rawToken): void
    {
        $row = $this->tokens->findByHash(self::hash($rawToken));
        if ($row !== null && $row['revoked_at'] === null) {
            $this->tokens->revoke((string) $row['id']);
        }
    }
}
