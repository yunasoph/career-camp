import { describe, expect, it } from 'vitest';
import type { SpriteData } from './PixelSprite';
import { BISCUIT } from './sprites/biscuit';
import { ICONS } from './sprites/icons';
import { LANDMARKS } from './sprites/landmarks';
import { NATURE } from './sprites/nature';
import { SCENE_H, SCENE_W, buildCampusScene } from './scene';

function collectSprites(): Array<[string, SpriteData]> {
    const out: Array<[string, SpriteData]> = [];
    for (const [name, icon] of Object.entries(ICONS)) out.push([`icon:${name}`, icon]);
    for (const [name, poses] of Object.entries(BISCUIT)) {
        poses.forEach((pose, i) => out.push([`biscuit:${name}[${i}]`, pose]));
    }
    for (const [name, sprite] of Object.entries(NATURE)) out.push([`nature:${name}`, sprite]);
    for (const [name, art] of Object.entries(LANDMARKS)) {
        out.push([`landmark:${name}:day`, art.day]);
        out.push([`landmark:${name}:dusk`, art.dusk]);
    }
    for (const variant of ['day', 'dusk'] as const) {
        const scene = buildCampusScene(variant);
        out.push([`scene:${variant}:far`, scene.far]);
        out.push([`scene:${variant}:mid`, scene.mid]);
        out.push([`scene:${variant}:near`, scene.near]);
    }
    return out;
}

describe('sprite data integrity', () => {
    it('every export has uniform row widths and only palette keys (no rasters)', () => {
        const problems: string[] = [];
        for (const [name, sprite] of collectSprites()) {
            if (sprite.rows.length === 0) {
                problems.push(`${name}: no rows`);
                continue;
            }
            const width = sprite.rows[0]?.length ?? 0;
            sprite.rows.forEach((row, y) => {
                if (row.length !== width) problems.push(`${name} row ${y} width ${row.length} != ${width}`);
                for (const ch of row) {
                    if (ch !== '.' && !(ch in sprite.palette)) {
                        problems.push(`${name} row ${y} unknown palette key '${ch}'`);
                    }
                }
            });
        }
        expect(problems, 'sprite integrity problems').toEqual([]);
    });

    it('landmarks are 24x24, and dusk swaps the window tone (lit windows)', () => {
        for (const [name, art] of Object.entries(LANDMARKS)) {
            expect(art.day.rows.length, `${name} rows`).toBe(24);
            expect(art.day.rows[0]?.length, `${name} cols`).toBe(24);
            expect(art.dusk.rows, `${name} dusk reuses day rows`).toEqual(art.day.rows);
            expect(art.dusk.palette.w, `${name} dusk window tone`).not.toBe(art.day.palette.w);
        }
    });

    it('buildCampusScene is deterministic per variant', () => {
        const a = buildCampusScene('day');
        const b = buildCampusScene('day');
        expect(a, 'same variant + seed → identical scene').toEqual(b);
        const dusk = buildCampusScene('dusk');
        expect(dusk.sky.top, 'dusk sky differs from day sky').not.toBe(a.sky.top);
        expect(dusk.near.rows).not.toEqual(a.near.rows);
    });

    it('scene layers match the scene grid size', () => {
        for (const variant of ['day', 'dusk'] as const) {
            const scene = buildCampusScene(variant);
            for (const [label, layer] of [
                ['far', scene.far],
                ['mid', scene.mid],
                ['near', scene.near],
            ] as const) {
                expect(layer.rows.length, `${variant} ${label} height`).toBe(SCENE_H);
                for (const row of layer.rows) {
                    expect(row.length, `${variant} ${label} row width`).toBe(SCENE_W);
                }
            }
        }
    });
});
