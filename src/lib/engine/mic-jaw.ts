// Loudness range that maps to 0..1. Tuned on one voice.
export const silenceDecibels = -60;
export const loudDecibels = -20;
export const jawGain = 1;

// Loudness in dBFS from the RMS of samples in -1..1. Silence gives -Infinity.
export const loudnessDecibels = (samples: Float32Array): number => {
	if (samples.length === 0) return -Infinity;
	let sum = 0;
	for (const sample of samples) sum += sample ** 2;
	return 20 * Math.log10(Math.sqrt(sum / samples.length));
};

export const micJawOpen = (decibels: number): number => {
	const level = (decibels - silenceDecibels) / (loudDecibels - silenceDecibels);
	return Math.max(0, Math.min(1, level * jawGain));
};

// The camera and the mic each see the mouth, so the more open one wins.
export const combineJaw = (camera: number, mic: number): number => Math.max(camera, mic);
