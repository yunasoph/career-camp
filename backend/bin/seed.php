#!/usr/bin/env php
<?php

declare(strict_types=1);

use CareerCampus\Config\Env;
use CareerCampus\Config\Settings;

/**
 * Seeds CareerCampus (spec §10): badges, the two roadmaps (Frontend Developer,
 * Data Analyst) and — in non-production environments only — the dev users.
 *
 * Idempotency contract (running twice changes nothing, duplicates nothing):
 *   - badges:   ON CONFLICT (code) DO NOTHING
 *   - roadmaps: upsert by slug — meta fields are refreshed, the node tree is
 *     never touched, so user progress is preserved
 *   - node tree: inserted only when the roadmap has no nodes yet
 *   - users:    ON CONFLICT (email) DO NOTHING (never overwrites a real password)
 */

$root = dirname(__DIR__);

require $root . '/vendor/autoload.php';

Env::load($root);
$settings = Settings::fromEnv();

try {
    $pdo = new PDO(
        sprintf('pgsql:host=%s;port=%d;dbname=%s', $settings->dbHost, $settings->dbPort, $settings->dbName),
        $settings->dbUser,
        $settings->dbPassword,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    );
} catch (PDOException $e) {
    fwrite(STDERR, 'Cannot connect to database: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

try {
    // ------------------------------------------------------------------ badges
    $badges = json_decode((string) file_get_contents($root . '/seeds/badges.json'), true);
    if (!is_array($badges)) {
        throw new RuntimeException('seeds/badges.json is not a JSON array');
    }

    $badgeStmt = $pdo->prepare(
        'INSERT INTO badges (code, name, description, icon, rule)
         VALUES (:code, :name, :description, :icon, :rule)
         ON CONFLICT (code) DO NOTHING'
    );
    foreach ($badges as $badge) {
        $badgeStmt->execute([
            'code' => $badge['code'],
            'name' => $badge['name'],
            'description' => $badge['description'],
            'icon' => $badge['icon'],
            'rule' => json_encode($badge['rule'], JSON_THROW_ON_ERROR),
        ]);
    }
    echo sprintf('Badges: %d upserted by code.' . PHP_EOL, count($badges));

    // --------------------------------------------------------------- roadmaps
    $roadmapFiles = glob($root . '/seeds/roadmaps/*.json') ?: [];
    if ($roadmapFiles === []) {
        throw new RuntimeException('no seed files in seeds/roadmaps/');
    }

    $nodeStmt = $pdo->prepare(
        'INSERT INTO nodes (roadmap_id, slug, title, description, landmark, pos_x, pos_y, sort_order)
         VALUES (:roadmap_id, :slug, :title, :description, :landmark, :pos_x, :pos_y, :sort_order)
         RETURNING id'
    );
    $edgeStmt = $pdo->prepare(
        'INSERT INTO node_prerequisites (node_id, prerequisite_id)
         VALUES (:node_id, :prerequisite_id)
         ON CONFLICT DO NOTHING'
    );
    $taskStmt = $pdo->prepare(
        'INSERT INTO tasks (node_id, type, title, description, resource_url, xp, is_required, sort_order, est_minutes, quiz)
         VALUES (:node_id, :type, :title, :description, :resource_url, :xp, true, :sort_order, :est_minutes, :quiz)'
    );
    $existingCount = $pdo->prepare(
        'SELECT count(*) FROM nodes WHERE roadmap_id = :roadmap_id'
    );

    foreach ($roadmapFiles as $file) {
        $data = json_decode((string) file_get_contents($file), true);
        if (!is_array($data) || !isset($data['slug'], $data['nodes'])) {
            throw new RuntimeException($file . ' is not a valid roadmap seed');
        }

        $upsert = $pdo->prepare(
            'INSERT INTO roadmaps (slug, title, summary, icon, difficulty, est_hours, is_published, theme)
             VALUES (:slug, :title, :summary, :icon, :difficulty, :est_hours, :is_published, :theme)
             ON CONFLICT (slug) DO UPDATE SET
                title        = EXCLUDED.title,
                summary      = EXCLUDED.summary,
                icon         = EXCLUDED.icon,
                difficulty   = EXCLUDED.difficulty,
                est_hours    = EXCLUDED.est_hours,
                is_published = EXCLUDED.is_published,
                theme        = EXCLUDED.theme,
                updated_at   = now()
             RETURNING id'
        );
        $upsert->execute([
            'slug' => $data['slug'],
            'title' => $data['title'],
            'summary' => $data['summary'],
            'icon' => $data['icon'] ?? null,
            'difficulty' => $data['difficulty'] ?? 'beginner',
            'est_hours' => $data['est_hours'] ?? null,
            'is_published' => $data['is_published'] ?? true,
            'theme' => json_encode($data['theme'] ?? new stdClass(), JSON_THROW_ON_ERROR),
        ]);
        $roadmapId = (string) $upsert->fetchColumn();

        $existingCount->execute(['roadmap_id' => $roadmapId]);
        if ((int) $existingCount->fetchColumn() > 0) {
            echo sprintf('Roadmap %s: node tree already present — skipped (progress preserved).' . PHP_EOL, $data['slug']);
            continue;
        }

        $pdo->beginTransaction();
        try {
            $nodeIds = [];
            foreach ($data['nodes'] as $i => $node) {
                $nodeStmt->execute([
                    'roadmap_id' => $roadmapId,
                    'slug' => $node['slug'],
                    'title' => $node['title'],
                    'description' => $node['description'] ?? '',
                    'landmark' => $node['landmark'] ?? 'library',
                    'pos_x' => $node['pos'][0],
                    'pos_y' => $node['pos'][1],
                    'sort_order' => $i,
                ]);
                $nodeIds[$node['slug']] = (string) $nodeStmt->fetchColumn();
            }

            foreach ($data['nodes'] as $node) {
                foreach ($node['prerequisites'] ?? [] as $prerequisite) {
                    if (!isset($nodeIds[$prerequisite])) {
                        throw new RuntimeException(
                            "Roadmap {$data['slug']}: node {$node['slug']} references unknown prerequisite {$prerequisite}"
                        );
                    }
                    $edgeStmt->execute([
                        'node_id' => $nodeIds[$node['slug']],
                        'prerequisite_id' => $nodeIds[$prerequisite],
                    ]);
                }
            }

            $taskCount = 0;
            foreach ($data['nodes'] as $node) {
                foreach ($node['tasks'] as $j => $task) {
                    $taskStmt->execute([
                        'node_id' => $nodeIds[$node['slug']],
                        'type' => $task['type'],
                        'title' => $task['title'],
                        'description' => $task['description'] ?? '',
                        'resource_url' => $task['resource_url'] ?? null,
                        'xp' => $task['xp'],
                        'sort_order' => $j,
                        'est_minutes' => $task['est_minutes'] ?? 15,
                        'quiz' => isset($task['quiz'])
                            ? json_encode($task['quiz'], JSON_THROW_ON_ERROR)
                            : null,
                    ]);
                    $taskCount++;
                }
            }

            $pdo->commit();
            echo sprintf(
                'Roadmap %s: %d nodes, %d tasks inserted.' . PHP_EOL,
                $data['slug'],
                count($data['nodes']),
                $taskCount,
            );
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    // ------------------------------------------------------------------ users
    if ($settings->isProduction()) {
        // Spec §10: the seeder must refuse to create the dev users in production.
        // Content seeding still succeeds; this guard only blocks the dev accounts.
        echo 'APP_ENV=production — dev users NOT created (spec §10).' . PHP_EOL;
    } else {
        $userStmt = $pdo->prepare(
            'INSERT INTO users (email, password_hash, display_name, role)
             VALUES (:email, :hash, :display_name, :role)
             ON CONFLICT (email) DO NOTHING'
        );
        foreach ([
            ['admin@careercampus.test', 'Admin', 'admin'],
            ['learner@careercampus.test', 'Learner', 'learner'],
        ] as [$email, $name, $role]) {
            $userStmt->execute([
                'email' => $email,
                'hash' => password_hash('ChangeMe123!', PASSWORD_ARGON2ID),
                'display_name' => $name,
                'role' => $role,
            ]);
        }
        echo 'Dev users: admin@careercampus.test / learner@careercampus.test (password ChangeMe123!).' . PHP_EOL;
    }
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}

echo 'Done.' . PHP_EOL;
