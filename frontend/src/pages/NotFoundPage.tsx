import { BISCUIT_IDLE_B } from '@/art/sprites/biscuit';
import { PixelSprite } from '@/art/PixelSprite';

export function NotFoundPage(): JSX.Element {
    return (
        <section className="flex flex-col items-center py-24 text-center">
            <PixelSprite sprite={BISCUIT_IDLE_B} scale={4} label="Biscuit looking lost" />
            <h1 className="font-display mt-8 text-6xl font-black tracking-[-0.03em]">404</h1>
            <p className="mt-3 max-w-md text-ink-soft">
                Lost on the trail. Let&apos;s get you back to base camp.
            </p>
            <a
                href="/"
                className="sticker mt-8 inline-block rounded-pill bg-marigold px-6 py-2.5 font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
                Back to base
            </a>
        </section>
    );
}
