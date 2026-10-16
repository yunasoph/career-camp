<?php

declare(strict_types=1);

namespace CareerCampus\Repository;

use DateTimeImmutable;
use PDO;

/**
 * `refresh_tokens` table access. Only SHA-256 hashes of the opaque tokens
 * are stored — the raw value exists solely in the client cookie (spec §7).
 */
final class RefreshTokenRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<string, mixed>|null */
    public function findByHash(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?');
        $stmt->execute([$tokenHash]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    public function create(string $userId, string $tokenHash, DateTimeImmutable $expiresAt): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :hash, :expires_at)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'hash' => $tokenHash,
            // UTC instant with explicit offset so server tz can't skew expiry.
            'expires_at' => $expiresAt->format('Y-m-d H:i:sP'),
        ]);
    }

    public function revoke(string $id): void
    {
        $stmt = $this->db->prepare(
            'UPDATE refresh_tokens SET revoked_at = now() WHERE id = ? AND revoked_at IS NULL'
        );
        $stmt->execute([$id]);
    }

    /** Revokes every live token of the user (reuse-detection recovery, spec §7). */
    public function revokeAllForUser(string $userId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL'
        );
        $stmt->execute([$userId]);
    }

    public function countActiveForUser(string $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL'
        );
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }
}
