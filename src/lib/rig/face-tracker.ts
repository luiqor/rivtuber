import { headPose } from '#lib/engine/head-pose.js';
import { trackedNumbers } from '#lib/engine/blendshapes.js';
import { Smoother } from '#lib/engine/smoother.js';
import { isBlinking, PupilHold } from '#lib/engine/pupil-hold.js';
import {
	classifyEyelid,
	squintFloor,
	EyelidSettle,
	TurnGate,
	openEyelid,
	type EyelidState,
} from '#lib/engine/eyelid-state.js';
import { classifyMouth, type MouthState } from '#lib/engine/mouth-state.js';
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
		mouthState: MouthState;
		eyelids: Partial<Record<string, EyelidState>>;
		capture: NeutralCapture | null;
	} = {
		capture: null,
		detector: null,
		frame: 0,
		lastVideoTime: -1,
		mouthState: 'rest',
		eyelids: {},
		isStopped: false,
	};

	const eyeSmoothers = Object.fromEntries(
		['eyeBlink', 'eyeSquint', 'eyeWide', 'browDown'].flatMap((signal) =>
			['Left', 'Right'].map((side) => [`${signal}${side}`, new Smoother()] as const),
		),
	);

	const eyeHolds = Object.fromEntries(
		['eyeBlink', 'eyeSquint', 'eyeWide', 'browDown'].flatMap((signal) =>
			['Left', 'Right'].map((side) => [`${signal}${side}`, new PupilHold()] as const),
		),
	);

	const turnGate = new TurnGate();

	const eyelidSettles: Record<string, EyelidSettle> = {
		Left: new EyelidSettle(),
		Right: new EyelidSettle(),
	};

	const pupilHolds = { pupilX: new PupilHold(), pupilY: new PupilHold() };

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
			const now = performance.now();
			const frame = detector.detect(video, now);
			setFaceTracking(Boolean(frame));
			if (frame) {
				const raw = {
					...trackedNumbers(frame.blendshapes),
					...(frame.headMatrix && headPose(frame.headMatrix)),
				};
				session.capture?.add(raw);
				const calibrated = calibrateAll(raw, getProfile());
				for (const [name, smoother] of Object.entries(eyeSmoothers)) {
					calibrated[name] = smoother.apply(calibrated[name] ?? 0);
				}
				const isHeld = isBlinking(calibrated.eyeBlinkLeft, calibrated.eyeBlinkRight);
				for (const [name, hold] of Object.entries(pupilHolds)) {
					calibrated[name] = hold.apply(calibrated[name] ?? 0, isHeld);
				}
				const isTurned = turnGate.apply(calibrated.headTurnX);
				for (const [name, hold] of Object.entries(eyeHolds)) {
					calibrated[name] = hold.apply(calibrated[name] ?? 0, isTurned);
				}
				for (const [name, value] of Object.entries(calibrated)) {
					const property = rig.instance.number(name);
					if (property) property.value = value;
				}
				session.mouthState = classifyMouth(calibrated, session.mouthState);
				const mouth = rig.instance.enum('mouthState');
				if (mouth) mouth.value = session.mouthState;
				for (const side of ['Left', 'Right']) {
					const candidate = classifyEyelid(
						calibrated[`eyeBlink${side}`] ?? 0,
						calibrated[`eyeSquint${side}`] ?? 0,
						calibrated[`eyeWide${side}`] ?? 0,
						calibrated[`browDown${side}`] ?? 0,
						session.eyelids[side] ?? openEyelid,
					);
					const eyelid = eyelidSettles[side].apply(candidate, now);
					session.eyelids[side] = eyelid;
					// Compared with the rig's own value, since the rig can reset it. Rive may also restart a transition on every write.
					const upper = rig.instance.enum(`eyelidUp${side}`);
					if (upper && upper.value !== eyelid.upper) upper.value = eyelid.upper;
					const lower = rig.instance.enum(`eyelidDown${side}`);
					if (lower && lower.value !== eyelid.lower) lower.value = eyelid.lower;
					const squintNumber = rig.instance.number(`eyeSquint${side}`);
					if (squintNumber && eyelid.upper === 'squint') {
						squintNumber.value = Math.max(squintNumber.value, squintFloor);
					}
				}
			}
		}
		session.frame = requestAnimationFrame(tick);
	};
	session.frame = requestAnimationFrame(tick);

	return { stop, calibrate };
};
