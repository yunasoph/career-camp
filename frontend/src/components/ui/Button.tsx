import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
    primary: 'bg-marigold text-ink',
    ghost: 'bg-card text-ink',
    danger: 'bg-ember text-ink',
};

/** Sticker button (spec §9A.4): 2px ink border + hard shadow, press-down on :active. */
export function Button({
    variant = 'primary',
    className = '',
    type = 'button',
    ...rest
}: ButtonProps): JSX.Element {
    return (
        <button
            type={type}
            className={`sticker inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 font-body text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${VARIANTS[variant]} ${className}`}
            {...rest}
        />
    );
}
