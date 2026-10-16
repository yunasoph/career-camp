/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            // §9A.2 — semantic tokens; values come from CSS variables
            // (light on :root, night on .dark). Never hardcode hex in components.
            colors: {
                paper: 'var(--paper)',
                'paper-2': 'var(--paper-2)',
                card: 'var(--card)',
                ink: 'var(--ink)',
                'ink-soft': 'var(--ink-soft)',
                marigold: 'var(--marigold)',
                ember: 'var(--ember)',
                moss: 'var(--moss)',
                lagoon: 'var(--lagoon)',
                berry: 'var(--berry)',
                fog: 'var(--fog)',
            },
            fontFamily: {
                display: ['"Fraunces Variable"', 'Georgia', 'serif'],
                body: ['"Figtree Variable"', 'system-ui', 'sans-serif'],
                pixel: ['"Pixelify Sans"', 'monospace'],
            },
            borderRadius: {
                card: '28px',
                input: '16px',
                pill: '999px',
            },
            boxShadow: {
                sticker: '0 4px 0 var(--ink)',
                'sticker-pressed': '0 1px 0 var(--ink)',
                soft: '0 10px 30px -12px rgb(42 31 22 / 0.25)',
            },
            keyframes: {
                'checker-shimmer': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '24px 0' },
                },
            },
            animation: {
                'checker-shimmer': 'checker-shimmer 0.8s steps(2) infinite',
            },
        },
    },
    plugins: [],
};
