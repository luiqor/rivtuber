import { headPose } from '#lib/engine/head-pose.js';
import { trackedNumbers } from '#lib/engine/blendshapes.js';
import { calibrateAll, NeutralCapture, type Profile } from '#lib/engine/calibration.js';
import { createFaceDetector, type FaceDetector } from '#lib/mediapipe/face-detector.js';
import type { Rig } from './load-rig.js';

export interface FaceTracker {
	stop: () => void;
	// Averages the raw signals over durationMs and resolves with the profile whose offsets are that average.
	calibrate: (durationMs: number) => Promise<Profile>;
}

// Writes straight to the rig every frame. The values never pass through Svelte state.
export const startFaceTracking = async (
	rig: Rig,
	video: HTMLVideoElement,
	getProfile: () => Profile,
): Promise<FaceTracker> => {
	const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
	video.srcObject = stream;
	video.muted = true;

	const session: {
		detector: FaceDetector | null;
		frame: number;
		isStopped: boolean;
		lastVideoTime: number;
		capture: NeutralCapture | null;
	} = {
		capture: null,
		detector: null,
		frame: 0,
		lastVideoTime: -1,
		isStopped: false,
	};

	const setFaceTracking = (isOn: boolean) => {
		const property = rig.instance.boolean('faceTracking');
		if (property) property.value = isOn;
	};

	const stop = () => {
		session.isStopped = true;
		cancelAnimationFrame(session.frame);
		for (const track of stream.getTracks()) track.stop();
		video.srcObject = null;
		session.detector?.close();
		setFaceTracking(false);
	};

	const calibrate = (durationMs: number): Promise<Profile> => {
		const capture = new NeutralCapture();
		session.capture = capture;
		return new Promise((resolve) => {
			setTimeout(() => {
				session.capture = null;
				resolve(capture.apply(getProfile()));
			}, durationMs);
		});
	};

	await video
		.play()
		.then(createFaceDetector)
		.then((detector) => {
			session.detector = detector;
		})
		.catch((error: unknown) => {
			stop();
			throw error;
		});
	// stop() may have run while the model was loading.
	if (session.isStopped) {
		stop();
		return { stop, calibrate };
	}

	const tick = () => {
		const { detector } = session;
		if (!detector || session.isStopped) return;

		if (video.currentTime !== session.lastVideoTime) {
			session.lastVideoTime = video.currentTime;
			const frame = detector.detect(video, performance.now());
			setFaceTracking(Boolean(frame));
			if (frame) {
				const raw = {
					...trackedNumbers(frame.blendshapes),
					...(frame.headMatrix && headPose(frame.headMatrix)),
				};
				session.capture?.add(raw);
				const values = Object.entries(calibrateAll(raw, getProfile()));
				for (const [name, value] of values) {
					const property = rig.instance.number(name);
					if (property) property.value = value;
				}
			}
		}
		session.frame = requestAnimationFrame(tick);
	};
	session.frame = requestAnimationFrame(tick);

	return { stop, calibrate };
};
