<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

use CareerCampus\Auth\JwtService;
use CareerCampus\Config\AppFactory;
use CareerCampus\Config\Settings;
use CareerCampus\Support\Clock;
use CareerCampus\Support\SystemClock;
use DI\ContainerBuilder;
use Monolog\Handler\NullHandler;
use Monolog\Logger;
use PDO;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerInterface;
use Slim\App;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

/**
 * Builds the production Slim app via AppFactory — the exact middleware chain
 * the real server uses — backed by the fresh Postgres test database created
 * in tests/bootstrap.php (spec §11). Every test starts from truncated
 * auth tables and an empty rate-limit dir.
 */
abstract class AppTestCase extends TestCase
{
    protected App $app;
    protected PDO $db;

    protected function setUp(): void
    {
        parent::setUp();

        $this->db = self::connect();
        $this->app = AppFactory::create(self::buildContainer($this->db));

        $this->db->exec('TRUNCATE users, refresh_tokens RESTART IDENTITY CASCADE');
        self::clearRateLimitDir();
    }

    private static function connect(): PDO
    {
        $settings = Settings::fromEnv();

        return new PDO(
            sprintf('pgsql:host=%s;port=%d;dbname=%s', $settings->dbHost, $settings->dbPort, $settings->dbName),
            $settings->dbUser,
            $settings->dbPassword,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
    }

    private static function buildContainer(PDO $db): ContainerInterface
    {
        $builder = new ContainerBuilder();
        $builder->useAutowiring(true);
        $builder->addDefinitions([
            Settings::class => static fn (): Settings => Settings::fromEnv(),
            LoggerInterface::class => static fn (): LoggerInterface => new Logger('test', [new NullHandler()]),
            PDO::class => $db,
            // php-di 8: a plain class-string value is a LITERAL string
            // (ValueDefinition), not an instantiation — bind with a closure.
            Clock::class => static fn (): Clock => new SystemClock(),
        ]);

        return $builder->build();
    }

    private static function clearRateLimitDir(): void
    {
        foreach (glob(Settings::fromEnv()->rateLimitDir . '/*') ?: [] as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
    }

    // ---- request helpers --------------------------------------------------

    /**
     * @param array<string, mixed>|null $json JSON body (null = no body)
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     */
    protected function call(string $method, string $path, ?array $json = null, array $headers = [], array $cookies = []): ResponseInterface
    {
        $request = (new ServerRequestFactory())->createServerRequest($method, $path);

        foreach ($headers as $name => $value) {
            $request = $request->withHeader($name, $value);
        }

        // slim/psr7 1.8: getCookieParams() never parses the Cookie header,
        // so cookie params must be set explicitly. (In production PHP-FPM
        // populates them from $_COOKIE via createFromGlobals().)
        if ($cookies !== []) {
            $request = $request->withCookieParams($cookies);
        }

        if ($json !== null) {
            $request = $request
                ->withBody((new StreamFactory())->createStream((string) json_encode($json, JSON_THROW_ON_ERROR)))
                ->withHeader('Content-Type', 'application/json');
        }

        return $this->app->handle($request);
    }

    /** @return array<string, mixed> */
    protected function body(ResponseInterface $response): array
    {
        $decoded = json_decode((string) $response->getBody(), true);

        return is_array($decoded) ? $decoded : [];
    }

    /** Raw value of the given Set-Cookie (null when the header is absent). */
    protected function cookieValue(ResponseInterface $response, string $name): ?string
    {
        foreach ($response->getHeader('Set-Cookie') as $header) {
            if (str_starts_with($header, $name . '=')) {
                $value = explode(';', substr($header, strlen($name) + 1), 2)[0] ?? '';

                return $value === '' ? null : $value;
            }
        }

        return null;
    }

    /** @return array<string, string> */
    protected function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer ' . $token];
    }

    // ---- seeding helpers ---------------------------------------------------

    /**
     * Inserts a user directly (bypassing registration) and returns the row.
     *
     * @return array<string, mixed>
     */
    protected function seedUser(
        string $email = 'learner@example.com',
        string $role = 'learner',
        int $totalXp = 0,
    ): array {
        $stmt = $this->db->prepare(
            'INSERT INTO users (email, password_hash, display_name, role, total_xp)
             VALUES (:email, :hash, :display_name, :role, :total_xp)
             RETURNING *'
        );
        $stmt->execute([
            'email' => $email,
            'hash' => password_hash('seed-password-123', PASSWORD_ARGON2ID),
            'display_name' => 'Seeded Learner',
            'role' => $role,
            'total_xp' => $totalXp,
        ]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : [];
    }

    /** Issues a valid access token for the given user id. */
    protected function issueAccessToken(string $userId): string
    {
        return (new JwtService(Settings::fromEnv(), new SystemClock()))->issue($userId);
    }

    /**
     * Inserts a live refresh token for the user and returns the RAW token
     * (tests resend it as the cookie, exactly like a browser would).
     */
    protected function seedRefreshToken(string $userId, int $ttlDays = 30): string
    {
        $token = bin2hex(random_bytes(32));
        $stmt = $this->db->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :hash, now() + make_interval(days => :days))'
        );
        $stmt->execute([
            'user_id' => $userId,
            'hash' => hash('sha256', $token),
            'days' => $ttlDays,
        ]);

        return $token;
    }
}
