import { BISCUIT_WAVE_A } from './sprites/biscuit';
import { CLOUD, FIREFLY, FLOWER, FOG_PUFF, SIGNPOST, SPROUT, TREE, scatteredStars } from './sprites/nature';
import { LANDMARKS } from './sprites/landmarks';
import type { SpriteData } from './PixelSprite';

/**
 * Procedural campus panorama (spec §9A.10) — three parallax layers built
 * deterministically from a fixed seed per variant (pitfall: per-render
 * randomness would break screenshots and visual stability).
 *
 * Layer contents:
 *   far  — sky elements (sun+glow or moon+stars), clouds/fog, farthest hills
 *   mid  — closer hills + 3–4 landmark sprites (dusk = lit windows)
 *   near — nearest hill, stepped dirt trail, trees, flora, Biscuit waving
 *          beside a signpost, fireflies at dusk
 */

export const SCENE_W = 120;
export const SCENE_H = 40;

export type SceneVariant = 'day' | 'dusk';

export interface CampusSceneData {
    variant: SceneVariant;
    sky: { top: string; bottom: string };
    far: SpriteData;
    mid: SpriteData;
    near: SpriteData;
}

/** mulberry32 — tiny deterministic PRNG (fixed seed per variant). */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Mutable pixel grid that stamps sprites and exports SpriteData. */
class Grid {
    private readonly cells: string[][];
    private readonly palette: Record<string, string> = {};

    constructor(
        private readonly width: number,
        private readonly height: number,
    ) {
        this.cells = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'));
    }

    set(x: number, y: number, ch: string, color?: string): void {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height || ch === '.') return;
        const row = this.cells[y];
        if (row) row[x] = ch;
        if (color) this.palette[ch] = color;
    }

    stamp(sprite: SpriteData, x: number, y: number): void {
        sprite.rows.forEach((row, dy) => {
            for (let dx = 0; dx < row.length; dx++) {
                const ch = row[dx] ?? '.';
                if (ch !== '.') this.set(x + dx, y + dy, ch, sprite.palette[ch]);
            }
        });
    }

    fillHill(top: number[], ch: string, color: string): void {
        for (let x = 0; x < this.width; x++) {
            const base = top[x] ?? this.height;
            for (let y = base; y < this.height; y++) this.set(x, y, ch, color);
        }
    }

    toSpriteData(): SpriteData {
        return { palette: this.palette, rows: this.cells.map((r) => r.join('')) };
    }
}

/** Stepped (pixel) hill profile — a clamped random walk. */
function hillTop(width: number, base: number, amplitude: number, rng: () => number): number[] {
    const top: number[] = [];
    let h = base;
    for (let x = 0; x < width; x++) {
        top.push(h);
        const r = rng();
        if (r < 0.35) h += 1;
        else if (r < 0.7) h -= 1;
        h = Math.max(base - amplitude, Math.min(base + amplitude, h));
    }
    return top;
}

function stampDisc(grid: Grid, cx: number, cy: number, r: number, ch: string, color: string): void {
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r) grid.set(cx + dx, cy + dy, ch, color);
        }
    }
}

/** In-range numeric index under `noUncheckedIndexedAccess` (safe fallback). */
function at(values: number[], i: number): number {
    return values[i] ?? 0;
}

const COLORS: Record<
    SceneVariant,
    { skyTop: string; skyBottom: string; farHill: string; midHill: string; nearHill: string; trail: string }
> = {
    day: {
        skyTop: '#8FCFC6',
        skyBottom: '#F4EBDA',
        farHill: '#CDBB98',
        midHill: '#B2966B',
        nearHill: '#8F7549',
        trail: '#DCC48E',
    },
    dusk: {
        skyTop: '#2B2140',
        skyBottom: '#D98E4F',
        farHill: '#503F58',
        midHill: '#3E2F44',
        nearHill: '#2C2131',
        trail: '#7A5A3A',
    },
};

