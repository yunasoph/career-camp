#!/usr/bin/env php
<?php

declare(strict_types=1);

use CareerCampus\Config\Env;
use CareerCampus\Config\Settings;

$root = dirname(__DIR__);

require $root . '/vendor/autoload.php';

Env::load($root);
$settings = Settings::fromEnv();

try {
    $pdo = new PDO(
        sprintf('pgsql:host=%s;port=%d;dbname=%s', $settings->dbHost, $settings->dbPort, $settings->dbName),
        $settings->dbUser,
        $settings->dbPassword,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
} catch (PDOException $e) {
    fwrite(STDERR, 'Cannot connect to database: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

// Migration ledger: records which files have been applied (idempotent runner).
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    varchar(255) PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
)');

$applied = $pdo->query('SELECT filename FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);

$files = glob($root . '/migrations/*.sql') ?: [];
sort($files);

$pending = array_values(array_filter(
    $files,
    static fn (string $file): bool => !in_array(basename($file), $applied, true),
));

if ($pending === []) {
    echo 'No pending migrations.' . PHP_EOL;
    exit(0);
}

foreach ($pending as $file) {
    $name = basename($file);
    $sql = file_get_contents($file);
    if ($sql === false || $sql === '') {
        fwrite(STDERR, "Cannot read migration: {$file}" . PHP_EOL);
        exit(1);
    }

    echo "Applying {$name}..." . PHP_EOL;
    $pdo->beginTransaction();
    try {
        // Postgres DDL is transactional: a failed file rolls back cleanly.
        $pdo->exec($sql);
        $stmt = $pdo->prepare('INSERT INTO schema_migrations (filename) VALUES (?)');
        $stmt->execute([$name]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Migration {$name} failed: " . $e->getMessage() . PHP_EOL);
        exit(1);
    }
    echo "Applied {$name}." . PHP_EOL;
}

echo 'Done.' . PHP_EOL;
