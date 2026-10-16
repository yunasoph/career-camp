<?php

declare(strict_types=1);

use CareerCampus\Migrations\Runner;

require __DIR__ . '/../vendor/autoload.php';

/**
 * Test bootstrap (spec §11): PHPUnit runs against a FRESH Postgres test
 * database — dropped, recreated and migrated once per run. Real environment
 * variables always win; the values below are fallbacks.
 */
$env = static function (string $key, string $default): string {
    $value = getenv($key);

    return ($value === false || $value === '') ? $default : $value;
};

// Force test values the app under test must see (Env::string reads $_ENV first).
$setEnv = static function (string $key, string $value): void {
    $_ENV[$key] = $value;
    putenv($key . '=' . $value);
};

$dbHost = $env('DB_HOST', '127.0.0.1');
$dbPort = $env('DB_PORT', '5432');
$dbUser = $env('DB_USER', 'careercampus');
$dbPassword = $env('DB_PASSWORD', 'careercampus');
$testDbName = $env('TEST_DB_NAME', 'careercampus_test');

if (!preg_match('/^[a-z_][a-z0-9_]*$/i', $testDbName)) {
    fwrite(STDERR, "Invalid TEST_DB_NAME: {$testDbName}" . PHP_EOL);
    exit(1);
}

// 1) Fresh test database per run. DROP/CREATE must target the `postgres`
//    maintenance DB (Databases cannot be dropped while connected to them).
$maintenance = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=postgres', $dbHost, $dbPort),
    $dbUser,
    $dbPassword,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
$maintenance->exec('DROP DATABASE IF EXISTS ' . $testDbName . ' WITH (FORCE)');
$maintenance->exec('CREATE DATABASE ' . $testDbName);

$setEnv('APP_ENV', 'test');
$setEnv('DB_NAME', $testDbName);
$setEnv('JWT_SECRET', $env('JWT_SECRET', 'test-secret-not-for-production'));
$setEnv('FRONTEND_ORIGIN', $env('FRONTEND_ORIGIN', 'http://localhost:5173'));

// 2) Rate limiter runs in a unique temp dir so limits never leak between
//    runs (or onto the dev server). Per-test clearing happens in AppTestCase.
$rateLimitDir = sys_get_temp_dir() . '/careercampus-rate-limit-' . getmypid();
if (!is_dir($rateLimitDir) && !mkdir($rateLimitDir, 0777, true)) {
    fwrite(STDERR, 'Cannot create rate-limit dir: ' . $rateLimitDir . PHP_EOL);
    exit(1);
}
$setEnv('RATE_LIMIT_DIR', $rateLimitDir);

// 3) Migrate the fresh database with the production runner.
$testDb = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=%s', $dbHost, $dbPort, $testDbName),
    $dbUser,
    $dbPassword,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);

try {
    Runner::run($testDb, __DIR__ . '/../migrations');
} catch (Throwable $e) {
    fwrite(STDERR, 'Test database migration failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
