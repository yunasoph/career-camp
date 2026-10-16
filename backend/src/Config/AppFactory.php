<?php

declare(strict_types=1);

namespace CareerCampus\Config;

use CareerCampus\Http\Middleware\CorsMiddleware;
use CareerCampus\Http\Middleware\ErrorHandlerMiddleware;
use CareerCampus\Http\Middleware\JsonBodyMiddleware;
use Psr\Container\ContainerInterface;
use Slim\App;
use Slim\Psr7\Factory\ResponseFactory;

/**
 * Builds the Slim app with the production middleware chain.
 *
 * Slim middleware is a LIFO stack: the LAST middleware added runs FIRST
 * (outermost). We want the request to flow
 *   Cors → ErrorHandler → JsonBody → routes
 * so that (a) preflight and CORS headers are added to every response,
 * (b) the uniform error envelope wraps exceptions from JsonBody and all
 * route middleware, and (c) the JSON body is parsed last, closest to the
 * controller. Hence the apparent add-order below.
 */
final class AppFactory
{
    /**
     * @param \Psr\Container\ContainerInterface $c
     * @return \Slim\App<\Psr\Container\ContainerInterface>
     */
    public static function create(ContainerInterface $c): App
    {
        $app = new App(new ResponseFactory(), $c);
        $app->add($c->get(JsonBodyMiddleware::class));
        $app->add($c->get(ErrorHandlerMiddleware::class));
        $app->add($c->get(CorsMiddleware::class));
        Routes::register($app, $c);

        return $app;
    }
}
