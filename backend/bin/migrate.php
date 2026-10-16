#!/usr/bin/env php
<?php

declare(strict_types=1);

use CareerCampus\Config\Env;
use CareerCampus\Config\Settings;
use CareerCampus\Migrations\Runner;
use PDO;
use PDOException;

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

try {
    $applied = Runner::run($pdo, $root . '/migrations');
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}

if ($applied === []) {
    echo 'No pending migrations.' . PHP_EOL;
    exit(0);
}

foreach ($applied as $name) {
    echo "Applied {$name}." . PHP_EOL;
}

echo 'Done.' . PHP_EOL;
