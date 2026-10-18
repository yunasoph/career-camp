import type { SpriteData } from '@/art/PixelSprite';

/**
 * Campus landmark sprites (spec §9A.6–9A.7) — 24×24 pixel grids.
 *
 * Every landmark shares ONE row map and TWO palettes: `day` and `dusk`.
 * Dusk is the "palette swap" — windows light up (warm marigold) while the
 * body/outline stay the same, so the same art reads as a night campus.
 * Palettes reference CSS variables so sprites retheme with the app theme;
 * a few warm tones are fixed hex so landmarks keep a distinct identity.
 *
 * Palette keys (shared by all landmarks):
 *   o = outline (var(--ink))
 *   b = body / wall (fixed sandstone)
 *   B = body shadow (fixed darker sandstone)
 *   r = roof (var(--ember))
 *   m = trim (var(--marigold))
 *   w = window (day: dark slate · dusk: lit marigold)  <- the swap
 *   d = door (var(--ink))
 *   g = foliage (var(--moss))
 *   t = teal accent (var(--lagoon))
 *   s = stone (var(--fog))
 */

const SANDSTONE = '#D8B78C';
const SANDSTONE_DARK = '#B99265';
const SLATE_DAY = '#6E5A45';
const LIT_DUSK = '#FFD056';

/** Type alias (not interface) so palettes satisfy `Record<string, string>`. */
type LandmarkPalette = {
    o: string;
    b: string;
    B: string;
    r: string;
    m: string;
    w: string;
    d: string;
    g: string;
    t: string;
    s: string;
};

function dayPalette(): LandmarkPalette {
    return {
        o: 'var(--ink)',
        b: SANDSTONE,
        B: SANDSTONE_DARK,
        r: 'var(--ember)',
        m: 'var(--marigold)',
        w: SLATE_DAY,
        d: 'var(--ink)',
        g: 'var(--moss)',
        t: 'var(--lagoon)',
        s: 'var(--fog)',
    };
}

function duskPalette(): LandmarkPalette {
    return {
        o: 'var(--ink)',
        b: SANDSTONE,
        B: SANDSTONE_DARK,
        r: 'var(--ember)',
        m: 'var(--marigold)',
        w: LIT_DUSK,
        d: 'var(--ink)',
        g: 'var(--moss)',
        t: 'var(--lagoon)',
        s: 'var(--fog)',
    };
}

// --- row maps (each 24 cols × 24 rows) -------------------------------------

