import type { RoadmapDifficulty } from '@/api/types';

const TONE: Record<RoadmapDifficulty, string> = {
    beginner: 'bg-moss text-paper',
    intermediate: 'bg-marigold text-ink',
    advanced: 'bg-ember text-paper',
};

/** Pixel-font difficulty pill (landing + catalog). */
export function DifficultyPill({ difficulty }: { difficulty: RoadmapDifficulty }): JSX.Element {
    return (
        <span
            className={`shrink-0 rounded-pill px-2.5 py-1 font-pixel text-[10px] uppercase ${TONE[difficulty]}`}
        >
            {difficulty}
        </span>
    );
}
