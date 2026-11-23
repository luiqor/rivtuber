// Time constant of the smoothing, in ms. Lower follows faster but jitters more.
// Measured detection runs about every 12 ms, and 23 ms matches the old weight of 0.4 per frame there.
// Slower smoothing flattens a blink below the closed threshold before it peaks.
export const smoothingMs = 23;

export class Smoother {
	private current: number | null = null;

	constructor(private readonly timeMs = smoothingMs) {}

	apply(value: number, dtMs: number): number {
		if (this.current === null || dtMs <= 0) {
			this.current ??= value;
			return this.current;
		}
		const weight = 1 - Math.exp(-dtMs / this.timeMs);
		this.current += (value - this.current) * weight;
		return this.current;
	}
}
