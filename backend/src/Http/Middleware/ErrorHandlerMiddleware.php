<?php

declare(strict_types=1);

namespace CareerCampus\Http\Middleware;

use CareerCampus\Config\Settings;
use CareerCampus\Support\ApiException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\Exception\HttpException;
use Slim\Exception\HttpNotFoundException;
use Slim\Psr7\Response;
use Throwable;

/**
 * Maps any thrown exception to the uniform error envelope (spec §7):
 * { "error": { "code": "...", "message": "...", "details": { ... } } }
 * Never leaks stack traces in production.
 */
final class ErrorHandlerMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly Settings $settings,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        try {
            return $handler->handle($request);
        } catch (HttpNotFoundException) {
            return $this->error(404, 'not_found', 'Resource not found.');
        } catch (ApiException $e) {
            return $this->error($e->getStatus(), $e->getErrorCode(), $e->getMessage(), $e->getDetails());
        } catch (HttpException $e) {
            // Slim stores the HTTP status as the exception code (HttpException::getCode()).
            return $this->error($e->getCode(), 'http_error', $e->getMessage());
        } catch (Throwable $e) {
            $this->logger->error('Unhandled exception: ' . $e->getMessage(), [
                'class' => $e::class,
                'path' => $request->getUri()->getPath(),
            ]);

            $message = $this->settings->isProduction() ? 'Internal server error.' : $e->getMessage();

            return $this->error(500, 'internal_error', $message);
        }
    }

    /**
     * @param array<string, mixed> $details
     */
    private function error(int $status, string $code, string $message, array $details = []): ResponseInterface
    {
        $payload = ['error' => ['code' => $code, 'message' => $message]];
        if ($details !== []) {
            $payload['error']['details'] = $details;
        }

        $response = new Response($status);
        $response->getBody()->write((string) json_encode($payload, JSON_THROW_ON_ERROR));

        return $response->withHeader('Content-Type', 'application/json');
    }
}