const SEEDS: Record<SceneVariant, number> = { day: 20260709, dusk: 991732 };

export function buildCampusScene(variant: SceneVariant, seed = SEEDS[variant]): CampusSceneData {
    const rng = mulberry32(seed);
    const c = COLORS[variant];
    const far = new Grid(SCENE_W, SCENE_H);
    const mid = new Grid(SCENE_W, SCENE_H);
    const near = new Grid(SCENE_W, SCENE_H);

    // ------------------------------------------------------------- far layer
    if (variant === 'day') {
        stampDisc(far, 92, 9, 6, 'M', 'rgba(255, 198, 61, 0.4)'); // glow first
        stampDisc(far, 92, 9, 4, 'm', '#FFC63D');
        for (let i = 0; i < 4; i++) {
            far.stamp(CLOUD, 6 + i * 30 + Math.floor(rng() * 10), 4 + Math.floor(rng() * 9));
        }
    } else {
        stampDisc(far, 92, 7, 4, 'M', '#F3E7C2');
        far.set(91, 6, 'C', '#D9CBA0');
        far.set(94, 8, 'C', '#D9CBA0');
        for (const s of scatteredStars(SCENE_W, 18, rng, 42)) far.set(s.x, s.y, 's', '#F6E9C8');
        far.stamp(FOG_PUFF, 20 + Math.floor(rng() * 60), 10 + Math.floor(rng() * 6));
    }
    far.fillHill(hillTop(SCENE_W, 24, 3, rng), 'h', c.farHill);

    // ------------------------------------------------------------ mid layer
    const midTop = hillTop(SCENE_W, 28, 4, rng);
    mid.fillHill(midTop, 'h', c.midHill);
    const names = Object.keys(LANDMARKS);
    let pick = Math.floor(rng() * names.length);
    for (let i = 0; i < 4; i++) {
        const x = 6 + i * 29 + Math.floor(rng() * 5);
        const art = LANDMARKS[names[pick] ?? ''];
        if (art) mid.stamp(art[variant], x, at(midTop, Math.min(x + 12, SCENE_W - 1)) - 21);
        pick = (pick + 3 + Math.floor(rng() * 3)) % names.length;
    }

    // ----------------------------------------------------------- near layer
    const nearTop = hillTop(SCENE_W, 32, 3, rng);
    near.fillHill(nearTop, 'h', c.nearHill);
    // Stepped dirt trail climbing from the bottom edge to the hilltop.
    let tx = 18;
    for (let y = SCENE_H - 1; y > at(nearTop, Math.min(tx, SCENE_W - 1)); y--) {
        near.set(tx, y, 'p', c.trail);
        near.set(tx + 1, y, 'p', c.trail);
        if (rng() < 0.6) tx += 1;
    }
    near.stamp(TREE, 4, at(nearTop, 8) - 12);
    near.stamp(TREE, 104, at(nearTop, 108) - 12);
    for (let i = 0; i < 4; i++) {
        const x = 8 + Math.floor(rng() * 100);
        near.stamp(FLOWER, x, at(nearTop, x) - 6);
    }
    for (let i = 0; i < 3; i++) {
        const x = 8 + Math.floor(rng() * 100);
        near.stamp(SPROUT, x, at(nearTop, x) - 4);
    }
    near.stamp(FOG_PUFF, 96, at(nearTop, 100) - 3);
    near.stamp(SIGNPOST, 44, at(nearTop, 46) - 14);
    near.stamp(BISCUIT_WAVE_A, 57, at(nearTop, 62) - 18);
    if (variant === 'dusk') {
        for (let i = 0; i < 6; i++) {
            near.stamp(FIREFLY, Math.floor(rng() * SCENE_W), 12 + Math.floor(rng() * 20));
        }
    }

    return {
        variant,
        sky: { top: c.skyTop, bottom: c.skyBottom },
        far: far.toSpriteData(),
        mid: mid.toSpriteData(),
        near: near.toSpriteData(),
    };
}
