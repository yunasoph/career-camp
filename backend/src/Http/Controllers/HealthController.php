<?php

declare(strict_types=1);

namespace CareerCampus\Http\Controllers;

use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

final class HealthController
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function __invoke(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $db = true;
        try {
            $this->db->query('SELECT 1')->fetchColumn();
        } catch (Throwable) {
            $db = false;
        }

        $response->getBody()->write((string) json_encode(['ok' => $db, 'db' => $db], JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($db ? 200 : 503);
    }
}
