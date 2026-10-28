export const closedAt = 0.55;
export const minClosedMs = 100;

export class BlinkFilter {
	private closedSince: number | null = null;

	apply(value: number, nowMs: number): number {
		if (value < closedAt) {
			this.closedSince = null;
			return value;
		}
		this.closedSince ??= nowMs;
		return nowMs - this.closedSince >= minClosedMs ? value : 0;
	}
}
