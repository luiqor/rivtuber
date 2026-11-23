export type Side = 'Left' | 'Right';

export interface EyePair {
	Left: number;
	Right: number;
}

// Eyes closer than this are treated as one movement and both get the stronger value.
// An average would pull the stronger eye under the eyelid thresholds when one eye scores low, so neither would close.
// A bigger gap is kept as a wink.
export const winkGap = 0.3;

// The side MediaPipe loses when headTurnX is positive. Not yet checked on a real face:
// if turning the head makes the wrong eye copy the other, flip this.
export const hiddenWhenTurnPositive: Side = 'Left';

const other = (side: Side): Side => (side === 'Left' ? 'Right' : 'Left');

export const hiddenSide = (turnX: number): Side =>
	turnX > 0 ? hiddenWhenTurnPositive : other(hiddenWhenTurnPositive);

// Links one eye signal across both eyes.
// Turned head: the hidden eye copies the visible one. Otherwise close values both take the stronger one.
export const linkEyes = (pair: EyePair, isTurned: boolean, turnX: number): EyePair => {
	if (isTurned) {
		const visible = pair[other(hiddenSide(turnX))];
		return { Left: visible, Right: visible };
	}
	if (Math.abs(pair.Left - pair.Right) < winkGap) {
		const stronger = Math.max(pair.Left, pair.Right);
		return { Left: stronger, Right: stronger };
	}
	return pair;
};

// Wink assist: when the eyes differ by a wink-sized gap, the more open eye's blink is scaled down,
// so a wink doesn't leave the other eye half shut.
// It reads the values, not the eyelid states: one eye settling a frame early would otherwise
// halve the other eye's blink and lock a normal blink into a wink.
export const winkOpenScale = 0.5;

export const assistWink = (blink: EyePair): EyePair => {
	if (Math.abs(blink.Left - blink.Right) < winkGap) return blink;
	return blink.Left > blink.Right
		? { Left: blink.Left, Right: blink.Right * winkOpenScale }
		: { Left: blink.Left * winkOpenScale, Right: blink.Right };
};
