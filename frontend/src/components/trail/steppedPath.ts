/**
 * Stepped (pixel) trail path geometry (spec §9A). Quantised to an 8px pixel
 * grid so elbows land on cells.
 */

/** Quantise to the 8px pixel grid. */
const q = (v: number): number => Math.round(v / 8) * 8;

/**
 * Stepped path (pixel trail): horizontal to mid, vertical, horizontal to
 * target.
 */
export function steppedPath(sx: number, sy: number, tx: number, ty: number): string {
    const x0 = q(sx);
    const y0 = q(sy);
    const x1 = q(tx);
    const y1 = q(ty);
    const midX = q((x0 + x1) / 2);
    return `M ${x0} ${y0} L ${midX} ${y0} L ${midX} ${y1} L ${x1} ${y1}`;
}
