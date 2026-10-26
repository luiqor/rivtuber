import type { RigProperty } from './load-rig.js';
import { trackedProperties } from './tracked.js';

// Rive data types the panel can edit, in the order their groups appear.
export const controlTypes = [
	'number',
	'boolean',
	'color',
	'enumType',
	'trigger',
	'string',
] as const;

export type ControlType = (typeof controlTypes)[number];

export const controlGroupLabels: Readonly<Record<ControlType, string>> = {
	number: 'Numbers',
	boolean: 'Toggles',
	color: 'Colors',
	enumType: 'Choices',
	trigger: 'Triggers',
	string: 'Text',
};

export interface ControlGroup {
	type: ControlType;
	label: string;
	properties: RigProperty[];
}

const controlsOfType = (properties: RigProperty[], type: ControlType): RigProperty[] =>
	properties
		.filter((property) => property.type === type && !trackedProperties.has(property.name))
		.toSorted((a, b) => a.name.localeCompare(b.name));

// Groups with no controls are left out, so the panel never shows an empty section.
export const groupControls = (properties: RigProperty[]): ControlGroup[] =>
	controlTypes
		.map((type) => ({
			type,
			label: controlGroupLabels[type],
			properties: controlsOfType(properties, type),
		}))
		.filter((group) => group.properties.length > 0);
