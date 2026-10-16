<?php

declare(strict_types=1);

namespace CareerCampus\Config;

use CareerCampus\Http\Controllers\HealthController;
use Psr\Container\ContainerInterface;
use Slim\App;

final class Routes
{
    /**
     * All routes carry the /api/v1 prefix so URLs are identical through
     * nginx, the Vite dev proxy, and in tests (see docs/DECISIONS.md).
     *
     * @param App<ContainerInterface> $app
     */
    public static function register(App $app, ContainerInterface $c): void
    {
        $app->get('/api/v1/health', HealthController::class);
    }
}
