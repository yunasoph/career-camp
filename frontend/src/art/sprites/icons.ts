import type { SpriteData } from '@/art/PixelSprite';

/** 8–16px-grid icon sprites (spec §9A.6). Palettes use CSS variables → auto theming. */

export const FLAME: SpriteData = {
    palette: { o: 'var(--ember)', y: 'var(--marigold)', w: '#FFF3C4' },
    rows: ['...oo...', '..oyyo..', '..oyyo..', '.ooyyoo.', '.ooywyo.', '.oyywyo.', '..oyyo..', '..oooo..'],
};

export const SHIELD: SpriteData = {
    palette: { b: 'var(--ink)', f: 'var(--marigold)' },
    rows: [
        'bbbbbbbbbb',
        'bffffffffb',
        'bffffffffb',
        'bffffffffb',
        'bffffffffb',
        'bffffffffb',
        '.bffffffb.',
        '.bffffffb.',
        '..bffffb..',
        '...bbbb...',
    ],
};

export const LOCK: SpriteData = {
    palette: { b: 'var(--ink)', h: 'var(--fog)' },
    rows: ['..bbbb..', '.bb..bb.', '.bb..bb.', 'bbbbbbbb', 'bbbbbbbb', 'bbbhhbbb', 'bbbhhbbb', 'bbbbbbbb'],
};

export const FLAG: SpriteData = {
    palette: { s: 'var(--ink)', w: 'var(--moss)' },
    rows: [
        'swwwwww...',
        'swwwwww...',
        'swwwwww...',
        'swwww.....',
        'sww.......',
        's.........',
        's.........',
        's.........',
        's.........',
        'ssssssss..',
    ],
};

export const LANTERN: SpriteData = {
    palette: { b: 'var(--ink)', w: 'var(--marigold)' },
    rows: [
        '...bb...',
        '..b..b..',
        '.bbbbbb.',
        'bwwwwwwb',
        'bwwwwwwb',
        'bwwwwwwb',
        'bwwwwwwb',
        '.bbbbbb.',
        '...bb...',
        '..bbbb..',
    ],
};

export const STAR: SpriteData = {
    palette: { w: 'var(--marigold)' },
    rows: ['...ww...', '...ww...', 'wwwwwwww', 'wwwwwwww', '...ww...', '...ww...'],
};

/** Graduation cap — the logo mark. */
export const CAP: SpriteData = {
    palette: { b: 'var(--berry)', y: 'var(--marigold)' },
    rows: [
        '.....bb.....',
        '...bbbbbb...',
        '.bbbbbbbbbb.',
        'bbbbbbbbbbbb',
        '.bbbbbbbbbb.',
        '..bbbbbbbbyy',
        '...bbbbbb...',
        '....bbbb....',
    ],
};

export const SUN: SpriteData = {
    palette: { y: 'var(--marigold)' },
    rows: ['...yy...', 'y..yy..y', '..yyyy..', '.yyyyyy.', '.yyyyyy.', '..yyyy..', 'y..yy..y', '...yy...'],
};

export const MOON: SpriteData = {
    palette: { b: 'var(--ink-soft)' },
    rows: ['...bbb..', '..b...b.', '.b......', 'b.......', 'b.......', '.b......', '..b...b.', '...bbb..'],
};

/** Gallery/dev helper: every icon in one record. */
export const ICONS: Record<string, SpriteData> = {
    flame: FLAME,
    shield: SHIELD,
    lock: LOCK,
    flag: FLAG,
    lantern: LANTERN,
    star: STAR,
    cap: CAP,
    sun: SUN,
    moon: MOON,
};
