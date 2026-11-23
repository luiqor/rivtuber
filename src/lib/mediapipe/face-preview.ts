import { DrawingUtils, FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface FacePreview {
	draw: (landmarks: NormalizedLandmark[] | null) => void;
}

// Draws the tracked face as contour lines, so tracking can be checked without showing the camera image.
export const createFacePreview = (canvas: HTMLCanvasElement): FacePreview | null => {
	const context = canvas.getContext('2d');
	if (!context) return null;
	const drawing = new DrawingUtils(context);
	return {
		draw: (landmarks) => {
			context.clearRect(0, 0, canvas.width, canvas.height);
			if (!landmarks) return;
			// Follows the canvas's CSS text colour, so the lines match the page theme.
			drawing.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
				color: getComputedStyle(canvas).color,
				lineWidth: 2,
			});
		},
	};
};
