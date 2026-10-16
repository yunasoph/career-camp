<?php

declare(strict_types=1);

namespace CareerCampus\Migrations;

use PDO;
use RuntimeException;
use Throwable;

/**
 * Idempotent SQL migration runner.
 *
 * Applied files are recorded in `schema_migrations` and each file runs inside a
 * single transaction — Postgres DDL is transactional, so a failed file rolls
 * back cleanly and re-runs are no-ops (see docs/DECISIONS.md, Phase 0).
 */
final class Runner
{
    /**
     * Applies every pending `.sql` file in the directory (sorted by filename).
     *
     * @return list<string> Base names of the files applied by this call.
     */
    public static function run(PDO $db, string $migrationsDir): array
    {
        $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    varchar(255) PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
)');

        $applied = $db->query('SELECT filename FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
        $files = glob($migrationsDir . '/*.sql') ?: [];
        sort($files);

        $pending = array_values(array_filter(
            $files,
            static fn (string $file): bool => !in_array(basename($file), $applied, true),
        ));

        $appliedNow = [];
        foreach ($pending as $file) {
            $name = basename($file);
            $sql = file_get_contents($file);
            if ($sql === false || $sql === '') {
                throw new RuntimeException('Cannot read migration: ' . $file);
            }

            $db->beginTransaction();
            try {
                $db->exec($sql);
                $stmt = $db->prepare('INSERT INTO schema_migrations (filename) VALUES (?)');
                $stmt->execute([$name]);
                $db->commit();
            } catch (Throwable $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                throw new RuntimeException("Migration {$name} failed: " . $e->getMessage(), 0, $e);
            }

            $appliedNow[] = $name;
        }

        return $appliedNow;
    }
}
