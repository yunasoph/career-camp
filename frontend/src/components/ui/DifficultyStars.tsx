import { PixelSprite } from '@/art/PixelSprite';
import { STAR } from '@/art/sprites/icons';
import type { RoadmapDifficulty } from '@/api/types';

const STARS: Record<RoadmapDifficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Difficulty as pixel stars — 1 beginner … 3 advanced (spec §9A). */
export function DifficultyStars({ difficulty }: { difficulty: RoadmapDifficulty }): JSX.Element {
    return (
        <span
            className="inline-flex items-center gap-0.5"
            role="img"
            aria-label={`Difficulty: ${difficulty}`}
        >
            {Array.from({ length: STARS[difficulty] }, (_, i) => (
                <PixelSprite key={i} sprite={STAR} scale={1} />
            ))}
        </span>
    );
}
