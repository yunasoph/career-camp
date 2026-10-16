<?php

declare(strict_types=1);

namespace CareerCampus\Config;

use CareerCampus\Http\Middleware\CorsMiddleware;
use CareerCampus\Http\Middleware\ErrorHandlerMiddleware;
use CareerCampus\Http\Middleware\JsonBodyMiddleware;
use CareerCampus\Support\Clock;
use CareerCampus\Support\SystemClock;
use DI\ContainerBuilder;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use PDO;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Slim\App;
use Slim\Psr7\Factory\ResponseFactory;

final class Container
{
    public static function create(string $projectRoot): ContainerInterface
    {
        Env::load($projectRoot);

        $builder = new ContainerBuilder();
        $builder->useAutowiring(true);
        $builder->addDefinitions([
            Settings::class => static fn (): Settings => Settings::fromEnv(),
            LoggerInterface::class => static function (): LoggerInterface {
                $settings = Settings::fromEnv();

                return new Logger('careercampus', [
                    new StreamHandler('php://stdout', $settings->isProduction() ? Level::Warning : Level::Debug),
                ]);
            },
            PDO::class => static function (): PDO {
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
            },
            Clock::class => SystemClock::class,
            App::class => static function (ContainerInterface $c): App {
                // slim/slim 4.15+: App takes a PSR-17 ResponseFactory first, then the container.
                $app = new App(new ResponseFactory(), $c);
                // Order matters: Cors is outermost (handles preflight before
                // anything else), ErrorHandler next (uniform envelope), then body parsing.
                $app->add($c->get(CorsMiddleware::class));
                $app->add($c->get(ErrorHandlerMiddleware::class));
                $app->add($c->get(JsonBodyMiddleware::class));
                Routes::register($app, $c);

                return $app;
            },
        ]);

        return $builder->build();
    }
}
