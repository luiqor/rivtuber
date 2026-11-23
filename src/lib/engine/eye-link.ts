export type Side = 'Left' | 'Right';

export interface EyePair {
	Left: number;
	Right: number;
}

// The side MediaPipe loses when headTurnX is positive. Not yet checked on a real face:
// if turning the head makes the wrong eye copy the other, flip this.
export const hiddenWhenTurnPositive: Side = 'Left';

const other = (side: Side): Side => (side === 'Left' ? 'Right' : 'Left');

export const hiddenSide = (turnX: number): Side =>
	turnX > 0 ? hiddenWhenTurnPositive : other(hiddenWhenTurnPositive);

// Links one eye signal across both eyes, like VTube Studio's "Always" link.
// Turned head: the hidden eye copies the visible one. Otherwise both take the stronger value.
// Webcam winks score too close to blinks to tell apart, and one eye often leads a blink by a few frames,
// so leaving the eyes unlinked showed up as one half-closed eye.
export const linkEyes = (pair: EyePair, isTurned: boolean, turnX: number): EyePair => {
	const value = isTurned ? pair[other(hiddenSide(turnX))] : Math.max(pair.Left, pair.Right);
	return { Left: value, Right: value };
};
