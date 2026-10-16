<?php

declare(strict_types=1);

namespace CareerCampus\Support;

use DomainException;

/**
 * Domain-level HTTP error. Thrown by services/controllers and mapped to the
 * uniform error envelope by ErrorHandlerMiddleware.
 */
final class ApiException extends DomainException
{
    /**
     * @param array<string, mixed> $details
     */
    public function __construct(
        private readonly int $status,
        private readonly string $errorCode,
        string $message,
        private readonly array $details = [],
    ) {
        parent::__construct($message);
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    /** @return array<string, mixed> */
    public function getDetails(): array
    {
        return $this->details;
    }
}
