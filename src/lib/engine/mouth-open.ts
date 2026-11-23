// FaceMesh landmark indices.
const upperLipInner = 13;
const lowerLipInner = 14;
const eyeOuterRight = 33;
const eyeOuterLeft = 263;

// Lip gap divided by eye-corner distance when the mouth is wide open. Estimated, not measured on many faces.
export const fullOpenRatio = 0.5;

interface Point {
	x: number;
	y: number;
}

// Landmarks are normalized to the frame's width and height separately, so x is rescaled to y's units.
const distance = (a: Point, b: Point, aspect: number): number =>
	Math.hypot((a.x - b.x) * aspect, a.y - b.y);

// How open the mouth is, 0 when the lips touch and about 1 when wide open.
// Divided by eye-corner distance, which the jaw does not move, so distance from the camera cancels out.
export const mouthOpenness = (landmarks: readonly Point[], aspect: number): number | null => {
	const [upper, lower, right, left] = [
		upperLipInner,
		lowerLipInner,
		eyeOuterRight,
		eyeOuterLeft,
	].map((index) => landmarks.at(index));
	if (!upper || !lower || !right || !left) return null;
	const eyeSpan = distance(right, left, aspect);
	return eyeSpan === 0 ? null : distance(upper, lower, aspect) / eyeSpan / fullOpenRatio;
};
