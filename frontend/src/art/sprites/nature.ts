import type { SpriteData } from '@/art/PixelSprite';

/**
 * Nature sprites (spec §9A.6) — small elements for the trail map and the
 * procedural campus scene. Palettes use CSS variables where theming matters,
 * fixed warm tones where the art needs a stable identity.
 */

export const CLOUD: SpriteData = {
    palette: { c: 'var(--fog)' },
    rows: ['..cc....cc..', '.cccc.ccccc.', 'cccccccccccc', '.cccccccccc.', '..cccccccc..'],
};

/** Round-canopy tree — the default trail-map filler. */
export const TREE: SpriteData = {
    palette: { g: 'var(--moss)', b: '#8A6242' },
    rows: [
        '....gggg....',
        '...gggggg...',
        '..gggggggg..',
        '..gggggggg..',
        '.gggggggggg.',
        '.gggggggggg.',
        'gggggggggggg',
        '.gggggggggg.',
        '..gggggggg..',
        '....gggg....',
        '.....bb.....',
        '.....bb.....',
        '....bbbb....',
        '....bbbb....',
    ],
};

export const FLOWER: SpriteData = {
    palette: { r: 'var(--ember)', m: 'var(--marigold)', g: 'var(--moss)' },
    rows: ['..rrr..', '.rrmrr.', '..rrr..', '...g...', '...g...', '.g.gg..', '...g...', '...g...'],
};

export const SPROUT: SpriteData = {
    palette: { g: 'var(--moss)' },
    rows: ['.g.g.', '.ggg.', '...g.', '...g.', '..ggg', '..ggg'],
};

/** Trail-map signpost — two arrow signs (marigold) on a timber post. */
export const SIGNPOST: SpriteData = {
    palette: { m: 'var(--marigold)', b: '#8A6242', o: 'var(--ink)' },
    rows: [
        'mmmmmmm...',
        'mmoommm...',
        'mmmmmmm...',
        '....bb....',
        '...mmmmmmm',
        '...mmoommm',
        '...mmmmmmm',
        '....bb....',
        '....bb....',
        '....bb....',
        '....bb....',
        '....bb....',
        '....bb....',
        '....bb....',
        '....bb....',
        '...bbbb...',
    ],
};

/** Pixel mist — softens hill bases. */
export const FOG_PUFF: SpriteData = {
    palette: { s: 'var(--fog)' },
    rows: [
        '...ssss..ssss...',
        '..ssssssssssss..',
        '.ssssssssssssss.',
        '.ssssssssssssss.',
        '..ssssssssssss..',
    ],
};

/** Dusk firefly — a small warm glow. */
export const FIREFLY: SpriteData = {
    palette: { f: '#FFE9A3' },
    rows: ['.f.', 'fff', '.f.'],
};

/** Gallery/dev helper: every nature sprite in one record. */
export const NATURE: Record<string, SpriteData> = {
    cloud: CLOUD,
    tree: TREE,
    flower: FLOWER,
    sprout: SPROUT,
    signpost: SIGNPOST,
    fog: FOG_PUFF,
    firefly: FIREFLY,
};

export interface Star {
    x: number;
    y: number;
}

/**
 * Deterministic star field (call with the scene PRNG) — scattered single-px
 * stars for the dusk sky.
 */
export function scatteredStars(width: number, height: number, rng: () => number, count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
        stars.push({ x: Math.floor(rng() * width), y: Math.floor(rng() * height) });
    }
    return stars;
}
