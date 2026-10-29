export type MouthState = 'rest' | 'smile' | 'jaw-open' | 'round' | 'frown' | 'press' | 'lip-bite';

interface MouthRule {
	state: Exclude<MouthState, 'rest'>;
	input: string;
	gain: number;
	enter: number;
	exit: number;
}

const rules: readonly MouthRule[] = [
	{ state: 'smile', input: 'mouthSmile', gain: 1.5, enter: 0.4, exit: 0.3 },
	{ state: 'jaw-open', input: 'jawOpen', gain: 4, enter: 0.25, exit: 0.1 },
	{ state: 'round', input: 'mouthFunnel', gain: 1.2, enter: 0.3, exit: 0.15 },
	{ state: 'frown', input: 'mouthFrown', gain: 2.5, enter: 0.35, exit: 0.25 },
	{ state: 'press', input: 'mouthPress', gain: 2.5, enter: 0.35, exit: 0.2 },
	{ state: 'lip-bite', input: 'mouthRollLower', gain: 1.5, enter: 0.4, exit: 0.25 },
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

// Speech flips the jaw open and closed within a few frames, which would restart the rig's transitions.
// Leaving a state is slower than entering one so the gaps between syllables don't drop back to rest.
export const enterMs = 60;
export const restMs = 150;

export class MouthSettle {
	private current: MouthState = 'rest';
	private pending: MouthState | null = null;
	private pendingSince = 0;

	apply(candidate: MouthState, nowMs: number): MouthState {
		if (candidate === this.current) {
			this.pending = null;
			return this.current;
		}
		if (this.pending !== candidate) {
			this.pending = candidate;
			this.pendingSince = nowMs;
		}
		const delay = candidate === 'rest' ? restMs : enterMs;
		if (nowMs - this.pendingSince >= delay) {
			this.current = candidate;
			this.pending = null;
		}
		return this.current;
	}
}
