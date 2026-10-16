import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /** Slight rotation (deg) for the "pinned to a board" look. */
    rotate?: number;
}

/** Soft-elevation container (spec §9A.4). */
export function Card({ rotate = 0, className = '', style, ...rest }: CardProps): JSX.Element {
    return (
        <div
            className={`soft-card rounded-card bg-card p-5 ${className}`}
            style={{ ...style, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
            {...rest}
        />
    );
}
