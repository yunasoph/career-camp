<?php

declare(strict_types=1);

namespace CareerCampus\Http\Controllers;

use CareerCampus\Service\RoadmapService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * GET /roadmaps + GET /roadmaps/{slug} — public, personalised when a
 * valid Bearer token is present (OptionalAuthMiddleware sets user_id).
 */
final class RoadmapController
{
    public function __construct(private readonly RoadmapService $roadmaps)
    {
    }

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $roadmaps = $this->roadmaps->listFor($this->userId($request));

        return $this->json($response, 200, ['roadmaps' => $roadmaps]);
    }

    public function show(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $slug = (string) $request->getAttribute('slug');
        $detail = $this->roadmaps->detailFor($slug, $this->userId($request));

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
