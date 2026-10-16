<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

// Test environment defaults (real environment variables win when present).
$_ENV['APP_ENV'] ??= 'test';
$_ENV['DB_HOST'] ??= '127.0.0.1';
$_ENV['DB_PORT'] ??= '5432';
$_ENV['DB_NAME'] ??= 'careercampus_test';
$_ENV['DB_USER'] ??= 'careercampus';
$_ENV['DB_PASSWORD'] ??= 'careercampus';
$_ENV['JWT_SECRET'] ??= 'test-secret-not-for-production';
$_ENV['FRONTEND_ORIGIN'] ??= 'http://localhost:5173';
