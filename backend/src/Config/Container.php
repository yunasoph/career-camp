<?php

declare(strict_types=1);

namespace CareerCampus\Config;

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
            // php-di 8: a plain class-string value is a LITERAL string
            // (ValueDefinition), not an instantiation — bind with a closure.
            Clock::class => static fn (): Clock => new SystemClock(),
            App::class => static fn (ContainerInterface $c): App => AppFactory::create($c),
        ]);

        return $builder->build();
    }
}
