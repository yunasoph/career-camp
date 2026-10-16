import { forwardRef, type InputHTMLAttributes } from 'react';

/**
 * Cream fill, ink border on focus, marigold focus ring (3px, offset 2px).
 * Focus outlines are never removed (spec §9A.4).
 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
    { className = '', ...rest },
    ref,
) {
    return (
        <input
            ref={ref}
            className={`w-full rounded-input border-2 border-transparent bg-paper-2 px-4 py-2.5 text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none focus:ring-2 focus:ring-marigold focus:ring-offset-2 focus:ring-offset-card ${className}`}
            {...rest}
        />
    );
});
