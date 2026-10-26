<script lang="ts">
	import { onDestroy } from 'svelte';
	import ControlsPanel from '#lib/rig/ControlsPanel.svelte';
	import { loadRig, type Rig } from '#lib/rig/load-rig.js';

	const view: { canvas?: HTMLCanvasElement; rig?: Rig; status: string; failed: boolean } = $state({
		status: 'Drop a .riv file on the page.',
		failed: false,
	});

	const drop = async (file: File) => {
		if (!view.canvas) return;
		view.status = `Loading ${file.name}...`;
		view.failed = false;
		const previous = view.rig;
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

	const allowDrop = (event: DragEvent) => {
		event.preventDefault();
	};

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		const file = event.dataTransfer?.files[0];
		if (file) void drop(file);
	};

	onDestroy(() => {
		view.rig?.dispose();
	});
</script>

<svelte:window ondragover={allowDrop} ondrop={onDrop} />

<main class="p-page">
	<div class="flex flex-col gap-4">
		<canvas bind:this={view.canvas} class="h-96 w-full"></canvas>

		<p class={view.failed ? 'text-brown-700' : 'text-grey-700'}>{view.status}</p>

		{#if view.rig}
			<ControlsPanel rig={view.rig} />
		{/if}
	</div>
</main>
