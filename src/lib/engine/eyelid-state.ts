export type UpperEyelid =
	'open' | 'half-open' | 'closed' | 'wide' | 'squint' | 'cheek-squint' | 'inner-up' | 'inner-down';
export type LowerEyelid = 'open' | 'closed' | 'raised';

export interface EyelidState {
	upper: UpperEyelid;
	lower: LowerEyelid;
}

export const openEyelid: EyelidState = { upper: 'open', lower: 'open' };

// Enter values are starting values from the rig's script, not yet tuned on a real face.
// Each state is left at a lower exit value, so a signal hovering at the edge doesn't flicker.
// Measured on a real face: open eyes stay under 0.31, blinks peak at 0.54-0.73, so 0.55 missed the weaker blinks.
export const closedAt = 0.45;
// An eye that is already closed stays closed until it drops below this, so a half-closed eye doesn't flicker.
export const reopenAt = 0.35;
export const squintAt = 0.5;
export const squintExitAt = 0.4;
// The rig seems to scale the squint pose by the eyeSquint number, so an eye in the squint state never drops below this.
export const squintFloor = 0.8;
export const wideAt = 0.55;
export const wideExitAt = 0.45;
export const browDownAt = 0.5;
export const browDownExitAt = 0.4;

// MediaPipe's eye scores collapse when the head is turned away, so the eyelids keep their last state past this turn.
export const holdTurnAt = 0.4;

export const releaseTurnAt = 0.3;

export class TurnGate {
	private isTurned = false;

	apply(turnX: number): boolean {
		const turn = Math.abs(turnX);
		this.isTurned = this.isTurned ? turn > releaseTurnAt : turn >= holdTurnAt;
		return this.isTurned;
	}
}

const isOn = (value: number, isActive: boolean, enter: number, exit: number): boolean =>
	isActive ? value > exit : value >= enter;

export const classifyEyelid = (
	blink: number,
	squint: number,
	wide: number,
	browDown: number,
	previous: EyelidState,
): EyelidState => {
	if (isOn(blink, previous.upper === 'closed', closedAt, reopenAt)) {
		return { upper: 'closed', lower: 'closed' };
	}
	if (isOn(squint, previous.upper === 'squint', squintAt, squintExitAt)) {
		return { upper: 'squint', lower: 'raised' };
	}
	if (isOn(wide, previous.upper === 'wide', wideAt, wideExitAt)) {
		return { upper: 'wide', lower: 'open' };
	}
	if (isOn(browDown, previous.upper === 'inner-down', browDownAt, browDownExitAt)) {
		return { upper: 'inner-down', lower: 'open' };
	}
	return openEyelid;
};

// A new eyelid state is only applied once it has been the classifier's answer for this long.
export const settleMs = 300;
// Blinks last about 100-150 ms, so going into or out of closed only waits out single noisy frames.
export const blinkSettleMs = 40;

const isSame = (a: EyelidState, b: EyelidState): boolean =>
	a.upper === b.upper && a.lower === b.lower;

const settleFor = (from: EyelidState, to: EyelidState): number =>
	from.upper === 'closed' || to.upper === 'closed' ? blinkSettleMs : settleMs;

export class EyelidSettle {
	private current: EyelidState | null = null;
	private pending: EyelidState | null = null;
	private pendingSince = 0;

	apply(candidate: EyelidState, nowMs: number): EyelidState {
		if (this.current === null) {
			this.current = candidate;
			return candidate;
		}
		if (isSame(candidate, this.current)) {
			this.pending = null;
			return this.current;
		}
		if (this.pending === null || !isSame(this.pending, candidate)) {
			this.pending = candidate;
			this.pendingSince = nowMs;
		}
		if (nowMs - this.pendingSince >= settleFor(this.current, candidate)) {
			this.current = candidate;
			this.pending = null;
		}
		return this.current;
	}

	// Lets the other eye pull this one into the same state on the same frame, so a blink closes both eyes together.
	force(state: EyelidState): void {
		this.current = state;
		this.pending = null;
	}
}
