import { headPose } from '#lib/engine/head-pose.js';
import { trackedNumbers } from '#lib/engine/blendshapes.js';
import { Smoother } from '#lib/engine/smoother.js';
import { isBlinking, PupilHold } from '#lib/engine/pupil-hold.js';
import { linkEyes } from '#lib/engine/eye-link.js';
import {
	classifyEyelid,
	squintFloor,
	EyelidSettle,
	TurnGate,
	openEyelid,
	type EyelidState,
} from '#lib/engine/eyelid-state.js';
import { classifyMouth, MouthSettle, type MouthState } from '#lib/engine/mouth-state.js';
import { combineJaw } from '#lib/engine/mic-jaw.js';
import { calibrateAll, NeutralCapture, type Profile } from '#lib/engine/calibration.js';
import { createFaceDetector, type FaceDetector } from '#lib/mediapipe/face-detector.js';
import { startMicLevel, type MicLevel } from './mic-level.js';
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
		mic: MicLevel | null;
		frame: number;
		isStopped: boolean;
		lastVideoTime: number;
		lastFrameMs: number | null;
		mouthCandidate: MouthState;
		mouthState: MouthState;
		eyelids: Partial<Record<string, EyelidState>>;
		capture: NeutralCapture | null;
	} = {
		capture: null,
		detector: null,
		mic: null,
		frame: 0,
		lastVideoTime: -1,
		lastFrameMs: null,
		mouthCandidate: 'rest',
		mouthState: 'rest',
		eyelids: {},
		isStopped: false,
	};

	const eyeSignals = ['eyeBlink', 'eyeSquint', 'eyeWide', 'browDown'];

	const eyeSmoothers = Object.fromEntries(
		[
			...eyeSignals.flatMap((signal) => ['Left', 'Right'].map((side) => `${signal}${side}`)),
			'pupilX',
			'pupilY',
		].map((name) => [name, new Smoother()] as const),
	);

	const turnGate = new TurnGate();
	const mouthSettle = new MouthSettle();

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
		session.mic?.stop();
		setFaceTracking(false);
	};

	const hasStopped = () => session.isStopped;

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

	// The mic is optional. Without it the jaw follows the camera alone.
	session.mic = await startMicLevel().catch(() => null);
	if (hasStopped()) {
		stop();
		return { stop, calibrate };
	}
	const readMic = () => session.mic?.read() ?? 0;

	const tick = () => {
		const { detector } = session;
		if (!detector || session.isStopped) return;

		if (video.currentTime !== session.lastVideoTime) {
			session.lastVideoTime = video.currentTime;
			const now = performance.now();
			const dtMs = session.lastFrameMs === null ? 0 : now - session.lastFrameMs;
			session.lastFrameMs = now;
			const frame = detector.detect(video, now);
			setFaceTracking(Boolean(frame));
			if (frame) {
				const raw = {
					...trackedNumbers(frame.blendshapes),
					...(frame.headMatrix && headPose(frame.headMatrix)),
				};
				session.capture?.add(raw);
				const calibrated = calibrateAll(raw, getProfile());
				calibrated.jawOpen = combineJaw(calibrated.jawOpen, readMic());
				for (const [name, smoother] of Object.entries(eyeSmoothers)) {
					calibrated[name] = smoother.apply(calibrated[name] ?? 0, dtMs);
				}
				const turnX = calibrated.headTurnX;
				const isTurned = turnGate.apply(turnX);
				for (const signal of eyeSignals) {
					const linked = linkEyes(
						{ Left: calibrated[`${signal}Left`] ?? 0, Right: calibrated[`${signal}Right`] ?? 0 },
						isTurned,
						turnX,
					);
					calibrated[`${signal}Left`] = linked.Left;
					calibrated[`${signal}Right`] = linked.Right;
				}
				const isHeld = isBlinking(calibrated.eyeBlinkLeft, calibrated.eyeBlinkRight);
				for (const [name, hold] of Object.entries(pupilHolds)) {
					calibrated[name] = hold.apply(calibrated[name] ?? 0, isHeld);
				}
				for (const [name, value] of Object.entries(calibrated)) {
					const property = rig.instance.number(name);
					if (property) property.value = value;
				}
				session.mouthCandidate = classifyMouth(calibrated, session.mouthCandidate);
				session.mouthState = mouthSettle.apply(session.mouthCandidate, now);
				const mouth = rig.instance.enum('mouthState');
				if (mouth && mouth.value !== session.mouthState) mouth.value = session.mouthState;
				const sides = ['Left', 'Right'] as const;
				const candidates = Object.fromEntries(
					sides.map((side) => [
						side,
						classifyEyelid(
							calibrated[`eyeBlink${side}`] ?? 0,
							calibrated[`eyeSquint${side}`] ?? 0,
							calibrated[`eyeWide${side}`] ?? 0,
							calibrated[`browDown${side}`] ?? 0,
							session.eyelids[side] ?? openEyelid,
						),
					]),
				) as Record<(typeof sides)[number], EyelidState>;
				const settled = Object.fromEntries(
					sides.map((side) => [side, eyelidSettles[side].apply(candidates[side], now)]),
				) as Record<(typeof sides)[number], EyelidState>;
				const isBothClosing =
					candidates.Left.upper === 'closed' && candidates.Right.upper === 'closed';
				const closedSide = sides.find((side) => settled[side].upper === 'closed');
				if (isBothClosing && closedSide) {
					for (const side of sides) {
						eyelidSettles[side].force(settled[closedSide]);
						settled[side] = settled[closedSide];
					}
				}
				for (const side of sides) {
					const eyelid = settled[side];
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
