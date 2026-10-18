import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import type { MotionStyle, MotionValue } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelSprite } from './PixelSprite';
import { buildCampusScene, type SceneVariant } from './scene';

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduced;
}

interface CampusSceneProps {
    variant?: SceneVariant;
    className?: string;
}

/**
 * Three-layer procedural campus panorama with scroll + mouse parallax
 * (spec §9A.10). Fully static under `prefers-reduced-motion`. The
 * fade-into-paper `mask-image` gradient belongs on the hero wrapper
 * (landing), not here.
 */
export function CampusScene({ variant = 'day', className }: CampusSceneProps): JSX.Element {
    const scene = useMemo(() => buildCampusScene(variant), [variant]);
    const reduced = usePrefersReducedMotion();
    const ref = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
    const mouseX = useMotionValue(0);
    const smoothX = useSpring(mouseX, { stiffness: 50, damping: 15 });
    const farX = useTransform(smoothX, (v) => v * -6);
    const midX = useTransform(smoothX, (v) => v * -12);
    const nearX = useTransform(smoothX, (v) => v * -20);
    const farY = useTransform(scrollYProgress, [0, 1], [0, 24]);
    const midY = useTransform(scrollYProgress, [0, 1], [0, 48]);
    const nearY = useTransform(scrollYProgress, [0, 1], [0, 80]);

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
        if (reduced || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    };

    const layerStyle = (x: MotionValue<number>, y: MotionValue<number>): MotionStyle => ({
        x: reduced ? 0 : x,
        y: reduced ? 0 : y,
    });

    return (
        <div
            ref={ref}
            onMouseMove={onMouseMove}
            className={`relative w-full overflow-hidden ${className ?? ''}`}
            style={{
                aspectRatio: '3 / 1',
                background: `linear-gradient(${scene.sky.top}, ${scene.sky.bottom})`,
            }}
            aria-hidden
        >
            <motion.div data-layer="far" className="absolute inset-0" style={layerStyle(farX, farY)}>
                <PixelSprite sprite={scene.far} scale={1} className="h-full w-full" />
            </motion.div>
            <motion.div data-layer="mid" className="absolute inset-0" style={layerStyle(midX, midY)}>
                <PixelSprite sprite={scene.mid} scale={1} className="h-full w-full" />
            </motion.div>
            <motion.div data-layer="near" className="absolute inset-0" style={layerStyle(nearX, nearY)}>
                <PixelSprite sprite={scene.near} scale={1} className="h-full w-full" />
            </motion.div>
        </div>
    );
}
