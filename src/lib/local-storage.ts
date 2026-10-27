export const readItem = (key: string): Promise<string | null> =>
	Promise.try(() => localStorage.getItem(key));

export const writeItem = (key: string, value: string): Promise<void> =>
	Promise.try(() => {
		localStorage.setItem(key, value);
	});
