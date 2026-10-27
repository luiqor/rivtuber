import { defaultProfile, parseProfile, type Profile } from '#lib/engine/calibration.js';
import { readItem, writeItem } from '#lib/local-storage.js';

const key = 'rivtuber.profile';
const saveDelayMs = 1000;

export const loadProfile = (): Promise<Profile> =>
	readItem(key)
		.then((text) => (text === null ? defaultProfile() : parseProfile(text)))
		.catch((error: unknown) => {
			console.error(error);
			return defaultProfile();
		});

export const saveProfile = (profile: Profile): Promise<void> =>
	writeItem(key, JSON.stringify(profile)).catch((error: unknown) => {
		console.error(error);
	});

export interface ProfileSaver {
	save: (profile: Profile) => void;
	flush: () => Promise<void>;
}

// Coalesces bursts of changes into one write, about a second after the last.
export const createProfileSaver = (delayMs = saveDelayMs): ProfileSaver => {
	const pending: { timer: ReturnType<typeof setTimeout> | null; profile: Profile | null } = {
		timer: null,
		profile: null,
	};

	const cancel = () => {
		if (pending.timer !== null) clearTimeout(pending.timer);
		pending.timer = null;
	};

	const flush = async () => {
		cancel();
		const { profile } = pending;
		pending.profile = null;
		if (profile) await saveProfile(profile);
	};

	const save = (profile: Profile) => {
		pending.profile = profile;
		cancel();
		pending.timer = setTimeout(() => void flush(), delayMs);
	};

	return { save, flush };
};
