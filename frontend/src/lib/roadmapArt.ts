import { LANDMARKS } from '@/art/sprites/landmarks';
import type { SpriteData } from '@/art/PixelSprite';
import type { SceneVariant } from '@/art/scene';
import type { RoadmapSummary } from '@/api/types';

/** First themed landmark sprite for a roadmap (day/dusk); undefined if none. */
export function landmarkSprite(
    roadmap: RoadmapSummary,
    variant: SceneVariant,
    index = 0,
): SpriteData | undefined {
    const names: string[] = Array.isArray(roadmap.theme.landmarks) ? roadmap.theme.landmarks : [];
    const name = names[index] ?? names[0];
    const art = name ? LANDMARKS[name] : undefined;
    return art ? art[variant] : undefined;
}
