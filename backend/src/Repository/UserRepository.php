<?php

declare(strict_types=1);

namespace CareerCampus\Repository;

use PDO;
use RuntimeException;

/**
 * `users` table access. Rows come back as associative arrays (PDO::FETCH_ASSOC);
 * password_hash is only ever read by PasswordService, never returned to clients
 * (see AuthService::publicUser).
 */
final class UserRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<string, mixed>|null */
    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    public function findByEmail(string $email): ?array
    {
        // email is citext: lookups are case-insensitive in Postgres.
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    public function emailExists(string $email): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM users WHERE email = ?');
        $stmt->execute([$email]);

        return $stmt->fetchColumn() !== false;
    }

    /** @return array<string, mixed> the inserted row */
    public function create(string $email, string $passwordHash, string $displayName): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (email, password_hash, display_name)
             VALUES (:email, :hash, :display_name)
             RETURNING *'
        );
        $stmt->execute([
            'email' => $email,
            'hash' => $passwordHash,
            'display_name' => $displayName,
        ]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : throw new RuntimeException('Failed to create user row.');
    }

    public function roleOf(string $id): ?string
    {
        $stmt = $this->db->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $role = $stmt->fetchColumn();

        return $role === false ? null : (string) $role;
    }

    /**
     * Updates the given profile fields and bumps updated_at.
     *
     * @param array{display_name?: string, avatar_url?: string|null, timezone?: string} $fields
     * @return array<string, mixed>|null the updated row (null when the user vanished)
     */
    public function updateProfile(string $id, array $fields): ?array
    {
        $sets = [];
        $params = ['id' => $id];

        if (array_key_exists('display_name', $fields)) {
            $sets[] = 'display_name = :display_name';
            $params['display_name'] = $fields['display_name'];
        }
        if (array_key_exists('avatar_url', $fields)) {
            $sets[] = 'avatar_url = :avatar_url';
            $params['avatar_url'] = $fields['avatar_url'];
        }
        if (array_key_exists('timezone', $fields)) {
            $sets[] = 'timezone = :timezone';
            $params['timezone'] = $fields['timezone'];
        }

        if ($sets === []) {
            return $this->findById($id);
        }

        $sets[] = 'updated_at = now()';
        $sql = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id RETURNING *';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }
}
