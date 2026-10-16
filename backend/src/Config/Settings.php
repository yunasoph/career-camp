<?php

declare(strict_types=1);

namespace CareerCampus\Config;

/**
 * Immutable application settings, read from the environment.
 * Never logs or exposes secrets.
 */
final class Settings
{
    public function __construct(
        public readonly string $appEnv,
        public readonly string $dbHost,
        public readonly int $dbPort,
        public readonly string $dbName,
        public readonly string $dbUser,
        public readonly string $dbPassword,
        public readonly string $jwtSecret,
        public readonly string $frontendOrigin,
    ) {
    }

    public static function fromEnv(): self
    {
        return new self(
            appEnv: Env::string('APP_ENV', 'development'),
            dbHost: Env::string('DB_HOST', 'db'),
            dbPort: Env::int('DB_PORT', 5432),
            dbName: Env::string('DB_NAME', 'careercampus'),
            dbUser: Env::string('DB_USER', 'careercampus'),
            dbPassword: Env::string('DB_PASSWORD', 'careercampus'),
            jwtSecret: Env::string('JWT_SECRET', ''),
            frontendOrigin: Env::string('FRONTEND_ORIGIN', 'http://localhost:5173'),
        );
    }

    public function isProduction(): bool
    {
        return $this->appEnv === 'production';
    }
}
