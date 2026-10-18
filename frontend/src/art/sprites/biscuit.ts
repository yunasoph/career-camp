import type { SpriteData } from '@/art/PixelSprite';

/**
 * Biscuit the capybara (spec §9A.5) — 24×20 grid, side view facing right,
 * tiny berry backpack with a marigold strap.
 *
 * Palette keys:
 *   o = outline (var(--ink), themes automatically)
 *   c = body brown, d = legs (dark brown), l = light muzzle
 *   k = backpack (var(--berry)), p = strap (var(--marigold))
 *
 * Poses ship as frame arrays; Phase 3+ adds wave/cheer/think/sleep,
 * Phase 6 animates them with CSS steps() at 4–6 fps.
 */
const PALETTE: SpriteData['palette'] = {
    o: 'var(--ink)',
    c: '#8A6242',
    d: '#6E4E33',
    l: '#C89A6E',
    k: 'var(--berry)',
    p: 'var(--marigold)',
};

const BODY = [
    // 20 rows × 24 cols
    '........................', // 0
    '..................oo....', // 1  ear tips
    '................occo....', // 2  ears
    '...............oooooooo.', // 3  head top
    '...............occcccco.', // 4  head
    '...............occcocco.', // 5  head (eye at col 19)
    '...............occccccol', // 6  head + muzzle
    '...............occccccoo', // 7  head + muzzle + nose
    '......ooooooooooooooooool', // 8 body top (16 cols) + head edge + muzzle
    '.okkkooccccccccccccccco..', // 9  backpack + body
    '.okkkooccccccccccccccco..', // 10
    '.okkkpoccccccccccccccco..', // 11 strap
    '.okkkooccccccccccccccco..', // 12
    '.okkkooccccccccccccccco..', // 13
    '.okkkooccccccccccccccco..', // 14
    '.ooooooocccccccccccccco..', // 15 backpack bottom + body
    '......oooooooooooooooo..', // 16 body bottom
    '........ddd......ddd....', // 17 legs
    '........ooo......ooo....', // 18 feet
    '........................', // 19
    // Rows 8–15 were authored 25px wide; column 24 is off the 24-px canvas
    // (always clipped by the viewBox), so trim to canvas width.
].map((row) => row.slice(0, 24));

export const BISCUIT_IDLE_A: SpriteData = { palette: PALETTE, rows: BODY };

/** Frame 2 — a blink (eye closed). */
export const BISCUIT_IDLE_B: SpriteData = {
    palette: PALETTE,
    rows: BODY.map((row, i) => (i === 5 ? '...............occcccco.' : row)),
};

/**
 * Wave pose — front paw raised beside the head (hero greeting, spec §9A.5).
 * Built from the idle body so the silhouette stays identical otherwise.
 */
export const BISCUIT_WAVE_A: SpriteData = {
    palette: PALETTE,
    rows: BODY.map((row, y) => {
        if (y === 3) return row.slice(0, 23) + 'o';
        if (y === 4 || y === 5) return row.slice(0, 23) + 'c';
        return row;
    }),
};

export const BISCUIT: Record<string, SpriteData[]> = {
    idle: [BISCUIT_IDLE_A, BISCUIT_IDLE_B],
    wave: [BISCUIT_WAVE_A],
};
