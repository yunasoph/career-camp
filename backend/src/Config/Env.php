<?php

declare(strict_types=1);

namespace CareerCampus\Config;

use Dotenv\Dotenv;

/**
 * Thin, typed accessor over environment variables.
 * Loads the repo-root .env file once (never overriding real env vars).
 */
final class Env
{
    public static function load(string $projectRoot): void
    {
        $envFile = $projectRoot . '/.env';
        if (is_file($envFile)) {
            Dotenv::createImmutable(dirname($envFile))->safeLoad();
        }
    }

    public static function string(string $key, string $default = ''): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : $default;
    }

    public static function int(string $key, int $default): int
    {
        $value = self::string($key, (string) $default);

        return is_numeric($value) ? (int) $value : $default;
    }
}
