<?php

declare(strict_types=1);

namespace CareerCampus\Http\Middleware;

use CareerCampus\Config\Settings;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class CorsMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly Settings $settings)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return $this->withCors(new Response(204), $request->getHeaderLine('Origin'));
        }

        $response = $handler->handle($request);

        return $this->withCors($response, $request->getHeaderLine('Origin'));
    }

    private function withCors(ResponseInterface $response, string $origin): ResponseInterface
    {
        // Only the configured origin is allowed, with credentials (spec §7).
        if ($origin === '' || $origin !== $this->settings->frontendOrigin) {
            return $response;
        }

        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withHeader('Vary', 'Origin');
    }
}
