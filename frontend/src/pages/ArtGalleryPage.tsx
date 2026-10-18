import { useState } from 'react';
import { CAP, FLAME, FLAG, LANTERN, LOCK, MOON, SHIELD, STAR, SUN } from '@/art/sprites/icons';
import { BISCUIT_IDLE_A, BISCUIT_IDLE_B, BISCUIT_WAVE_A } from '@/art/sprites/biscuit';
import { LANDMARKS } from '@/art/sprites/landmarks';
import { NATURE } from '@/art/sprites/nature';
import { CampusScene } from '@/art/CampusScene';
import { PixelSprite, type SpriteData } from '@/art/PixelSprite';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';

const SPRITES: { name: string; sprite: SpriteData }[] = [
    ...Object.entries(LANDMARKS).map(([name, art]) => ({ name: `landmark ${name}`, sprite: art.day })),
    ...Object.entries(NATURE).map(([name, sprite]) => ({ name: `nature ${name}`, sprite })),
    { name: 'flame', sprite: FLAME },
    { name: 'shield', sprite: SHIELD },
    { name: 'lock', sprite: LOCK },
    { name: 'flag', sprite: FLAG },
    { name: 'lantern', sprite: LANTERN },
    { name: 'star', sprite: STAR },
    { name: 'cap', sprite: CAP },
    { name: 'sun', sprite: SUN },
    { name: 'moon', sprite: MOON },
    { name: 'biscuit idle 1', sprite: BISCUIT_IDLE_A },
    { name: 'biscuit idle 2', sprite: BISCUIT_IDLE_B },
    { name: 'biscuit wave', sprite: BISCUIT_WAVE_A },
];

/** Dev-only (/_art): every sprite, both themes, multiple scales. */
export function ArtGalleryPage(): JSX.Element {
    const theme = useThemeStore((s) => s.theme);
    const toggleTheme = useThemeStore((s) => s.toggle);
    const [scale, setScale] = useState(4);

    return (
        <section className="py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">Dev only</p>
            <h1 className="font-display mt-2 text-5xl font-black tracking-[-0.03em]">Pixel Art Gallery</h1>
            <p className="mt-3 max-w-xl text-ink-soft">
                Every sprite in both themes. Palettes reference CSS variables, so sprites retheme
                automatically — flip the theme and compare.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button variant="ghost" onClick={toggleTheme}>
                    {theme === 'light' ? 'Night campus' : 'Daylight'}
                </Button>
                <div className="flex items-center gap-1">
                    {[2, 3, 4, 6].map((s) => (
                        <Button
                            key={s}
                            variant={scale === s ? 'primary' : 'ghost'}
                            onClick={() => setScale(s)}
                        >
                            {s}&times;
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {SPRITES.map(({ name, sprite }) => (
                    <figure
                        key={name}
                        className="soft-card flex flex-col items-center gap-4 rounded-card bg-card p-6"
                    >
                        <div className="flex h-40 items-center justify-center">
                            <PixelSprite sprite={sprite} scale={scale} />
                        </div>
                        <figcaption className="font-pixel text-sm text-ink-soft">{name}</figcaption>
                    </figure>
                ))}
            </div>

            <div className="mt-12 space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">CampusScene</p>
                <h2 className="font-display text-3xl font-black tracking-[-0.02em]">
                    Procedural panorama — day &amp; dusk
                </h2>
                <p className="max-w-xl text-ink-soft">
                    Three parallax layers (scroll or move the mouse). Fixed seed per variant — the render is
                    identical on every load.
                </p>
                <div className="soft-card overflow-hidden rounded-card bg-card p-2">
                    <CampusScene variant="day" />
                    <p className="font-pixel p-2 text-sm text-ink-soft">scene day</p>
                </div>
                <div className="soft-card overflow-hidden rounded-card bg-card p-2">
                    <CampusScene variant="dusk" />
                    <p className="font-pixel p-2 text-sm text-ink-soft">scene dusk</p>
                </div>
            </div>
        </section>
    );
}
