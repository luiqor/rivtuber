// Runs the SvelteKit build in a transparent window so OBS Window Capture keeps alpha.
// The app is served from build/ through a custom scheme because Chromium blocks ES module scripts loaded from file://.
import { app, BrowserWindow, net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const buildDirectory = path.join(import.meta.dirname, '..', 'build');

protocol.registerSchemesAsPrivileged([
	{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// Awaiting app.whenReady() at the top level of this ES module never resolves, so the window is created from the ready event.
app.on('ready', () => {
	protocol.handle('app', (request) => {
		const requested = path.normalize(decodeURIComponent(new URL(request.url).pathname));
		const filePath = requested.endsWith(path.sep)
			? path.join(buildDirectory, requested, 'index.html')
			: path.join(buildDirectory, requested);
		return filePath.startsWith(buildDirectory + path.sep)
			? net.fetch(pathToFileURL(filePath).href)
			: new Response('Not found', { status: 404 });
	});

	const win = new BrowserWindow({
		width: 800,
		height: 600,
		transparent: true,
		frame: true,
		hasShadow: false,
		backgroundColor: '#00000000',
		webPreferences: { contextIsolation: true },
	});
	void win.loadURL('app://rivtuber/');
});

app.on('window-all-closed', () => {
	app.quit();
});
