// Weight of the newest frame. Lower is smoother but lags more.
export const smoothing = 0.4;

export class Smoother {
	private current: number | null = null;

	apply(value: number): number {
		this.current =
			this.current === null ? value : this.current + (value - this.current) * smoothing;
		return this.current;
	}
}
