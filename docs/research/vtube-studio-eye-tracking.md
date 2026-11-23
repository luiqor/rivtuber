# VTube Studio eye tracking vs. rivtuber

Researched 2026-11-23. Sources: the VTube Studio (VTS) wiki (git clone of `DenchiSoft/VTubeStudio.wiki`), the VTS API README (`DenchiSoft/VTubeStudio`), the Live2D standard parameter list, and the OpenSeeFace README. "Not documented" means I searched those sources and found nothing. It is not a guess about what VTS does internally.

Wiki base URL: `W = https://github.com/DenchiSoft/VTubeStudio/wiki/`

Note: the wiki has no pages called "Eye Tracking", "Blinking", "Parameter smoothing", "Calibration", "Input/Output Parameters" or "iPhone tracking". That material is spread across `VTS-Model-Settings`, `VTube-Studio-Settings`, the tracker pages and `Android-vs.-iPhone-vs.-Webcam`. The repo has no `GLOSSARY.md` and no `docs/adr/`.

## 1. VTube Studio: findings

### 1.1 Eye input parameters
- Eye inputs are **EyeOpenLeft** and **EyeOpenRight** ("how open your left/right eye is") and **EyeLeftX/EyeLeftY** and **EyeRightX/EyeRightY** ("eye-tracking"). Every backend provides them: iOS, Android, webcam (OpenSeeFace), NVIDIA and MediaPipe. Source: W`VTS-Model-Settings` (input table).
- So VTS gives **separate X/Y gaze per eye** and separate openness per eye. The table lists no eye squint, eye wide or eye-smile input. The only eye-adjacent inputs are **BrowLeftY/BrowRightY/Brows** and **CheekPuff** (iOS only). Same source.
- **The numeric ranges of EyeOpen\* and EyeX/Y are not documented.** The wiki only gives an example range for MouthOpen ("within the range [0, 1]"). The API's `InputParameterListResponse` returns `min`/`max` for each default parameter, but its example only shows FaceAngleX (-30..30) and FacePositionX (-10..10) and says the list "is incomplete" (https://github.com/DenchiSoft/VTubeStudio#requesting-list-of-available-tracking-parameters). The real eye ranges could be read from a running VTS through that API.
- **How EyeX/Y is computed from the tracker output is not documented.** For NVIDIA the wiki says: "you cannot directly use those blendshapes in VTube Studio: VTS uses its own code to calculate tracking parameters based on those blendshapes" (W`NVIDIA-Webcam-Tracker`).

### 1.2 Mapping input to output (applies to each parameter)
From W`VTS-Model-Settings`:
- Any input maps to any Live2D output parameter, with a configurable linear IN range to OUT range.
- "Limit Range" clamps the value and "will also cause the value to stop smoothly when approaching the limits."
- "Generally, it is recommended to only change the output range and leave the input range as is."
- **Smoothing is a slider on each parameter**: "More smoothing will make the movements less shaky but will introduce lag… On iOS, you will most likely need very little smoothing." **The default values and the filter type are not documented.**
- **Auto-blink** "will randomly reduce the parameter to zero. This can be combined with an input parameter, but none is necessary." Its timing and shape are not documented.
- Auto-setup maps standard Live2D IDs (it links to the Live2D standard parameter list).

### 1.3 Linking or syncing the two eyes
- iOS/Android tracking config, "eye-blink linking": **Always** sets both EyeOpen values to their average. **When face is rotated** links them when the head turns far to one side, using "the value of the eye that is still visible" (W`VTube-Studio-Settings`).
- Webcam, "Link Eye Blinking": "**recommended** to set this to 'When face is rotated'… the other visible eye will be used to control blinking" (W`VTube-Studio-Settings`, "Link Eye Blinking").
- **The rotation threshold for "too much to the side" is not documented.**
- iOS "Tracking V2 → Better winking: When one eye is fully closed and the other one isn't, this will force the partially open eye a bit more open" (W`VTube-Studio-Settings`).
- **The wiki says nothing about linking gaze (X/Y).** It only describes linking EyeOpen.

