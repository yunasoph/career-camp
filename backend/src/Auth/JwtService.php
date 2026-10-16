<?php

declare(strict_types=1);

namespace CareerCampus\Auth;

use CareerCampus\Config\Settings;
use CareerCampus\Support\Clock;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use UnexpectedValueException;

/**
 * HS256 access tokens: `sub` = user id, 15-minute expiry (spec §7).
 * Decoding failures (bad signature, expired, malformed) surface as
 * UnexpectedValueException — firebase/php-jwt v7 throws it and subclasses.
 */
final class JwtService
{
    public function __construct(
        private readonly Settings $settings,
        private readonly Clock $clock,
    ) {
    }

    public function issue(string $userId): string
    {
        $now = $this->clock->now()->getTimestamp();

        return JWT::encode([
            'sub' => $userId,
            'iat' => $now,
            'exp' => $now + $this->settings->accessTokenTtlSeconds,
        ], $this->settings->jwtSecret, 'HS256');
    }

    /**
     * @return array<string, mixed> decoded claims
     *
     * @throws UnexpectedValueException on invalid/expired/malformed tokens
     */
    public function decode(string $token): array
    {
        $decoded = JWT::decode($token, new Key($this->settings->jwtSecret, 'HS256'));

        return (array) $decoded;
    }
}
