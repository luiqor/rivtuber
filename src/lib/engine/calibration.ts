export interface SignalCalibration {
	offset: number;
	gain: number;
	deadzone: number;
}

export interface Profile {
	signals: Record<string, SignalCalibration>;
}

export const defaultGain = 1;
export const defaultDeadzone = 0.05;

export const defaultSignal: SignalCalibration = {
	offset: 0,
	gain: defaultGain,
	deadzone: defaultDeadzone,
};

export const defaultProfile = (): Profile => ({ signals: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const finiteOr = (value: unknown, fallback: number): number =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const parseProfile = (text: string): Profile => {
	const data: unknown = JSON.parse(text);
	const stored = isRecord(data) && isRecord(data.signals) ? data.signals : {};
	const signals = Object.fromEntries(
		Object.entries(stored).map(([name, signal]) => {
			const fields = isRecord(signal) ? signal : {};
			return [
				name,
				{
					offset: finiteOr(fields.offset, 0),
					gain: finiteOr(fields.gain, defaultGain),
					deadzone: finiteOr(fields.deadzone, defaultDeadzone),
				},
			];
		}),
	);
	return { signals };
};

// Squint scores run low on real faces, and the neutral offset eats most of the range, so they get extra gain.
const signalBoost = (name: string): number => (name.startsWith('eyeSquint') ? 2 : 1);

// Speech only opens the mouth a little, so the mouth signals get a smaller deadzone than the stored one.
const jawDeadzone = 0.01;
const smallMotionSignals: ReadonlySet<string> = new Set(['jawOpen', 'mouthOpen']);
const signalDeadzone = (name: string, deadzone: number): number =>
	smallMotionSignals.has(name) ? Math.min(deadzone, jawDeadzone) : deadzone;

// Signals that swing both ways (pupils and head angles) stay in -1..1. The rest stay in 0..1.
const isSigned = (name: string): boolean => name.startsWith('pupil') || name.startsWith('head');

// Removes the neutral offset, ignores movement inside the deadzone, then scales by the gain.
export const calibrate = (name: string, raw: number, profile: Profile): number => {
	const { offset, gain, deadzone } = profile.signals[name] ?? defaultSignal;
	const centered = raw - offset;
	if (Math.abs(centered) < signalDeadzone(name, deadzone)) return 0;
	const scaled = centered * gain * signalBoost(name);
	return Math.max(isSigned(name) ? -1 : 0, Math.min(1, scaled));
};

export const calibrateAll = (
	values: Readonly<Record<string, number>>,
	profile: Profile,
): Record<string, number> =>
	Object.fromEntries(
		Object.entries(values).map(([name, value]) => [name, calibrate(name, value, profile)]),
	);

export class NeutralCapture {
	private readonly sums = new Map<string, number>();
	private count = 0;

	add(values: Readonly<Record<string, number>>): void {
		for (const [name, value] of Object.entries(values)) {
			this.sums.set(name, (this.sums.get(name) ?? 0) + value);
		}
		this.count += 1;
	}

	apply(profile: Profile): Profile {
		if (this.count === 0) return profile;
		const signals = { ...profile.signals };
		for (const [name, sum] of this.sums) {
			signals[name] = { ...(signals[name] ?? defaultSignal), offset: sum / this.count };
		}
		return { signals };
	}
}
