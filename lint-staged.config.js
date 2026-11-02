const outsideScratch = (files) => files.filter((file) => !file.includes('/.scratch/'));

export default {
	'*': 'prettier --write --ignore-unknown',
	'*.{js,ts,svelte}': (files) => {
		const linted = outsideScratch(files);
		return linted.length > 0 ? `eslint --max-warnings 0 ${linted.join(' ')}` : [];
	},
	'*.{css,svelte}': (files) => {
		const linted = outsideScratch(files);
		return linted.length > 0 ? `stylelint --max-warnings 0 ${linted.join(' ')}` : [];
	},
};
