import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const wasmUrl = '/mediapipe/wasm';
const modelUrl = '/mediapipe/face_landmarker.task';

export interface FaceFrame {
	blendshapes: ReadonlyMap<string, number>;
	headMatrix: ArrayLike<number> | null;
}

export interface FaceDetector {
	// Returns null when no face is in the frame. Timestamps must increase between calls.
	detect: (video: HTMLVideoElement, timestampMs: number) => FaceFrame | null;
	close: () => void;
}

export const createFaceDetector = async (): Promise<FaceDetector> => {
	const vision = await FilesetResolver.forVisionTasks(wasmUrl);
	const landmarker = await FaceLandmarker.createFromOptions(vision, {
		baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
		runningMode: 'VIDEO',
		numFaces: 1,
		outputFaceBlendshapes: true,
		outputFacialTransformationMatrixes: true,
	});

	return {
		detect: (video, timestampMs) => {
			const result = landmarker.detectForVideo(video, timestampMs);
			const face = result.faceBlendshapes.at(0);
			if (!face) return null;
			return {
				blendshapes: new Map(face.categories.map((c) => [c.categoryName, c.score])),
				headMatrix: result.facialTransformationMatrixes.at(0)?.data ?? null,
			};
		},
		close: () => {
			landmarker.close();
		},
	};
};
