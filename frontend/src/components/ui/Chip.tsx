import type { ReactNode } from 'react';

interface ChipProps {
    icon?: ReactNode;
    /** Screen-reader label for the value. */
    label: string;
    value: string | number;
    tone?: 'default' | 'accent';
}

const TONES: Record<NonNullable<ChipProps['tone']>, string> = {
    default: 'bg-paper-2 text-ink',
    accent: 'bg-marigold text-ink',
};

/** Small pill with sprite + number, Pixelify Sans (spec §9A.4). */
export function Chip({ icon, label, value, tone = 'default' }: ChipProps): JSX.Element {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-pixel text-sm ${TONES[tone]}`}
        >
            {icon}
            <span>{value}</span>
            <span className="sr-only">{label}</span>
        </span>
    );
}
