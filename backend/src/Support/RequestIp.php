<?php

declare(strict_types=1);

namespace CareerCampus\Support;

use Psr\Http\Message\ServerRequestInterface;

/**
 * Client IP extraction for rate limiting.
 *
 * nginx is always in front (dev proxy chain and production), so the first
 * X-Forwarded-For entry is the client. Falls back to REMOTE_ADDR.
 * (docs/DECISIONS.md, Phase 1)
 */
final class RequestIp
{
    public static function from(ServerRequestInterface $request): string
    {
        $forwarded = $request->getHeaderLine('X-Forwarded-For');
        if ($forwarded !== '') {
            $first = trim(explode(',', $forwarded, 2)[0]);
            if ($first !== '') {
                return $first;
            }
        }

        return (string) ($request->getServerParams()['REMOTE_ADDR'] ?? '0.0.0.0');
    }
}
