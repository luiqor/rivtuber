<script lang="ts">
	import { groupControls } from './controls.js';
	import type { Rig } from './load-rig.js';

	const { rig }: { rig: Rig } = $props();

	const groups = $derived(groupControls(rig.properties));

	const toHex = (argb: number): string =>
		`#${((argb >>> 0) % 16_777_216).toString(16).padStart(6, '0')}`;

	const numberValue = (name: string) => rig.instance.number(name)?.value ?? 0;
	const isChecked = (name: string) => rig.instance.boolean(name)?.value ?? false;
	const colorValue = (name: string) => toHex(rig.instance.color(name)?.value ?? 0);
	const enumValue = (name: string) => rig.instance.enum(name)?.value ?? '';
	const enumValues = (name: string) => rig.instance.enum(name)?.values ?? [];
	const stringValue = (name: string) => rig.instance.string(name)?.value ?? '';

	const setNumber = (name: string, value: number) => {
		const property = rig.instance.number(name);
		if (property) property.value = value;
	};

	const setChecked = (name: string, isOn: boolean) => {
		const property = rig.instance.boolean(name);
		if (property) property.value = isOn;
	};

	// Colors arrive as hex from the picker. The alpha channel is kept from the rig.
	const setColor = (name: string, hex: string) => {
		const property = rig.instance.color(name);
		if (!property) return;
		const alpha = (property.value >>> 24) & 255;
		property.argb(
			alpha,
			Number.parseInt(hex.slice(1, 3), 16),
			Number.parseInt(hex.slice(3, 5), 16),
			Number.parseInt(hex.slice(5, 7), 16),
		);
	};

	const setEnum = (name: string, value: string) => {
		const property = rig.instance.enum(name);
		if (property) property.value = value;
	};

	const setString = (name: string, value: string) => {
		const property = rig.instance.string(name);
		if (property) property.value = value;
	};
</script>

<div class="flex flex-col gap-4">
	{#each groups as group (group.type)}
		<details open class="rounded-sm border p-3">
			<summary class="cursor-pointer font-semibold"
				>{group.label} ({group.properties.length})</summary
			>
			<ul class="mt-2 flex flex-col gap-2">
				{#each group.properties as property (property.name)}
					<li class="flex items-center justify-between gap-2">
						<span class="font-mono text-sm break-all">{property.name}</span>

						{#if property.type === 'number'}
							<input
								type="number"
								step="any"
								aria-label={property.name}
								class="w-32 rounded-sm border px-2 py-1"
								value={numberValue(property.name)}
								oninput={(event) => {
									setNumber(property.name, event.currentTarget.valueAsNumber);
								}}
							/>
						{:else if property.type === 'boolean'}
							<input
								type="checkbox"
								aria-label={property.name}
								checked={isChecked(property.name)}
								onchange={(event) => {
									setChecked(property.name, event.currentTarget.checked);
								}}
							/>
						{:else if property.type === 'color'}
							<input
								type="color"
								aria-label={property.name}
								value={colorValue(property.name)}
								oninput={(event) => {
									setColor(property.name, event.currentTarget.value);
								}}
							/>
						{:else if property.type === 'enumType'}
							<select
								aria-label={property.name}
								class="w-40 rounded-sm border px-2 py-1"
								value={enumValue(property.name)}
								onchange={(event) => {
									setEnum(property.name, event.currentTarget.value);
								}}
							>
								{#each enumValues(property.name) as option (option)}
									<option value={option}>{option}</option>
								{/each}
							</select>
						{:else if property.type === 'trigger'}
							<button
								type="button"
								aria-label={property.name}
								class="cursor-pointer rounded-sm border px-3 py-1"
								onclick={() => {
									rig.instance.trigger(property.name)?.trigger();
								}}
							>
								Fire
							</button>
						{:else if property.type === 'string'}
							<input
								type="text"
								aria-label={property.name}
								class="w-40 rounded-sm border px-2 py-1"
								value={stringValue(property.name)}
								oninput={(event) => {
									setString(property.name, event.currentTarget.value);
								}}
							/>
						{/if}
					</li>
				{/each}
			</ul>
		</details>
	{/each}
</div>
