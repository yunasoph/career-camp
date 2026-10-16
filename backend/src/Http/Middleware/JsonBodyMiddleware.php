<?php

declare(strict_types=1);

namespace CareerCampus\Http\Middleware;

use CareerCampus\Support\ApiException;
use JsonException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Parses application/json request bodies once, up front.
 * Invalid JSON → 400 via the error envelope.
 */
final class JsonBodyMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $raw = (string) $request->getBody();

        if ($raw !== '' && str_starts_with($request->getHeaderLine('Content-Type'), 'application/json')) {
            try {
                $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                throw new ApiException(400, 'invalid_json', 'Request body is not valid JSON.');
            }
            $request = $request->withParsedBody(is_array($decoded) ? $decoded : ['value' => $decoded]);
        }

        return $handler->handle($request);
    }
}
