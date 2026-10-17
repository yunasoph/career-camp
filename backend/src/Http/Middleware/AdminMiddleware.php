<?php

declare(strict_types=1);

namespace CareerCampus\Http\Middleware;

use CareerCampus\Repository\UserRepository;
use CareerCampus\Support\ApiException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Guards admin-only routes: the caller must be authenticated (AuthMiddleware
 * must run first — see Routes.php) and hold the `admin` role, otherwise 403.
 */
final class AdminMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly UserRepository $users)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $userId = $request->getAttribute('user_id');
        if (!is_string($userId) || $userId === '') {
            throw new ApiException(401, 'unauthenticated', 'Authentication required.');
        }

        $role = $this->users->roleOf($userId);
        if ($role !== 'admin') {
            throw new ApiException(403, 'forbidden', 'Admin access required.');
        }

        return $handler->handle($request->withAttribute('role', $role));
    }
}
