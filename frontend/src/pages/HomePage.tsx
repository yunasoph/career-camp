import { BISCUIT_IDLE_A } from '@/art/sprites/biscuit';
import { PixelSprite } from '@/art/PixelSprite';

/**
 * Phase 0 placeholder — the full CampusScene hero lands in Phase 2.
 * Styled with §9A tokens from day one (spec §15.8).
 */
export function HomePage(): JSX.Element {
    return (
        <section className="py-16 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
                Career paths, playable
            </p>
            <h1 className="font-display mt-4 text-5xl font-black leading-[0.95] tracking-[-0.03em] sm:text-6xl">
                Map your career.
                <br />
                Level it up.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft">
                The full trail map lands in Phase 2. For now, meet Biscuit.
            </p>
            <div className="mt-10 flex justify-center">
                <PixelSprite sprite={BISCUIT_IDLE_A} scale={4} label="Biscuit the capybara" />
            </div>
        </section>
    );
}
