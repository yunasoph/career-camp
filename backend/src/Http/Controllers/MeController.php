<?php

declare(strict_types=1);

namespace CareerCampus\Http\Controllers;

use CareerCampus\Service\AuthService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use RuntimeException;

/**
 * GET/PATCH /me — mounted behind AuthMiddleware, which sets the `user_id`
 * attribute. Payload shape: { "user": { …profile + gamification… } }.
 */
final class MeController
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function get(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return $this->json($response, 200, ['user' => $this->auth->me($this->userId($request))]);
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $parsed = $request->getParsedBody();

        return $this->json(
            $response,
            200,
            ['user' => $this->auth->updateProfile($this->userId($request), is_array($parsed) ? $parsed : [])],
        );
    }

    private function userId(ServerRequestInterface $request): string
    {
        $id = $request->getAttribute('user_id');

        return is_string($id) && $id !== ''
            ? $id
            : throw new RuntimeException('AuthMiddleware did not set the user_id attribute.');
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
