<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

use CareerCampus\Config\Routes;
use CareerCampus\Config\Settings;
use CareerCampus\Http\Middleware\CorsMiddleware;
use CareerCampus\Http\Middleware\ErrorHandlerMiddleware;
use CareerCampus\Http\Middleware\JsonBodyMiddleware;
use DI\ContainerBuilder;
use Monolog\Handler\NullHandler;
use Monolog\Logger;
use PDO;
use PHPUnit\Framework\TestCase;
use Slim\App;
use Slim\Psr7\Factory\ResponseFactory;

/**
 * Builds a real Slim app with the production middleware chain, backed by an
 * in-memory SQLite PDO, so smoke tests run without a live Postgres.
 */
abstract class AppTestCase extends TestCase
{
    protected App $app;

    protected function setUp(): void
    {
        parent::setUp();

        $db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        $builder = new ContainerBuilder();
        $builder->useAutowiring(true);
        $builder->addDefinitions([PDO::class => $db]);
        $container = $builder->build();

        $this->app = new App(new ResponseFactory(), $container);
        $this->app->add(new CorsMiddleware(Settings::fromEnv()));
        $this->app->add(new ErrorHandlerMiddleware(new Logger('test', [new NullHandler()]), Settings::fromEnv()));
        $this->app->add(new JsonBodyMiddleware());
        Routes::register($this->app, $container);
    }
}
