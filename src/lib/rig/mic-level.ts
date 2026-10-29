import { loudnessDecibels, micJawOpen } from '#lib/engine/mic-jaw.js';

export interface MicLevel {
	// Jaw opening in 0..1 from the mic's current loudness.
	read: () => number;
	stop: () => void;
}

// Browser audio processing would squash quiet speech and gate silence, so it is all off.
export const startMicLevel = async (): Promise<MicLevel> => {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false },
	});
	const context = new AudioContext();
	const analyser = context.createAnalyser();
	context.createMediaStreamSource(stream).connect(analyser);
	const samples = new Float32Array(analyser.fftSize);

	return {
		read: () => {
			analyser.getFloatTimeDomainData(samples);
			return micJawOpen(loudnessDecibels(samples));
		},
		stop: () => {
			for (const track of stream.getTracks()) track.stop();
			void context.close();
		},
	};
};
