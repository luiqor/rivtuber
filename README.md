# rivtuber

Your face drives a [Rive](https://rive.app) character, live from your webcam.

VIDEO_URL

## Features

- Face tracking with MediaPipe: blinks, gaze, head turns
- Mouth openness from the camera and the mic
- Neutral-face calibration
- Any Rive rig: its outfits and colors show up as controls

## Run

In the browser:

```sh
npm install
npm run dev
```

Open the page and drop a `.riv` file on it.

As a desktop app, in a transparent Electron window that OBS can capture:

```sh
npm run electron
```
