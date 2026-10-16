<?php

declare(strict_types=1);

namespace CareerCampus\Domain;

/**
 * Level rules (spec §5.3): xp_required_for_level(n) = 50 * (n-1)^2,
 * level(total_xp) = floor(sqrt(total_xp / 50)) + 1. Pure and static so
 * Phase 3 (XP granting) reuses the same boundaries.
 */
final class LevelCalculator
{
    public static function levelFor(int $xp): int
    {
        return (int) floor(sqrt(max(0, $xp) / 50)) + 1;
    }

    /** XP still needed to reach the next level, from the given total. */
    public static function xpToNext(int $xp): int
    {
        $level = self::levelFor($xp);

        return 50 * $level * $level - max(0, $xp);
    }

    /** Display-only title bands (spec §5.3). */
    public static function titleFor(int $level): string
    {
        return match (true) {
            $level < 5 => 'Freshman',
            $level < 10 => 'Sophomore',
            $level < 20 => 'Junior',
            $level < 35 => 'Senior',
            default => 'Graduate',
        };
    }
}