/** Library — pediment, entablature, four columns, steps. */
const LIBRARY: string[] = [
    '........................', // 0
    '...........oo...........', // 1
    '...........oo...........', // 2
    '..........oooo..........', // 3
    '.........oooooo.........', // 4
    '........oooooooo........', // 5
    '.......oooooooooo.......', // 6
    '..oooooooooooooooooo....', // 7
    '..mmmmmmmmmmmmmmmmmm....', // 8
    '..BbbBBBbbBBbbBBBbbB....', // 9
    '..BbbBBBbbBBbbBBBbbB....', // 10
    '..BbbBBBbbBBbbBBBbbB....', // 11
    '..BbbBBBbbBBbbBBBbbB....', // 12
    '..BbbBBBbbBBbbBBBbbB....', // 13
    '..BBBBBBBBddBBBBBBBB....', // 14
    '..BBBBBBBBddBBBBBBBB....', // 15
    '..BBBBBBBBddBBBBBBBB....', // 16
    '..oooooooooooooooooo....', // 17
    '.oooooooooooooooooooo...', // 18
    'oooooooooooooooooooooooo', // 19
    '........................', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Lab — test tube on the roof, three windows, stone plinth. */
const LAB: string[] = [
    '........................', // 0
    '...........oo...........', // 1
    '...........tt...........', // 2
    '...........tt...........', // 3
    '...........tt...........', // 4
    '...oooooooooooooooooo...', // 5
    '...rrrrrrrrrrrrrrrrrr...', // 6
    '...oooooooooooooooooo...', // 7
    '...bwwwwbbwwwwbbwwwwb...', // 8
    '...bwwwwbbwwwwbbwwwwb...', // 9
    '...bwwwwbbwwwwbbwwwwb...', // 10
    '...bwwwwbbwwwwbbwwwwb...', // 11
    '...bbbbbbbbddbbbbbbbb...', // 12
    '...bbbbbbbbddbbbbbbbb...', // 13
    '...bbbbbbbbddbbbbbbbb...', // 14
    '...oooooooooooooooooo...', // 15
    '...sssssssssssssssss....', // 16
    '........................', // 17
    '........................', // 18
    '........................', // 19
    '........................', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Workshop — chimney, gear on the facade, wide double doors. */
const WORKSHOP: string[] = [
    '........................', // 0
    '.....oo.................', // 1
    '.....BB.................', // 2
    '.....BB.................', // 3
    '...oooooooooooooooooo...', // 4
    '...rrrrrrrrrrrrrrrrrr...', // 5
    '...oooooooooooooooooo...', // 6
    '...bbbbbbbmmmmbbbbbbb...', // 7
    '...bbbbbmmmmmmmmmbbb....', // 8
    '...bbbbbmmmoommmbbb.....', // 9
    '...bbbbbmmmmmmmmmbbb....', // 10
    '...bbbbbbbmmmmbbbbbbb...', // 11
    '...bbbbbbbbbbbbbbbbbb...', // 12
    '...bbbbbbbddddbbbbbbb...', // 13
    '...bbbbbbbddddbbbbbbb...', // 14
    '...bbbbbbbddddbbbbbbb...', // 15
    '...oooooooooooooooooo...', // 16
    '...sssssssssssssssss....', // 17
    '........................', // 18
    '........................', // 19
    '........................', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Studio — pennant flag, big mural window, two small windows. */
const STUDIO: string[] = [
    '........................', // 0
    '..............o.rrr.....', // 1
    '..............o.rr......', // 2
    '..............o.........', // 3
    '...oooooooooooooooooo...', // 4
    '...rrrrrrrrrrrrrrrrrr...', // 5
    '...oooooooooooooooooo...', // 6
    '...bbbommmmmmmmmmoobb...', // 7
    '...bbbommmmmmmmmmoobb...', // 8
    '...bbbommmtttmmmooobb...', // 9
    '...bbbommmmmmmmmmoobb...', // 10
    '...bbbommmmmmmmmmoobb...', // 11
    '...bbwwbbbbbbbbbbwwbb...', // 12
    '...bbbbbbbbddbbbbbbbb...', // 13
    '...bbbbbbbbddbbbbbbbb...', // 14
    '...bbbbbbbbddbbbbbbbb...', // 15
    '...oooooooooooooooooo...', // 16
    '...sssssssssssssssss....', // 17
    '........................', // 18
    '........................', // 19
    '........................', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Observatory — teal dome with a slit, drum with door and windows. */
const OBSERVATORY: string[] = [
    '........................', // 0
    '...........tt...........', // 1
    '...........tt...........', // 2
    '........oooooooo........', // 3
    '.......ottttttttto......', // 4
    '......ottttttttttto.....', // 5
    '.....ottttttttttttto....', // 6
    '....ottttttttttttttto...', // 7
    '...oooooooooooooooooo...', // 8
    '...bbwwbbbbbbbbbbwwbb...', // 9
    '...bbwwbbbbbbbbbbwwbb...', // 10
    '...bbbbbbbbddbbbbbbbb...', // 11
    '...bbbbbbbbddbbbbbbbb...', // 12
    '...bbbbbbbbddbbbbbbbb...', // 13
    '...bbbbbbbbbbbbbbbbbb...', // 14
    '...oooooooooooooooooo...', // 15
    '...ssssssssssssssssss...', // 16
    '........................', // 17
    '........................', // 18
    '........................', // 19
    '........................', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Garden gate — arched stone gate, foliage over the top, hedge base. */
const GARDEN_GATE: string[] = [
    '........................', // 0
    '........................', // 1
    '........................', // 2
    '.......g.g.gg.g.g.......', // 3
    '.....oooooooooooooo.....', // 4
    '.....obbbbbbbbbbbbo.....', // 5
    '.....obbbbbbbbbbbbo.....', // 6
    '.....obb........bbo.....', // 7
    '.....obb........bbo.....', // 8
    '.....obb........bbo.....', // 9
    '.....obb........bbo.....', // 10
    '.....obb........bbo.....', // 11
    '.....obb........bbo.....', // 12
    '.....obb........bbo.....', // 13
    '.....obb........bbo.....', // 14
    '.....obb........bbo.....', // 15
    '.....obb........bbo.....', // 16
    '.....obb........bbo.....', // 17
    '.....ooo........ooo.....', // 18
    '.....ggg........ggg.....', // 19
    '..gggggggggggggggggggg..', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Bridge — railing with end lamps, deck, stone piers, water below. */
const BRIDGE: string[] = [
    '........................', // 0
    '........................', // 1
    '........................', // 2
    '........................', // 3
    '........................', // 4
    '........................', // 5
    '........................', // 6
    '..m.................m...', // 7
    '..o..o..o..o..o..o..o...', // 8
    '..oooooooooooooooooooo..', // 9
    '..bbbbbbbbbbbbbbbbbbbb..', // 10
    '..oooooooooooooooooooo..', // 11
    '.....sss........sss.....', // 12
    '.....sss........sss.....', // 13
    '.....sss........sss.....', // 14
    '.....sss........sss.....', // 15
    '.....sss........sss.....', // 16
    '..tttttttttttttttttttt..', // 17
    '..tttssttttttssttttttt..', // 18
    '..tttttttttttttttttttt..', // 19
    '........................', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Tower — ember cone roof, tall body with windows, arched door. */
const TOWER: string[] = [
    '........................', // 0
    '...........oo...........', // 1
    '...........rr...........', // 2
    '..........rrrr..........', // 3
    '.........rrrrrr.........', // 4
    '........rrrrrrrr........', // 5
    '.......rrrrrrrrrr.......', // 6
    '......rrrrrrrrrrrr......', // 7
    '.....oooooooooooooo.....', // 8
    '.......oooooooooo.......', // 9
    '.......obbbbbbbbo.......', // 10
    '.......obbbwwbbbo.......', // 11
    '.......obbbbbbbbo.......', // 12
    '.......obbbwwbbbo.......', // 13
    '.......obbbbbbbbo.......', // 14
    '.......obbbwwbbbo.......', // 15
    '.......obbbbbbbbo.......', // 16
    '.......obbbddbbbo.......', // 17
    '.......obbbbbbbbo.......', // 18
    '......oooooooooooo......', // 19
    '.....ssssssssssssss.....', // 20
    '........................', // 21
    '........................', // 22
    '........................', // 23
];

/** Raw art: one row map per landmark plus day/dusk palettes. */
export interface LandmarkArt {
    rows: string[];
    day: LandmarkPalette;
    dusk: LandmarkPalette;
}

export const LANDMARK_ART: Record<string, LandmarkArt> = {
    library: { rows: LIBRARY, day: dayPalette(), dusk: duskPalette() },
    lab: { rows: LAB, day: dayPalette(), dusk: duskPalette() },
    workshop: { rows: WORKSHOP, day: dayPalette(), dusk: duskPalette() },
    studio: { rows: STUDIO, day: dayPalette(), dusk: duskPalette() },
    observatory: { rows: OBSERVATORY, day: dayPalette(), dusk: duskPalette() },
    'garden-gate': { rows: GARDEN_GATE, day: dayPalette(), dusk: duskPalette() },
    bridge: { rows: BRIDGE, day: dayPalette(), dusk: duskPalette() },
    tower: { rows: TOWER, day: dayPalette(), dusk: duskPalette() },
};

/** Ready-to-render SpriteData per landmark/variant (gallery + scene). */
export const LANDMARKS: Record<string, { day: SpriteData; dusk: SpriteData }> = Object.fromEntries(
    Object.entries(LANDMARK_ART).map(([name, art]) => [
        name,
        {
            day: { palette: art.day, rows: art.rows },
            dusk: { palette: art.dusk, rows: art.rows },
        },
    ]),
);
