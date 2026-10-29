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
export const closedAt = 0.55;
// An eye that is already closed stays closed until it drops below this, so a half-closed eye doesn't flicker.
export const reopenAt = 0.45;
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

export class EyelidSettle {
	private current: EyelidState | null = null;
	private pending: EyelidState | null = null;
	private pendingSince = 0;

	apply(candidate: EyelidState, nowMs: number): EyelidState {
		if (this.current === null) {
			this.current = candidate;
			return candidate;
		}
		if (candidate.upper === this.current.upper && candidate.lower === this.current.lower) {
			this.pending = null;
			return this.current;
		}
		if (this.pending?.upper !== candidate.upper || this.pending.lower !== candidate.lower) {
			this.pending = candidate;
			this.pendingSince = nowMs;
		}
		if (nowMs - this.pendingSince >= settleMs) {
			this.current = candidate;
			this.pending = null;
		}
		return this.current;
	}
}
