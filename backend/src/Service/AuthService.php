<?php

declare(strict_types=1);

namespace CareerCampus\Service;

use CareerCampus\Auth\JwtService;
use CareerCampus\Auth\PasswordService;
use CareerCampus\Auth\RefreshTokenService;
use CareerCampus\Domain\LevelCalculator;
use CareerCampus\Repository\UserRepository;
use CareerCampus\Support\ApiException;
use CareerCampus\Validation\FieldRules;
use DateTimeImmutable;
use PDOException;

/**
 * Orchestrates the auth + account flows (register / login / refresh /
 * logout / me / updateProfile). No SQL here — repositories only.
 * JSON field names follow the spec's snake_case convention.
 */
final class AuthService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly PasswordService $passwords,
        private readonly JwtService $jwt,
        private readonly RefreshTokenService $refreshTokens,
    ) {
    }

    /**
     * POST /auth/register
     *
     * @param array<string, mixed> $data
     * @return array{user: array<string, mixed>, access_token: string, refresh_token: string, refresh_expires_at: DateTimeImmutable}
     *
     * @throws ApiException 422 validation_failed, 409 email_taken
     */
    public function register(array $data): array
    {
        $errors = FieldRules::register($data);
        if ($errors !== []) {
            throw new ApiException(422, 'validation_failed', 'Validation failed.', $errors);
        }

        $email = trim((string) $data['email']);

        if ($this->users->emailExists($email)) {
            throw new ApiException(409, 'email_taken', 'An account with this email already exists.');
        }

        try {
            $user = $this->users->create(
                $email,
                $this->passwords->hash((string) $data['password']),
                trim((string) $data['display_name']),
            );
        } catch (PDOException $e) {
            // The unique index is the real guard; the pre-check above is a fast path.
            if ($e->getCode() === '23505') {
                throw new ApiException(409, 'email_taken', 'An account with this email already exists.');
            }
            throw $e;
        }

        return $this->sessionFor($user);
    }

    /**
     * POST /auth/login
     *
     * @param array<string, mixed> $data
     * @return array{user: array<string, mixed>, access_token: string, refresh_token: string, refresh_expires_at: DateTimeImmutable}
     *
     * @throws ApiException 422 validation_failed, 401 invalid_credentials
     */
    public function login(array $data): array
    {
        $errors = FieldRules::login($data);
        if ($errors !== []) {
            throw new ApiException(422, 'validation_failed', 'Validation failed.', $errors);
        }

        $user = $this->users->findByEmail(trim((string) $data['email']));
        if ($user === null || !$this->passwords->verify((string) $data['password'], (string) $user['password_hash'])) {
            // Same error for unknown email and wrong password (no user enumeration).
            throw new ApiException(401, 'invalid_credentials', 'Invalid email or password.');
        }

        return $this->sessionFor($user);
    }

    /**
     * POST /auth/refresh
     *
     * @return array{user: array<string, mixed>, access_token: string, refresh_token: string, refresh_expires_at: DateTimeImmutable}
     *
     * @throws ApiException 401 invalid_refresh
     */
    public function refresh(string $rawRefreshToken): array
    {
        $rotated = $this->refreshTokens->rotate($rawRefreshToken);

        $user = $this->users->findById($rotated['userId']);
        if ($user === null) {
            throw new ApiException(401, 'invalid_refresh', 'Account no longer exists.');
        }

        return [
            'user' => self::publicUser($user),
            'access_token' => $this->jwt->issue($rotated['userId']),
            'refresh_token' => $rotated['token'],
            'refresh_expires_at' => $rotated['expiresAt'],
        ];
    }

    /** POST /auth/logout — best-effort: a missing cookie simply clears nothing. */
    public function logout(string $rawRefreshToken): void
    {
        $this->refreshTokens->revokeRaw($rawRefreshToken);
    }

    /**
     * GET /me payload (profile + level + streak).
     *
     * @return array<string, mixed>
     *
     * @throws ApiException 401 when the user vanished (token outlived account)
     */
    public function me(string $userId): array
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            throw new ApiException(401, 'unauthenticated', 'User not found.');
        }

        return self::publicUser($user);
    }

    /**
     * PATCH /me
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     *
     * @throws ApiException 422 validation_failed, 404 not_found
     */
    public function updateProfile(string $userId, array $data): array
    {
        $errors = FieldRules::updateProfile($data);
        if ($errors !== []) {
            throw new ApiException(422, 'validation_failed', 'Validation failed.', $errors);
        }

        $fields = [];
        if (array_key_exists('display_name', $data)) {
            $fields['display_name'] = trim((string) $data['display_name']);
        }
        if (array_key_exists('avatar_url', $data)) {
            $fields['avatar_url'] = $data['avatar_url'] === null ? null : (string) $data['avatar_url'];
        }
        if (array_key_exists('timezone', $data)) {
            $fields['timezone'] = (string) $data['timezone'];
        }

        $user = $this->users->updateProfile($userId, $fields);
        if ($user === null) {
            throw new ApiException(404, 'not_found', 'User not found.');
        }

        return self::publicUser($user);
    }

    /**
     * @param array<string, mixed> $row raw users row
     * @return array<string, mixed> client-safe shape (never includes password_hash)
     */
    public static function publicUser(array $row): array
    {
        $xp = (int) $row['total_xp'];
        $level = LevelCalculator::levelFor($xp);

        return [
            'id' => (string) $row['id'],
            'email' => (string) $row['email'],
            'display_name' => (string) $row['display_name'],
            'avatar_url' => $row['avatar_url'] === null ? null : (string) $row['avatar_url'],
            'role' => (string) $row['role'],
            'timezone' => (string) $row['timezone'],
            'total_xp' => $xp,
            'level' => $level,
            'xp_to_next' => LevelCalculator::xpToNext($xp),
            'title' => LevelCalculator::titleFor($level),
            'current_streak' => (int) $row['current_streak'],
            'longest_streak' => (int) $row['longest_streak'],
            'last_active_date' => $row['last_active_date'] === null ? null : (string) $row['last_active_date'],
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array{user: array<string, mixed>, access_token: string, refresh_token: string, refresh_expires_at: DateTimeImmutable}
     */
    private function sessionFor(array $row): array
    {
        $userId = (string) $row['id'];
        $refresh = $this->refreshTokens->issue($userId);

        return [
            'user' => self::publicUser($row),
            'access_token' => $this->jwt->issue($userId),
            'refresh_token' => $refresh['token'],
            'refresh_expires_at' => $refresh['expiresAt'],
        ];
    }
}
