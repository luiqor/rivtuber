// MediaPipe blendshape scores by name, all in 0..1.
export type Blendshapes = ReadonlyMap<string, number>;

const score = (shapes: Blendshapes, name: string): number => shapes.get(name) ?? 0;

// Where the rig has one property for a left and right pair, the two scores are averaged.
const average = (shapes: Blendshapes, left: string, right: string): number =>
	(score(shapes, left) + score(shapes, right)) / 2;

export const trackedNumbers = (shapes: Blendshapes): Record<string, number> => ({
	jawOpen: score(shapes, 'jawOpen'),
	mouthSmile: average(shapes, 'mouthSmileLeft', 'mouthSmileRight'),
	mouthFrown: average(shapes, 'mouthFrownLeft', 'mouthFrownRight'),
	mouthPucker: score(shapes, 'mouthPucker'),
	eyeBlinkLeft: score(shapes, 'eyeBlinkLeft'),
	eyeBlinkRight: score(shapes, 'eyeBlinkRight'),
	eyeSquintLeft: score(shapes, 'eyeSquintLeft'),
	eyeSquintRight: score(shapes, 'eyeSquintRight'),
	eyeWideLeft: score(shapes, 'eyeWideLeft'),
	eyeWideRight: score(shapes, 'eyeWideRight'),
});
