<?php

declare(strict_types=1);

namespace CareerCampus\Domain;

/**
 * Per-node facts the state resolver needs (spec §4). Only REQUIRED tasks
 * count toward node completion; optional tasks are tracked by the caller,
 * not here.
 *
 * @readonly
 */
final class NodeFacts
{
    /**
     * @param list<string> $prerequisiteIds
     */
    public function __construct(
        public string $id,
        public array $prerequisiteIds = [],
        public int $requiredTaskCount = 0,
        public int $completedRequiredTasks = 0,
    ) {
    }
}
