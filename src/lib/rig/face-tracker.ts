import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { headPose } from '#lib/engine/head-pose.js';
import { trackedNumbers } from '#lib/engine/blendshapes.js';
import type { Rig } from './load-rig.js';

const wasmUrl = '/mediapipe/wasm';
const modelUrl = '/mediapipe/face_landmarker.task';

export interface FaceTracker {
	stop: () => void;
}

// Writes straight to the rig every frame. The values never pass through Svelte state.
export const startFaceTracking = async (
	rig: Rig,
	video: HTMLVideoElement,
): Promise<FaceTracker> => {
	const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
	video.srcObject = stream;
	video.muted = true;

	const session: {
		landmarker: FaceLandmarker | null;
		frame: number;
		isStopped: boolean;
		lastVideoTime: number;
	} = {
		landmarker: null,
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
		session.landmarker?.close();
		setFaceTracking(false);
	};

	await video
		.play()
		.then(() => FilesetResolver.forVisionTasks(wasmUrl))
		.then((vision) =>
			FaceLandmarker.createFromOptions(vision, {
				baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
				runningMode: 'VIDEO',
				numFaces: 1,
				outputFaceBlendshapes: true,
				outputFacialTransformationMatrixes: true,
			}),
		)
		.then((landmarker) => {
			session.landmarker = landmarker;
		})
		.catch((error: unknown) => {
			stop();
			throw error;
		});
	// stop() may have run while the model was loading.
	if (session.isStopped) {
		stop();
		return { stop };
	}

	const tick = () => {
		const { landmarker } = session;
		if (!landmarker || session.isStopped) return;
		// MediaPipe rejects a repeated timestamp, so a frame is processed only when the video advanced.
		if (video.currentTime !== session.lastVideoTime) {
			session.lastVideoTime = video.currentTime;
			const result = landmarker.detectForVideo(video, performance.now());
			const face = result.faceBlendshapes.at(0);
			const matrix = result.facialTransformationMatrixes.at(0);
			setFaceTracking(Boolean(face));
			if (face) {
				const shapes = new Map(face.categories.map((c) => [c.categoryName, c.score]));
				const values = Object.entries({
					...trackedNumbers(shapes),
					...(matrix && headPose(matrix.data)),
				});
				for (const [name, value] of values) {
					const property = rig.instance.number(name);
					if (property) property.value = value;
				}
			}
		}
		session.frame = requestAnimationFrame(tick);
	};
	session.frame = requestAnimationFrame(tick);

	return { stop };
};
