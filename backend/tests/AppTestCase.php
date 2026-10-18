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

        $this->db = $this->createDb();
        $this->app = AppFactory::create(self::buildContainer($this->db));

        $this->db->exec(
            'TRUNCATE users, refresh_tokens, roadmaps, nodes, node_prerequisites, '
            . 'tasks, task_completions, enrollments RESTART IDENTITY CASCADE'
        );
        self::clearRateLimitDir();
    }

    /**
     * Test seam: subclasses may return a wrapped PDO (e.g. a query counter)
     * that is used for BOTH the app container and $this->db.
     */
    protected function createDb(): PDO
    {
        return self::connect();
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

    // ---- Phase 2 content helpers -------------------------------------------

    /** Inserts a roadmap directly and returns its id. */
    protected function seedRoadmap(string $slug = 'test-roadmap', bool $published = true): string
    {
        $stmt = $this->db->prepare(
            'INSERT INTO roadmaps (slug, title, summary, is_published, theme)
             VALUES (:slug, :title, :summary, :published, :theme)
             RETURNING id'
        );
        $stmt->execute([
            'slug' => $slug,
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'summary' => 'Test roadmap',
            'published' => (int) $published,
            'theme' => '{"tint":"ember","landmarks":["library"]}',
        ]);

        return (string) $stmt->fetchColumn();
    }

    /**
     * Inserts a node (and its prerequisite edges) and returns its id.
     *
     * @param list<string> $prerequisiteIds
     */
    protected function seedNode(string $roadmapId, string $slug, array $prerequisiteIds = []): string
    {
        $count = $this->db->prepare('SELECT count(*) FROM nodes WHERE roadmap_id = ?');
        $count->execute([$roadmapId]);
        $sort = (int) $count->fetchColumn();

        $stmt = $this->db->prepare(
            'INSERT INTO nodes (roadmap_id, slug, title, landmark, pos_x, pos_y, sort_order)
             VALUES (:roadmap_id, :slug, :title, :landmark, :pos_x, :pos_y, :sort_order)
             RETURNING id'
        );
        $stmt->execute([
            'roadmap_id' => $roadmapId,
            'slug' => $slug,
            'title' => ucfirst($slug),
            'landmark' => 'library',
            'pos_x' => 0,
            'pos_y' => 0,
            'sort_order' => $sort,
        ]);
        $id = (string) $stmt->fetchColumn();

        $edge = $this->db->prepare(
            'INSERT INTO node_prerequisites (node_id, prerequisite_id) VALUES (:node_id, :prerequisite_id)'
        );
        foreach ($prerequisiteIds as $prerequisiteId) {
            $edge->execute(['node_id' => $id, 'prerequisite_id' => $prerequisiteId]);
        }

        return $id;
    }

    /**
     * Inserts a task and returns its id.
     *
     * @param array<string, mixed>|null $quiz quiz json (quiz tasks only)
     */
    protected function seedTask(
        string $nodeId,
        string $type = 'reading',
        int $xp = 10,
        bool $required = true,
        ?array $quiz = null,
    ): string {
        $count = $this->db->prepare('SELECT count(*) FROM tasks WHERE node_id = ?');
        $count->execute([$nodeId]);
        $sort = (int) $count->fetchColumn();

        $stmt = $this->db->prepare(
            'INSERT INTO tasks (node_id, type, title, xp, is_required, sort_order, quiz)
             VALUES (:node_id, :type, :title, :xp, :required, :sort_order, :quiz)
             RETURNING id'
        );
        $stmt->execute([
            'node_id' => $nodeId,
            'type' => $type,
            'title' => 'Task ' . ($sort + 1),
            'xp' => $xp,
            'required' => (int) $required,
            'sort_order' => $sort,
            'quiz' => $quiz === null ? null : json_encode($quiz, JSON_THROW_ON_ERROR),
        ]);

        return (string) $stmt->fetchColumn();
    }

    /**
     * Records task completions for a user (idempotent).
     *
     * @param list<string> $taskIds
     */
    protected function markCompleted(string $userId, array $taskIds): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO task_completions (user_id, task_id) VALUES (:user_id, :task_id)
             ON CONFLICT (user_id, task_id) DO NOTHING'
        );
        foreach ($taskIds as $taskId) {
            $stmt->execute(['user_id' => $userId, 'task_id' => $taskId]);
        }
    }

    /**
     * Enrolls a user in a roadmap (Phase 3 builds the endpoint; tests insert
     * directly so read endpoints can be verified against real enrollments).
     */
    protected function enroll(string $userId, string $roadmapId): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO enrollments (user_id, roadmap_id) VALUES (:user_id, :roadmap_id)
             ON CONFLICT (user_id, roadmap_id) DO NOTHING'
        );
        $stmt->execute(['user_id' => $userId, 'roadmap_id' => $roadmapId]);
    }
}
