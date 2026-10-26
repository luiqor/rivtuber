import js from '@eslint/js';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import ts from 'typescript-eslint';

const engineFiles = ['src/lib/engine/**/*.{ts,js}'];

export default ts.config(
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/'],
	},
	js.configs.recommended,
	ts.configs.strictTypeChecked,
	ts.configs.stylisticTypeChecked,
	eslintPluginUnicorn.configs.recommended,
	eslintPluginSvelte.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
			globals: globals.browser,
		},
	},
	{
		// Config files are plain JS outside the TypeScript project, so type-aware rules do not apply.
		files: ['**/*.js'],
		extends: [ts.configs.disableTypeChecked],
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: ['.svelte'],
			},
		},
	},
	{
		plugins: {
			'better-tailwindcss': eslintPluginBetterTailwindcss,
		},
		settings: {
			'better-tailwindcss': {
				entryPoint: 'src/app.css',
			},
		},
		rules: {
			...eslintPluginBetterTailwindcss.configs.recommended.rules,
			'better-tailwindcss/no-unknown-classes': 'error',
		},
	},
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-unused-vars': 'error',
			'no-unused-vars': 'off',
			'prefer-const': 'error',
			'func-style': ['error', 'expression'],
			'unicorn/prefer-await': 'off',
			'unicorn/no-null': 'off',
			'no-undefined': 'error',
			'arrow-body-style': ['error', 'as-needed'],
			'unicorn/filename-case': 'off',
			'unicorn/prevent-abbreviations': 'off',
		},
	},
	{
		files: ['**/*.svelte'],
		rules: {
			'unicorn/name-replacements': 'off',
		},
	},
	{
		files: ['src/routes/**/*.{ts,svelte}'],
		rules: {
			'unicorn/consistent-boolean-name': 'off',
		},
	},
	{
		files: engineFiles,
		rules: {
			'no-restricted-globals': ['error', ...Object.keys(globals.browser)],
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{ group: ['svelte', 'svelte/*'], message: 'The engine must not depend on Svelte.' },
						{ group: ['$app', '$app/*'], message: 'The engine must not depend on SvelteKit.' },
					],
				},
			],
		},
	},
);