### 1.4 Calibration
- Webcam: calibrate "while looking at the camera with a neutral face". The calibration is saved to `webcam_calibration.json` and also runs automatically "right after turning the camera on". It "resets the face position to looking forward" (W`VTube-Studio-Settings`).
- Webcam "Parameter Calc. Mode": **Automatic** (older) "requires an initial ~10 second warmup phase". **Manual** (the default) uses sensitivity sliders plus a neutral-face calibration (same page). What Automatic actually computes is not documented.
- MediaPipe: "calibrate at least once while making a neutral face and looking straight at the screen". The data is remembered (W`Mediapipe-Webcam-Tracker`).
- **NVIDIA has the only documented formula.** Each blendshape gets `Offset` (the zero point, "the blendshape output will stay at 0 until the input has reached" it) and `Scale` (both "Automatically set by calibration", so the slope "perfectly reaches X=1/Y=1"), plus a manual `Exponent`. The function is `1 - max(0, 1 - max(x - OFFSET, 0) * SCALE) ^ EXPONENT` (W`NVIDIA-Webcam-Tracker`, "Finetuning and Calibration"). The offset works as a **dead zone at the bottom of each blendshape**, and the exponent works as an ease-out response curve.
- **A per-model "eye open auto-calibration" that learns min/max over time is not documented.** The per-model IN/OUT ranges in 1.2 are set by hand.

### 1.5 Dead zones
- No eye-specific dead zone is documented. The only threshold-like behaviour documented is the NVIDIA per-blendshape `Offset` (1.4).

### 1.6 "Eye gaze follows head", and eyes closing when looking down
- **No "eye gaze follows head" option is documented** on the wiki. I searched every page for eye/gaze.
- Tobii (Windows) can "Overwrite iPhone/webcam eye X/Y". With that on, VTS "will also make sure the eyes will never fully close as long as the Tobii-tracker still detects your eyes. This solves the problem of eyes closing when you look down" (W`Tobii-Eye-Tracker`). VTS treats looking down and reading as a known false-blink case.
- Mouse/finger input (MousePositionX/Y mapped to [-1, 1]) can drive the eyes, "make your model follow your finger or mouse pointer with its eyes" (W`VTube-Studio-Settings`).

