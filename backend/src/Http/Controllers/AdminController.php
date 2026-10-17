<?php

declare(strict_types=1);

namespace CareerCampus\Http\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Probe route proving the Auth + Admin middleware chain works
 * (docs/DECISIONS.md, Phase 1). Full admin CRUD lands in Phase 5.
 */
final class AdminController
{
    public function ping(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $response->getBody()->write((string) json_encode(['ok' => true], JSON_THROW_ON_ERROR));

        return $response->withHeader('Content-Type', 'application/json');
    }
}
