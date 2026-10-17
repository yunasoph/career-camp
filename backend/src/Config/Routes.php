<?php

declare(strict_types=1);

namespace CareerCampus\Config;

use CareerCampus\Http\Controllers\AdminController;
use CareerCampus\Http\Controllers\AuthController;
use CareerCampus\Http\Controllers\HealthController;
use CareerCampus\Http\Controllers\MeController;
use CareerCampus\Http\Middleware\AdminMiddleware;
use CareerCampus\Http\Middleware\AuthMiddleware;
use CareerCampus\Http\Middleware\RateLimitMiddleware;
use Psr\Container\ContainerInterface;
use Slim\App;
use Slim\Interfaces\RouteCollectorProxyInterface;

/**
 * All routes carry the /api/v1 prefix so URLs are identical through
 * nginx, the Vite dev proxy, and in tests (see docs/DECISIONS.md).
 *
 * Slim 4.15 group API: `group($pattern, $callback)` — the callback
 * receives the group's route collector; middleware is attached via
 * `->add()` on the group (LIFO: the LAST one added runs FIRST).
 *
 * The route callbacks are PUBLIC STATIC METHODS, not closures: Slim's
 * CallableResolver::bindToContainer() calls Closure::bindTo() on the
 * callback, which returns null (with a PHP warning) for STATIC closures
 * and crashes the app (observed on Slim 4.15.3).
 */
final class Routes
{
    /**
     * @param App<ContainerInterface> $app
     */
    public static function register(App $app, ContainerInterface $c): void
    {
        $app->get('/api/v1/health', HealthController::class);

        // Auth endpoints — rate limited to 10/min/IP (spec §7).
        $app->group('/api/v1/auth', [self::class, 'authRoutes'])
            ->add($c->get(RateLimitMiddleware::class));

        // Account — authenticated.
        $app->group('/api/v1', [self::class, 'accountRoutes'])
            ->add($c->get(AuthMiddleware::class));

        // Admin — authenticated AND admin role. Middleware is LIFO, so
        // AdminMiddleware is added first and AuthMiddleware ends up
        // outermost, setting the user_id attribute AdminMiddleware checks.
        $app->group('/api/v1/admin', [self::class, 'adminRoutes'])
            ->add($c->get(AdminMiddleware::class))
            ->add($c->get(AuthMiddleware::class));
    }

    /**
     * @param RouteCollectorProxyInterface<ContainerInterface> $routes
     */
    public static function authRoutes(RouteCollectorProxyInterface $routes): void
    {
        $routes->post('/register', [AuthController::class, 'register']);
        $routes->post('/login', [AuthController::class, 'login']);
        $routes->post('/refresh', [AuthController::class, 'refresh']);
        $routes->post('/logout', [AuthController::class, 'logout']);
    }

    /**
     * @param RouteCollectorProxyInterface<ContainerInterface> $routes
     */
    public static function accountRoutes(RouteCollectorProxyInterface $routes): void
    {
        $routes->get('/me', [MeController::class, 'get']);
        $routes->patch('/me', [MeController::class, 'update']);
    }

    /**
     * @param RouteCollectorProxyInterface<ContainerInterface> $routes
     */
    public static function adminRoutes(RouteCollectorProxyInterface $routes): void
    {
        $routes->get('/ping', [AdminController::class, 'ping']);
    }
}
