import { memo } from 'react';

/**
 * Code-generated pixel art (spec §9A.6).
 * A sprite is a palette + rows of single characters ('.' = transparent).
 * Palettes may reference CSS variables so sprites retheme automatically.
 */
export interface SpriteData {
    palette: Record<string, string>;
    rows: string[];
}

interface PixelSpriteProps {
    sprite: SpriteData;
    /** Pixels per sprite cell (integer for crisp edges). */
    scale?: number;
    className?: string;
    /** Accessible label. Omit for decorative sprites (aria-hidden). */
    label?: string;
}

interface RectRun {
    x: number;
    y: number;
    w: number;
    color: string;
}

/** Merge horizontal runs of the same character into single <rect> elements. */
function buildRuns(sprite: SpriteData): RectRun[] {
    const runs: RectRun[] = [];
    sprite.rows.forEach((row, y) => {
        let startX: number | null = null;
        let colorKey = '';
        const flush = (endX: number): void => {
            if (startX !== null && endX > startX) {
                runs.push({ x: startX, y, w: endX - startX, color: sprite.palette[colorKey] ?? 'none' });
            }
            startX = null;
            colorKey = '';
        };
        for (let x = 0; x <= row.length; x++) {
            const ch = x < row.length ? (row[x] ?? '.') : '.';
            if (ch === '.' || !(ch in sprite.palette)) {
                flush(x);
            } else if (ch !== colorKey) {
                flush(x);
                startX = x;
                colorKey = ch;
            }
        }
    });
    return runs;
}

export const PixelSprite = memo(function PixelSprite({
    sprite,
    scale = 3,
    className,
    label,
}: PixelSpriteProps): JSX.Element {
    const width = sprite.rows[0]?.length ?? 0;
    const height = sprite.rows.length;
    const runs = buildRuns(sprite);
    const aria = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width * scale}
            height={height * scale}
            shapeRendering="crispEdges"
            className={className}
            {...aria}
        >
            {runs.map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
            ))}
        </svg>
    );
});
