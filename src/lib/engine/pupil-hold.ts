// Blinks drag the eyeLook* scores around, so the pupils hold their last open-eye value while either
// eye is at least this closed.
export const holdAt = 0.3;

export const isBlinking = (leftBlink: number, rightBlink: number): boolean =>
	Math.max(leftBlink, rightBlink) >= holdAt;

export class PupilHold {
	private held = 0;

	apply(value: number, isHeld: boolean): number {
		if (!isHeld) this.held = value;
		return this.held;
	}
}
