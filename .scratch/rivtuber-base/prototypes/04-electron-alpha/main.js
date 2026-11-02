// PROTOTYPE, THROWAWAY. Electron transparency test: does a transparent BrowserWindow keep alpha in OBS Window Capture on macOS?
// Run: npm start (from this folder). Drop catperson.riv on the window.
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		transparent: true,
		frame: false,
		hasShadow: false,
		backgroundColor: '#00000000',
		webPreferences: { contextIsolation: true },
	});
	win.loadFile('index.html');
});

app.on('window-all-closed', () => {
	app.quit();
});
