// Rig properties the app drives from face tracking. They are never shown as generated controls.
export const trackedProperties: ReadonlySet<string> = new Set([
	'faceTracking',
	'jawOpen',
	'mouthSmile',
	'mouthFrown',
	'mouthPucker',
	'eyeBlinkLeft',
	'eyeBlinkRight',
	'eyeSquintLeft',
	'eyeSquintRight',
	'eyeWideLeft',
	'eyeWideRight',
	'headRot',
	'headTurnX',
	'headTurnY',
	'pupilX',
	'pupilY',
]);
