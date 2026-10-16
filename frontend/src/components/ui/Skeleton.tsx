interface SkeletonProps {
    className?: string;
}

/** Loading placeholder: a pixel checker shimmer, not grey bars (spec §9A.4). */
export function Skeleton({ className = '' }: SkeletonProps): JSX.Element {
    return (
        <div
            aria-hidden="true"
            className={`animate-checker-shimmer rounded-input ${className}`}
            style={{
                backgroundImage:
                    'repeating-conic-gradient(color-mix(in srgb, var(--ink) 12%, transparent) 0% 25%, transparent 0% 50%)',
                backgroundSize: '12px 12px',
            }}
        />
    );
}
