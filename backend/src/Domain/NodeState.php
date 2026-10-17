<?php

declare(strict_types=1);

namespace CareerCampus\Domain;

/**
 * Computed node states (spec §4). Computed per user, never stored.
 * Guests receive `null` from the API (frontend renders a neutral preview).
 */
enum NodeState: string
{
    case Locked = 'locked';
    case Available = 'available';
    case InProgress = 'in_progress';
    case Completed = 'completed';
}