### 1.7 Backends and frame rate
- Webcam: OpenSeeFace (bundled as `OpenSeeFaceTracker_v_1_20_2`, W`Webcam-Troubleshooting`), NVIDIA Broadcast for RTX (W`NVIDIA-Webcam-Tracker`), and Google MediaPipe on Windows (W`Mediapipe-Webcam-Tracker`). Phones: Apple ARKit on iOS and Alter Mocap4Face on Android (W`Android-vs.-iPhone-vs.-Webcam`).
- OpenSeeFace uses a separate "gaze and blink detection model" trained on MPIIGaze and UnityEyes, and gaze tracking can be turned off (https://github.com/emilianavt/OpenSeeFace README). How it computes eye openness is not stated in the README.
- Webcam "blink- and eye-tracking are not as accurate as they are on iOS", and iOS "needs less smoothing" (W`Android-vs.-iPhone-vs.-Webcam`). "Only Level 5 allows winking" on OpenSeeFace quality levels. At least 10 FPS at 1280x720 is recommended "especially… for eye- and blink-tracking" (W`VTube-Studio-Settings`).
- "VTube Studio will interpolate tracking data to 60 FPS (or whatever VTS is running at)" (W`NVIDIA-Webcam-Tracker`, FAQ).
- On face loss, the user picks either "freeze in place" or "return to its default pose" (W`VTube-Studio-Settings`).

### 1.8 Live2D standard eye parameters
From https://docs.live2d.com/en/cubism-editor-manual/standard-parameter-list/:
- `ParamEyeLOpen`/`ParamEyeROpen`: 0..1, default 1. Raise the max (1.5, 2) to open wider, and lower the min (-0.5) to close tightly.
- `ParamEyeLSmile`/`ParamEyeRSmile`: 0..1, default 0.
- `ParamEyeBallX`/`ParamEyeBallY`: -1..1, default 0. "+" means look right or look up.
- `ParamEyeBallForm`: -1..1, optional.

So the standard model has **one shared eyeball X/Y** and **continuous** per-eye openness, where values above 1 mean wide. VTS still produces per-eye X/Y inputs, so the user picks which input drives the single eyeball parameter (or averages them some other way). The wiki doesn't document a default choice.

## 2. rivtuber: current approach

The pipeline runs once per new video frame in `src/lib/rig/face-tracker.ts:135-187`, with MediaPipe blendshapes as input.

- **Gaze.** One shared `pupilX`/`pupilY` in -1..1, built from the 8 `eyeLook*` blendshapes. X is `(OutRight + InLeft - OutLeft - InRight)/2` and Y is `(UpL + UpR - DownL - DownR)/2` (`src/lib/engine/blendshapes.ts:10-24`). The two eyes are averaged, so there is no per-eye gaze.
- **Mirroring.** Left/right eye signals are swapped onto the rig (`src/lib/engine/blendshapes.ts:26-42`).
- **Calibration.** A neutral capture averages every raw signal over a timed window into `offset` (`src/lib/engine/calibration.ts:75-94`, `src/lib/rig/face-tracker.ts:97-106`). Then `calibrate` applies `centered = raw - offset`, returns 0 inside a dead zone (default 0.05, jaw 0.01), multiplies by `gain` (default 1, squint ×2), and clamps pupils to -1..1 and everything else to 0..1 (`src/lib/engine/calibration.ts:11-65`). The neutral blink offset is subtracted too.
- **Smoothing.** An EMA with weight 0.4 on the newest frame (`src/lib/engine/smoother.ts:1-12`). It is applied only to eyeBlink, eyeSquint, eyeWide and browDown on each side (`src/lib/rig/face-tracker.ts:58-62,149-151`). **Gaze is not smoothed.** The smoothing runs per camera frame and is not time-based.
- **Pupil hold during blinks.** If either eye's smoothed blink is >= 0.3, pupilX/Y keep their last value (`src/lib/engine/pupil-hold.ts:1-15`, `src/lib/rig/face-tracker.ts:152-155`).
- **Head-turn hold.** A hysteresis gate turns on at |headTurnX| >= 0.4 and off at <= 0.3. While it is on, all eye signals on both sides are frozen (`src/lib/engine/eyelid-state.ts:26-39`, `src/lib/rig/face-tracker.ts:156-159`).
- **Eye open/blink.** This is **discrete**, not continuous. Each eye is classified into enum states with enter/exit hysteresis: closed at >= 0.55 (reopens < 0.45), squint 0.5/0.4, wide 0.55/0.45, browDown 0.5/0.4 (`src/lib/engine/eyelid-state.ts:12-64`). A new state must persist for 300 ms before it applies (`src/lib/engine/eyelid-state.ts:66-93`, `src/lib/rig/face-tracker.ts:168-178`). In squint, the squint number is floored at 0.8 (`src/lib/engine/eyelid-state.ts:19-20`, `src/lib/rig/face-tracker.ts:183-186`). The commit "hide short blinks" (`ca85a21`) matches this design.
- Eyes are not linked, there is no auto-blink, and there is no wink assistance.

## 3. Side-by-side

| Aspect | VTube Studio | rivtuber |
|---|---|---|
| Gaze outputs | Per-eye X/Y (W`VTS-Model-Settings`) | One shared pupilX/Y (`blendshapes.ts:11-24`) |
| Gaze computation | Not documented ("own code", W`NVIDIA-Webcam-Tracker`) | Linear combination of `eyeLook*` (`blendshapes.ts:11-24`) |
| Eye open | Continuous EyeOpenL/R mapped to Live2D 0..1 (or >1) | Discrete enum states with hysteresis and a 300 ms settle (`eyelid-state.ts:44-93`) |
| Smoothing | Slider per parameter, defaults undocumented. Interpolated to render FPS | Fixed EMA 0.4 per camera frame, eyelid signals only. Gaze unsmoothed (`smoother.ts`, `face-tracker.ts:149-151`) |
| Calibration | Neutral-face calibration. NVIDIA: auto offset plus scale-to-1 and an exponent | Neutral-face offset only. Gain is fixed by hand (`calibration.ts:59-94`) |
| Dead zone | NVIDIA offset acts as a floor. Nothing eye-specific documented | Symmetric 0.05 around neutral (`calibration.ts:12,62`) |
| Head turned | Link EyeOpen to the visible eye, configurable (W`VTube-Studio-Settings`) | Freeze all eye signals at \|turn\| >= 0.4 (`eyelid-state.ts:26-39`) |
| Blink vs. gaze | Not documented | Hold pupils while blink >= 0.3 (`pupil-hold.ts`) |
| Winks | iOS "Better winking" pushes the open eye open | None |
| Looking down closes eyes | Fixed only with Tobii (W`Tobii-Eye-Tracker`) | Not handled |
| Auto-blink | Optional, random | None |
| Face lost | Freeze or return to default | `faceTracking` boolean is set false. Values stay as last written (`face-tracker.ts:140,192`) |

## 4. Recommendations (ranked)

1. **Add a calibrated scale (range), not just an offset.** Follow NVIDIA's documented model: offset from neutral, then scale so the signal reaches 1, with an optional exponent (W`NVIDIA-Webcam-Tracker`). For eyes this means capturing a "closed" pose (or tracking a rolling maximum) so `eyeBlink` reaches 1.0 for each user. That would replace the hard-coded squint ×2 boost (`calibration.ts:48`) and make the 0.55/0.45 thresholds portable between faces. Low risk, fits the existing `SignalCalibration`.
2. **Replace the global head-turn freeze with VTS-style "link when rotated".** VTS's recommended default (W`VTube-Studio-Settings`) copies the visible eye's value to the hidden eye instead of freezing both. Pick the eye by the sign of `headTurnX`. rivtuber's hysteresis gate (`eyelid-state.ts:31-39`) can stay as the trigger.
3. **Smooth gaze, and use time-based smoothing.** VTS smooths every parameter and interpolates to render FPS (W`NVIDIA-Webcam-Tracker`). rivtuber's gaze goes straight to the rig except during blink holds. Use a dt-aware EMA (so behaviour doesn't change with camera FPS) for pupilX/Y. Ideally let the weight be set per signal, like VTS's slider for each parameter.
4. **Wink assist.** Port "Better winking": when one eye is classified closed and the other isn't, bias the other eye toward open (W`VTube-Studio-Settings`). It's cheap in `classifyEyelid` or the per-side loop (`face-tracker.ts:168-187`).
5. **Optional auto-blink and face-lost behaviour.** VTS offers random auto-blink and a freeze-or-default choice on face loss (W`VTS-Model-Settings`, W`VTube-Studio-Settings`). Only worth doing if the Rive rig needs them.
6. **Per-eye gaze: don't adopt yet.** The Live2D standard uses a single EyeBall X/Y (Live2D list). rivtuber's averaged pupil matches that.

## 5. Open questions
- What are the real numeric ranges of VTS's EyeOpen\* and EyeX/Y inputs? Not documented. They could be read with the `InputParameterListRequest` API against a running VTS.
- What are VTS's default smoothing values and filter type? Not documented.
- What head-rotation threshold does "When face is rotated" use? Not documented.
- Does VTS do anything special with gaze during blinks? Not documented, so rivtuber's pupil hold has no VTS counterpart to compare against.
- Is rivtuber's discrete eyelid-state design required by the Rive rig, or could it use continuous openness like Live2D? This decides whether recommendation 1 should feed thresholds or drive the rig directly. It's a question for the project owner.
