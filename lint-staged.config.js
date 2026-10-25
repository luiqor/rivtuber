export default {
	'*': 'prettier --write --ignore-unknown',
	'*.{js,ts,svelte}': 'eslint --max-warnings 0',
	'*.{css,svelte}': 'stylelint --max-warnings 0',
};
