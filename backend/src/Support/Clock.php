<?php

declare(strict_types=1);

namespace CareerCampus\Support;

use DateTimeImmutable;

/**
 * Injectable clock so streak / quest / rusty-node logic is testable (spec §8.4).
 * Instant is UTC; per-user timezone is applied by domain services.
 */
interface Clock
{
    public function now(): DateTimeImmutable;
}
