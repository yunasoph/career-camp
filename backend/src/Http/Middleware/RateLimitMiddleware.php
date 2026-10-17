<?php

declare(strict_types=1);

namespace CareerCampus\Http\Middleware;

use CareerCampus\Config\Settings;
use CareerCampus\Support\ApiException;
use CareerCampus\Support\Clock;
use CareerCampus\Support\RequestIp;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Sliding-window rate limiter, file-based with flock (spec §7 allows
 * "Postgres- or file-based"). Key = `<group>:<client-ip>`; each allowed
 * request appends its timestamp and entries older than the 60 s window
 * are pruned.
 *
 * Fails OPEN on any filesystem problem — a broken temp dir must never
 * take the whole API down (docs/DECISIONS.md, Phase 1).
 */
final class RateLimitMiddleware implements MiddlewareInterface
{
    private const WINDOW_SECONDS = 60;

    public function __construct(
        private readonly Settings $settings,
        private readonly Clock $clock,
        private readonly string $group = 'auth',
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!$this->withinLimit($this->group . ':' . RequestIp::from($request))) {
            throw new ApiException(429, 'rate_limited', 'Too many requests. Please try again shortly.');
        }

        return $handler->handle($request);
    }

    private function withinLimit(string $key): bool
    {
        $dir = $this->settings->rateLimitDir;
        if (!is_dir($dir) && !@mkdir($dir, 0777, true) && !is_dir($dir)) {
            return true;
        }

        $handle = @fopen($dir . DIRECTORY_SEPARATOR . sha1($key) . '.json', 'c+');
        if ($handle === false) {
            return true;
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return true;
            }

            $now = $this->clock->now()->getTimestamp();
            $raw = stream_get_contents($handle);
            $decoded = ($raw === false || $raw === '') ? null : json_decode($raw, true);

            $hits = [];
            if (is_array($decoded)) {
                foreach ($decoded as $ts) {
                    if (is_int($ts) && $ts > $now - self::WINDOW_SECONDS) {
                        $hits[] = $ts;
                    }
                }
            }

            if (count($hits) >= $this->settings->authRateLimitPerMinute) {
                return false;
            }

            $hits[] = $now;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($hits, JSON_THROW_ON_ERROR));

            return true;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
