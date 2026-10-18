<?php

declare(strict_types=1);

namespace CareerCampus\Http\Middleware;

use CareerCampus\Auth\JwtService;
use CareerCampus\Support\ApiException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use UnexpectedValueException;

/**
 * Optional authentication: attaches the `user_id` attribute when a valid
 * Bearer token is present, passes through as a guest otherwise. Used for
 * endpoints that are public but personalised when logged in
 * (spec §7 roadmap reads). A PRESENT but invalid token still 401s — the
 * client's silent-refresh flow (spec §9.3) needs that signal.
 */
final class OptionalAuthMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $header = $request->getHeaderLine('Authorization');
        if ($header === '') {
            return $handler->handle($request);
        }

        if (preg_match('/^Bearer\s+(\S+)$/i', $header, $match) !== 1) {
            throw new ApiException(401, 'unauthenticated', 'Invalid Authorization header.');
        }

        try {
            $claims = $this->jwt->decode((string) $match[1]);
        } catch (UnexpectedValueException) {
            // firebase/php-jwt v7: all JWT errors extend \UnexpectedValueException.
            throw new ApiException(401, 'unauthenticated', 'Invalid or expired access token.');
        }

        $sub = $claims['sub'] ?? null;
        if (!is_string($sub) || $sub === '') {
            throw new ApiException(401, 'unauthenticated', 'Invalid access token.');
        }

        return $handler->handle($request->withAttribute('user_id', $sub));
    }
}
