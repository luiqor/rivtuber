import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Resolved from the package itself, not a relative node_modules path. Globs need forward slashes on every OS.
const mediapipeEntry = fileURLToPath(import.meta.resolve('@mediapipe/tasks-vision'));
const mediapipeWasm = path
	.join(path.dirname(mediapipeEntry), 'wasm', '*')
	.replaceAll(path.sep, '/');

export default defineConfig({
	plugins: [
		tailwindcss(),
		// MediaPipe loads its wasm at runtime, so the files from the installed package are served locally.
		viteStaticCopy({
			targets: [
				{
					src: mediapipeWasm,
					dest: 'mediapipe/wasm',
					rename: { stripBase: true },
				},
			],
		}),
		sveltekit({
			compilerOptions: {
				// undefined leaves node_modules files to the compiler's own detection.
				runes: ({ filename }) =>
					// undefined leaves node_modules files to the compiler's own detection.
					// eslint-disable-next-line no-undefined
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},

			adapter: adapter(),
		}),
	],
});
