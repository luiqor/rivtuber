export type Matrix = ArrayLike<number>;

export interface HeadPose {
	headRot: number;
	headTurnX: number;
	headTurnY: number;
}

// Head angle, in degrees, that maps to the end of the rig's -1..1 input range.
const rollRange = 30;
const yawRange = 30;
const pitchRange = 20;

const toDegrees = 180 / Math.PI;

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

const normalize = (degrees: number, range: number): number => clamp(degrees / range);

export const headPose = (matrix: Matrix): HeadPose => {
	const at = (row: number, column: number): number => matrix[column * 4 + row] ?? 0;
	const yaw = Math.atan2(at(0, 2), at(2, 2)) * toDegrees;
	const pitch = Math.asin(clamp(-at(1, 2))) * toDegrees;
	const roll = Math.atan2(at(1, 0), at(1, 1)) * toDegrees;
	return {
		headRot: normalize(roll, rollRange),
		headTurnX: normalize(-yaw, yawRange),
		headTurnY: normalize(-pitch, pitchRange),
	};
};
