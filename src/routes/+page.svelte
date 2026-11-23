<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { defaultProfile, type Profile } from '#lib/engine/calibration.js';
	import { createProfileSaver, loadProfile } from '#lib/profile-storage.js';
	import ControlsPanel from '#lib/rig/ControlsPanel.svelte';
	import { startFaceTracking, type FaceTracker } from '#lib/rig/face-tracker.js';
	import { loadRig, type Rig } from '#lib/rig/load-rig.js';

	const view: {
		canvas?: HTMLCanvasElement;
		video?: HTMLVideoElement;
		preview?: HTMLCanvasElement;
		rig?: Rig;
		status: string;
		failed: boolean;
		isTracking: boolean;
		isCalibrating: boolean;
		// The wireframe preview is the default, so the camera image only shows when asked for.
		showCamera: boolean;
		// Only the on/off flag is state. Tracked values go straight to the rig.
		tracker: FaceTracker | null;
	} = $state({
		isTracking: false,
		isCalibrating: false,
		showCamera: false,
		tracker: null,
		status: 'Drop a .riv file on the page.',
		failed: false,
	});

	const isCameraShown = $derived(view.isTracking && view.showCamera);
	const isWireframeShown = $derived(view.isTracking && !view.showCamera);

	const calibration = { profile: defaultProfile(), saver: createProfileSaver() };
	const calibrationSeconds = 3;

	const setProfile = (profile: Profile) => {
		calibration.profile = profile;
		calibration.saver.save(profile);
	};

	const calibrateNeutral = async () => {
		const { tracker } = view;
		if (!tracker || view.isCalibrating) return;
		view.isCalibrating = true;
		await tracker
			.calibrate(calibrationSeconds * 1000)
			.then(setProfile)
			.finally(() => {
				view.isCalibrating = false;
			});
	};

	const useStoredProfile = (profile: Profile) => {
		calibration.profile = profile;
	};

	const flushProfile = () => {
		void calibration.saver.flush();
	};

	onMount(() => {
		void loadProfile().then(useStoredProfile);
		return flushProfile;
	});

	const drop = async (file: File) => {
		if (!view.canvas) return;
		view.status = `Loading ${file.name}...`;
		view.failed = false;
		const previous = view.rig;
		stopTracking();
		await loadRig(await file.arrayBuffer(), view.canvas)
			.then((rig) => {
				previous?.dispose();
				view.rig = rig;
				view.status = `${file.name}: ${String(rig.properties.length)} properties.`;
			})
			.catch((error: unknown) => {
				console.error(error);
				view.failed = true;
				view.status = `Could not load ${file.name}: ${error instanceof Error ? error.message : 'unknown error'}`;
			});
	};

	const stopTracking = () => {
		view.tracker?.stop();
		view.tracker = null;
		view.isTracking = false;
		view.isCalibrating = false;
	};

	const toggleTracking = async () => {
		if (view.tracker) {
			stopTracking();
			return;
		}
		if (!view.rig || !view.video || !view.preview) return;
		view.isTracking = true;
		await startFaceTracking(view.rig, view.video, () => calibration.profile, view.preview)
			.then((started) => {
				// The toggle may have been switched off, or the rig replaced, while the camera was starting.
				if (view.isTracking) view.tracker = started;
				else started.stop();
			})
			.catch((error: unknown) => {
				console.error(error);
				view.isTracking = false;
				view.failed = true;
				view.status = `Could not start tracking: ${error instanceof Error ? error.message : 'unknown error'}`;
			});
	};

	const allowDrop = (event: DragEvent) => {
		event.preventDefault();
	};

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		const file = event.dataTransfer?.files[0];
		if (file) void drop(file);
	};

	onDestroy(() => {
		stopTracking();
		view.rig?.dispose();
	});
</script>

<svelte:window ondragover={allowDrop} ondrop={onDrop} />

<main class="p-page">
	<div class={['flex flex-col gap-4', 'md:grid md:grid-cols-2']}>
		<div class={['flex flex-col gap-4', 'md:sticky md:top-4 md:self-start']}>
			<canvas bind:this={view.canvas} class="h-96 w-full"></canvas>

			{#if view.rig}
				<label class="flex items-center gap-2">
					<input type="checkbox" checked={view.isTracking} onchange={() => void toggleTracking()} />
					Face tracking
				</label>
				{#if view.tracker}
					<button disabled={view.isCalibrating} onclick={() => void calibrateNeutral()}>
						{view.isCalibrating ? 'Hold a relaxed face...' : 'Calibrate neutral'}
					</button>
				{/if}
			{/if}

			{#if view.isTracking}
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={view.showCamera} />
					Show camera
				</label>
			{/if}

			<!-- Mirrored like a selfie view. Only the previews are flipped, not the frames MediaPipe reads. -->
			<video
				bind:this={view.video}
				muted
				playsinline
				style:transform="scaleX(-1)"
				class={['w-80 rounded-sm', !isCameraShown && 'hidden']}
			></video>
			<!-- Same size as the camera frames, so the landmarks' 0..1 coordinates line up. -->
			<canvas
				bind:this={view.preview}
				width="640"
				height="480"
				style:transform="scaleX(-1)"
				class={['w-80 rounded-sm', 'text-grey-700', !isWireframeShown && 'hidden']}
			></canvas>

			<p class={view.failed ? 'text-brown-700' : 'text-grey-700'}>{view.status}</p>
		</div>

		{#if view.rig}
			<ControlsPanel rig={view.rig} />
		{/if}
	</div>
</main>
