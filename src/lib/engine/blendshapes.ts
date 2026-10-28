// MediaPipe blendshape scores by name, all in 0..1.
export type Blendshapes = ReadonlyMap<string, number>;

const score = (shapes: Blendshapes, name: string): number => shapes.get(name) ?? 0;

// Where the rig has one property for a left and right pair, the two scores are averaged.
const average = (shapes: Blendshapes, left: string, right: string): number =>
	(score(shapes, left) + score(shapes, right)) / 2;

// Eye gaze from the eyeLook* blendshapes, each axis in -1..1. Positive X is the user's right, positive Y is up.
const gaze = (shapes: Blendshapes): { pupilX: number; pupilY: number } => ({
	pupilX:
		(score(shapes, 'eyeLookOutRight') +
			score(shapes, 'eyeLookInLeft') -
			score(shapes, 'eyeLookOutLeft') -
			score(shapes, 'eyeLookInRight')) /
		2,
	pupilY:
		(score(shapes, 'eyeLookUpLeft') +
			score(shapes, 'eyeLookUpRight') -
			score(shapes, 'eyeLookDownLeft') -
			score(shapes, 'eyeLookDownRight')) /
		2,
});

// MediaPipe names eyes from the user's side, so the eye pairs are swapped to mirror onto the rig.
export const trackedNumbers = (shapes: Blendshapes): Record<string, number> => ({
	jawOpen: score(shapes, 'jawOpen'),
	mouthSmile: average(shapes, 'mouthSmileLeft', 'mouthSmileRight'),
	mouthFrown: average(shapes, 'mouthFrownLeft', 'mouthFrownRight'),
	mouthPucker: score(shapes, 'mouthPucker'),
	mouthFunnel: score(shapes, 'mouthFunnel'),
	mouthPress: average(shapes, 'mouthPressLeft', 'mouthPressRight'),
	mouthRollLower: score(shapes, 'mouthRollLower'),
	eyeBlinkLeft: score(shapes, 'eyeBlinkRight'),
	eyeBlinkRight: score(shapes, 'eyeBlinkLeft'),
	eyeSquintLeft: score(shapes, 'eyeSquintRight'),
	eyeSquintRight: score(shapes, 'eyeSquintLeft'),
	eyeWideLeft: score(shapes, 'eyeWideRight'),
	eyeWideRight: score(shapes, 'eyeWideLeft'),
	...gaze(shapes),
});
