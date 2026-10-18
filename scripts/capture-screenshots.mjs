#!/usr/bin/env node
/**
 * Phase 2 QA screenshots (plan step 9 / exit gate).
 *
 * Captures the three public pages — landing, catalog, trail map — at three
 * viewport widths and in both themes, for the visual record saved in
 * `docs/screenshots/phase-2/` (18 PNGs).
 *
 * Usage (repo root, stack running via `npm run up`):
 *   npm i --no-save --no-package-lock playwright  # once (stays out of package.json)
 *   npx -y playwright install chromium            # once (browser binary)
 *   node scripts/capture-screenshots.mjs
 *
 * Playwright is intentionally NOT a project dependency: `--no-save` keeps
 * package.json and the lockfile untouched (see docs/DECISIONS.md, Phase 2).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'docs',
    'screenshots',
    'phase-2',
);

const PAGES = [
    { prefix: '01-landing', path: '/' },
    { prefix: '02-catalog', path: '/roadmaps' },
    { prefix: '03-trail-map', path: '/roadmaps/frontend-developer' },
];
const VIEWPORTS = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
];
const THEMES = ['light', 'dark'];

const browser = await chromium.launch();
mkdirSync(OUT_DIR, { recursive: true });
try {
    for (const theme of THEMES) {
        for (const { width, height } of VIEWPORTS) {
            // One context per viewport. The init script seeds the
            // zustand-persist theme store before app boot so the first paint
            // is already in the right theme (PHASE_2_PLAN, pitfalls).
            const context = await browser.newContext({
                viewport: { width, height },
                colorScheme: theme,
                deviceScaleFactor: 1,
                reducedMotion: 'reduce', // deterministic frames; motion is a Phase 6 audit target
            });
            await context.addInitScript(
                ([key, value]) => window.localStorage.setItem(key, value),
                ['careercampus-theme', JSON.stringify({ state: { theme }, version: 0 })],
            );
            const page = await context.newPage();
            for (const { prefix, path: urlPath } of PAGES) {
                const file = path.join(OUT_DIR, `${prefix}-${theme}-${width}.png`);
                await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'networkidle', timeout: 60_000 });
                await page.waitForTimeout(1500); // settle: fonts, fit-to-view, sprite render
                await page.screenshot({ path: file });
                console.log(`captured ${path.basename(file)}`);
            }
            await context.close();
        }
    }
} finally {
    await browser.close();
}
console.log(`\nDone — screenshots in ${OUT_DIR}`);
