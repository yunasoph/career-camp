import { BISCUIT_IDLE_A } from '@/art/sprites/biscuit';
import { PixelSprite } from '@/art/PixelSprite';

interface ComingSoonPageProps {
    title: string;
    note: string;
}

/** Placeholder for routes not built yet (Phase 0 scope: no real pages). */
export function ComingSoonPage({ title, note }: ComingSoonPageProps): JSX.Element {
    return (
        <section className="flex flex-col items-center py-24 text-center">
            <PixelSprite sprite={BISCUIT_IDLE_A} scale={4} label="Biscuit resting" />
            <h1 className="font-display mt-8 text-4xl font-black tracking-[-0.03em]">{title}</h1>
            <p className="mt-3 max-w-md text-ink-soft">{note}</p>
        </section>
    );
}
