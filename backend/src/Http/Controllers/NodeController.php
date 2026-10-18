<?php

declare(strict_types=1);

namespace CareerCampus\Http\Controllers;

use CareerCampus\Service\RoadmapService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * GET /nodes/{id} — node detail + tasks with per-task `completed` flags
 * (quiz answers stripped, spec §6.1). Public, personalised when authed.
 */
final class NodeController
{
    public function __construct(private readonly RoadmapService $roadmaps)
    {
    }

    public function show(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $nodeId = (string) $request->getAttribute('id');
        $detail = $this->roadmaps->nodeFor($nodeId, $this->userId($request));

        return $this->json($response, 200, $detail);
    }

    private function userId(ServerRequestInterface $request): ?string
    {
        $id = $request->getAttribute('user_id');

        return is_string($id) && $id !== '' ? $id : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function json(ResponseInterface $response, int $status, array $payload): ResponseInterface
    {
        $response->getBody()->write((string) json_encode($payload, JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
