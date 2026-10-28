export type MouthState = 'rest' | 'smile' | 'jaw-open' | 'round' | 'frown' | 'press' | 'lip-bite';

interface MouthRule {
	state: Exclude<MouthState, 'rest'>;
	input: string;
	gain: number;
	enter: number;
	exit: number;
}

const rules: readonly MouthRule[] = [
	{ state: 'smile', input: 'mouthSmile', gain: 1, enter: 0.5, exit: 0.4 },
	{ state: 'jaw-open', input: 'jawOpen', gain: 1, enter: 0.5, exit: 0.4 },
	{ state: 'round', input: 'mouthFunnel', gain: 1.2, enter: 0.08, exit: 0.02 },
	{ state: 'frown', input: 'mouthFrown', gain: 2.5, enter: 0.35, exit: 0.25 },
	{ state: 'press', input: 'mouthPress', gain: 2.5, enter: 0.08, exit: 0.02 },
	{ state: 'lip-bite', input: 'mouthRollLower', gain: 1, enter: 0.5, exit: 0.4 },
];

export const mouthInputs: readonly string[] = rules.map((rule) => rule.input);

export const classifyMouth = (
	calibrated: Readonly<Record<string, number>>,
	previous: MouthState,
): MouthState => {
	let best: MouthState = 'rest';
	let bestValue = -Infinity;
	for (const rule of rules) {
		const value = Math.min(1, (calibrated[rule.input] ?? 0) * rule.gain);
		const isOn = rule.state === previous ? value > rule.exit : value >= rule.enter;
		if (!isOn || value <= bestValue) continue;
		best = rule.state;
		bestValue = value;
	}
	return best;
};
