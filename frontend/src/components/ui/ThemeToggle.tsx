import { MOON, SUN } from '@/art/sprites/icons';
import { PixelSprite } from '@/art/PixelSprite';
import { useThemeStore } from '@/store/themeStore';

/** Sun/moon sticker toggle between Daylight and Night campus (spec §9A.4). */
export function ThemeToggle(): JSX.Element {
    const theme = useThemeStore((s) => s.theme);
    const toggle = useThemeStore((s) => s.toggle);

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'light' ? 'Switch to night campus' : 'Switch to daylight'}
            className="sticker flex h-9 w-9 items-center justify-center rounded-pill bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
            <PixelSprite sprite={theme === 'light' ? MOON : SUN} scale={2} />
        </button>
    );
}
