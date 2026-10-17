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
 * Resolves `Authorization: Bearer <jwt>` into a `user_id` request attribute
 * for downstream middleware and controllers.
 * Missing header, bad signature, or expired token → 401.
 */
final class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $header = $request->getHeaderLine('Authorization');
        if (preg_match('/^Bearer\s+(\S+)$/i', $header, $match) !== 1) {
            throw new ApiException(401, 'unauthenticated', 'Authentication required.');
        }

        try {
            $claims = $this->jwt->decode((string) $match[1]);
        } catch (UnexpectedValueException) {
            // firebase/php-jwt v7: Expired/BeforeValid/SignatureInvalid all
            // extend \UnexpectedValueException (there is no common base class).
            throw new ApiException(401, 'unauthenticated', 'Invalid or expired access token.');
        }

        $sub = $claims['sub'] ?? null;
        if (!is_string($sub) || $sub === '') {
            throw new ApiException(401, 'unauthenticated', 'Invalid access token.');
        }

        return $handler->handle($request->withAttribute('user_id', $sub));
    }
}
