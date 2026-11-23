# VTube Studio mouth tracking vs. rivtuber

Researched 2026-11-23. Sources are restricted to the official VTube Studio (VTS) wiki, the VTS public API README, and the Live2D Cubism manual. Where a source is silent, this document says "not documented" rather than guessing.

Wiki pages were read from the wiki git repo (`github.com/DenchiSoft/VTubeStudio.wiki.git`); line numbers below refer to those Markdown files.

## 1. VTube Studio findings

### 1.1 Input parameters and ranges

- `MouthOpen` ("how open your mouth is") and `MouthSmile` ("how much you're smiling") are default input parameters on all five tracking backends in the table. `MouthX` (shift mouth left/right) is available on every backend except the third column. Source: https://github.com/DenchiSoft/VTubeStudio/wiki/VTS-Model-Settings (VTS-Model-Settings.md:82-83, :107).
- `MouthOpen` is in [0, 1], where 0 is closed and 1 is fully open (VTS-Model-Settings.md:51). The page gives no explicit range for `MouthSmile`. **Not documented.**
- Voice parameters: `VoiceA/I/U/E/O`, `VoiceSilence`, `VoiceVolume`, `VoiceVolumePlusMouthOpen`, `VoiceFrequency` and `VoiceFrequencyPlusMouthSmile` are each "Between 0 and 1". Source: https://github.com/DenchiSoft/VTubeStudio/wiki/Lipsync (Lipsync.md:50-74).
- `VoiceVolumePlusMouthOpen` = "MouthOpen + VoiceVolume", and `VoiceFrequencyPlusMouthSmile` = "MouthSmile + VoiceFrequency" (VTS-Model-Settings.md:99-100). The wiki does not say whether the sum is clamped, although Lipsync.md:68-71 says the parameter is between 0 and 1. The combine is a **sum, not a max**. The exact clamping is **not documented**.
- `VoiceFrequency` is "calculated based on the detected vowels. You can set up how the vowel detection values are multiplied" (Lipsync.md:71-74). It is meant for models that have only one mouth-shape parameter. The default multipliers are **not documented**.
- Live2D standard parameters: `ParamMouthOpenY` has min 0, default 0, max 1 ("To open further, increase the maximum value to 1.5"). `ParamMouthForm` has range -1..1 with default 0: + is a smile, - is an angry mouth. Source: https://docs.live2d.com/en/cubism-editor-manual/standard-parameter-list/

### 1.2 How mouth open and smile are computed from the camera

- The NVIDIA tracker exposes blendshapes, but "you cannot directly use those blendshapes in VTube Studio: VTS uses its own code to calculate tracking parameters based on those blendshapes" (https://github.com/DenchiSoft/VTubeStudio/wiki/NVIDIA-Webcam-Tracker, NVIDIA-Webcam-Tracker.md:62). **The formulas VTS uses to turn blendshapes into MouthOpen and MouthSmile are not documented** for any backend.
- NVIDIA per-blendshape finetuning: `out = 1 - max(0, 1 - max(x - OFFSET, 0) * SCALE) ^ EXPONENT`. Offset (the zero point, which acts as a dead zone) and Scale (chosen so the curve reaches 1 at x=1) are set by calibration. Exponent sets the curvature and is tuned by hand (NVIDIA-Webcam-Tracker.md:68-72).
- MediaPipe and NVIDIA support "the same parameters you have with iOS tracking, including Mouth X", but not cheek puff or tongue (Mediapipe-Webcam-Tracker.md:40, NVIDIA-Webcam-Tracker.md:153).
- The webcam tracker is OpenSeeFace (Webcam-Troubleshooting.md:52, :76). How OpenSeeFace mouth features map to MouthOpen/MouthSmile is **not documented** in VTS sources.
- iPhone tracking uses ARKit. Android uses Alter Mocap4Face. iOS "is less shaky and needs less smoothing" (Android-vs.-iPhone-vs.-Webcam.md:1, :9).
- Sensitivity: the iOS/Android settings have "various sensitivities... If your mouth doesn't open enough... increase the sensitivity" (VTube-Studio-Settings.md:55). In the webcam's "Manual" parameter mode, sensitivity sliders plus a neutral-face calibration are required. The older "Automatic" mode needs a ~10 s warmup (VTube-Studio-Settings.md:97-103). The slider values and their math are **not documented**.
- "Better frowning" (Tracking V2, iOS): "detecting when the brows are down and subtracting a certain value of MouthSmile" (VTube-Studio-Settings.md:65). The amount is **not documented**.

### 1.3 Calibration

- Webcam: calibrate with a neutral face looking straight at the camera. Calibration runs automatically when the camera starts and is saved to `webcam_calibration.json` (VTube-Studio-Settings.md:82-88). MediaPipe works the same way (Mediapipe-Webcam-Tracker.md:26). There is a "Calibrate Camera" hotkey (VTS-Model-Settings.md:167-168).
- Lipsync: there is a per-vowel calibration, where you press Calibrate while saying each vowel. Silence can also be calibrated, for example on an "mmmm" hum (Lipsync.md:32-40, :138).

### 1.4 Microphone lipsync

- There are two modes. "Simple" is legacy, Windows-only and uses Oculus Lipsync. "Advanced" is based on uLipSync, detects the A/I/U/E/O phonemes and runs on all platforms (Lipsync.md:6-16).
- Sliders (Lipsync.md:22-26):
  - **Volume Gain** boosts `VoiceVolume`, `VoiceVolumePlusMouthOpen` and `VoiceA..O`.
  - **Volume Cutoff** is a noise gate. The wiki recommends keeping it low or at 0 and gating the audio upstream instead.
  - **Frequency Gain** boosts `VoiceFrequency`, `VoiceFrequencyPlusMouthSmile` and `VoiceA..O`.
  - Default and numeric ranges for these sliders are **not documented**. How volume is measured (RMS, dB, and so on) is also **not documented**.
- The vowel outputs "are never 1 at the same time and they only mix at smaller parameter values" (Lipsync.md:113).
- `VoiceSilence` is 1 when silence is detected (based on calibration) or when the volume is near 0 (Lipsync.md:65-67).

### 1.5 Combining camera and mic

The documented recommended setup is a **crossfade gated by silence**, not a max (Lipsync.md:91-130):

- When there is significant sound, the mouth fades toward the mic-driven forms "based on how loud the sound is". When there is little or no sound, it uses the camera forms.
- The model has a `ParamSilence` parameter, driven by `VoiceSilence`. Camera-driven `ParamMouthOpen`/`ParamMouthForm` only deform the mouth when `ParamSilence` = 1. The vowel blendshapes `ParamA..O`, driven by `VoiceA..O`, take over otherwise.
- Auto-setup maps `MouthOpen→ParamMouthOpen`, `MouthSmile→ParamMouthForm`, `VoiceSilence→ParamSilence` and `VoiceA..O→ParamA..O` (Lipsync.md:115-124).
- Turning the mic off forces `ParamSilence` to 1, so the camera has full control (Lipsync.md:130).
- Documented limitations (Lipsync.md:134-138):
  - While speaking, camera tracking is "largely (or fully) ignored", so there are no happy or sad vowel variants.
  - Humming "mmm" opens the mouth because it reads as an A.
- The simpler alternatives are `VoiceVolumePlusMouthOpen` and `VoiceFrequencyPlusMouthSmile`, which are additive.
- The API can mix injected values with tracking using `weight` 0..1, for example to fade control in and out so the value doesn't jump (https://github.com/DenchiSoft/VTubeStudio README, InjectParameterData section, readme lines ~1418-1420).

### 1.6 Per-model mapping, smoothing, dead zones

- Any input can be mapped to any output with free IN and OUT ranges. VTS recommends changing only the output range. "Limit Range" clamps the value and "will also cause the value to stop smoothly when approaching the limits" (VTS-Model-Settings.md:50-54).
- Smoothing is set per parameter. More smoothing means less shake but more lag, and iOS needs very little (VTS-Model-Settings.md:55). **The smoothing algorithm, its slider scale and its default values are not documented** in the wiki. The NVIDIA page says VTS interpolates tracking data up to the app frame rate (NVIDIA-Webcam-Tracker.md:82).
- The only documented camera dead zone is the NVIDIA blendshape `Offset` (§1.2). The Lipsync "Volume Cutoff" is the mic-side gate.

## 2. rivtuber's current approach

- **Camera inputs**: MediaPipe blendshapes:
  - `jawOpen` is the raw score.
  - `mouthSmile` is the average of `mouthSmileLeft/Right`.
  - Also read: frown, pucker, funnel, press and rollLower (src/lib/engine/blendshapes.ts:28-34).
  - All are in 0..1 (blendshapes.ts:1).
- **Calibration**: per signal there is an offset (the neutral-face mean captured by `NeutralCapture`), then a dead zone, then a gain, then a clamp to 0..1 (src/lib/engine/calibration.ts:58-65, :75-93).
  - The default dead zone is 0.05 (calibration.ts:12). `jawOpen` gets min(stored, 0.01) because "speech only opens the jaw a little" (calibration.ts:50-53).
  - The dead zone is a hard cut: values inside it become 0, and outside it the value is not re-zeroed (calibration.ts:62-63). This is different from the NVIDIA offset curve, which shifts the zero point.
- **Mic lipsync**:
  - Uses a WebAudio `AnalyserNode` with noise suppression, echo cancellation and auto gain control all turned off (src/lib/rig/mic-level.ts:10-17).
  - Loudness is the time-domain RMS in dBFS (src/lib/engine/mic-jaw.ts:7-12). It maps linearly from -60 dB to -20 dB onto 0..1, with `jawGain` = 1 and a clamp (mic-jaw.ts:2-4, :14-17). The comment says this was "tuned on one voice".
  - There is no vowel detection, no silence detection beyond the -60 dB floor, and no mic calibration UI.
  - The mic is optional and the camera works alone without it (src/lib/rig/face-tracker.ts:124-130).
- **Combining**: `jawOpen = max(camera, mic)` after calibration (mic-jaw.ts:19-20, face-tracker.ts:148). Smile is camera-only.
- **Smoothing**: the mic value is read once per video frame (face-tracker.ts:130, :148). Mouth signals get **no** continuous smoothing. Only the eyelid and brow signals use `Smoother` (alpha 0.4) (face-tracker.ts:58-62, :149-151; src/lib/engine/smoother.ts:1-2).
- **Mouth state (discrete enum for Rive)**: `classifyMouth` picks the strongest of smile, jaw-open, round (funnel), frown, press and lip-bite (src/lib/engine/mouth-state.ts:11-36).
  - Each input gets its own gain and enter/exit hysteresis. For example, jaw has gain 4, enter at 0.25 and exit at 0.1 (mouth-state.ts:13).
  - `MouthSettle` holds a new state for 60 ms before entering it, and for 150 ms before returning to rest (mouth-state.ts:38-64).
  - Continuous numeric values are also written to every rig number property with a matching name (face-tracker.ts:160-163).

## 3. Side by side

| Aspect | VTube Studio | rivtuber |
|---|---|---|
| Mouth open input | `MouthOpen` 0..1, VTS-internal formula (undocumented) | MediaPipe `jawOpen` 0..1 (blendshapes.ts:28) |
| Smile/form | `MouthSmile`, maps to `ParamMouthForm` -1..1 | avg `mouthSmileL/R` 0..1, plus a separate frown signal |
| Horizontal mouth | `MouthX` | none |
| Camera calibration | neutral-face capture, saved; per-blendshape offset/scale/exponent (NVIDIA) | neutral offset, dead zone, gain, clamp (calibration.ts:58-65) |
| Response curve | exponent curve (NVIDIA) | linear |
| Mic analysis | uLipSync: A/I/U/E/O, silence, volume, frequency | RMS dBFS → linear 0..1 |
| Mic calibration | per-vowel and silence calibration from the user's voice | none (hardcoded -60/-20 dB) |
| Mic controls | Volume Gain, Volume Cutoff (gate), Frequency Gain | constants only (mic-jaw.ts:2-4) |
| Camera+mic combine | silence-gated crossfade to vowel blendshapes; or additive `...PlusMouthOpen` | `max(camera, mic)` on jaw only |
| Smoothing | per-parameter slider, interpolated to app FPS | none on mouth values; hysteresis and settle on the discrete state |
| Output mapping | per-model IN/OUT ranges, Limit Range | fixed by name onto Rive properties |

## 4. Recommendations (ranked)

1. **Expose mic gain and a noise gate and calibrate them, instead of using constants.** VTS gives the user Volume Gain and Volume Cutoff (Lipsync.md:24-25). rivtuber hardcodes -60/-20 dB from one voice (mic-jaw.ts:1-4). A quick approach: capture room noise as the floor (like NeutralCapture) and let the user set the gain.
2. **Add light smoothing or attack/release to the continuous `jawOpen`.** VTS smooths every parameter (VTS-Model-Settings.md:55). Mic RMS per frame is jittery, and today only the discrete state is debounced. A fast attack with a slower release suits speech. The VTS values are undocumented, so tune them by ear.
3. **Make the camera dead zone re-zero, or add an exponent curve.** The NVIDIA curve `1-max(0,1-max(x-off,0)*scale)^exp` (NVIDIA-Webcam-Tracker.md:72) avoids the step at the dead-zone edge that calibration.ts:62-63 produces.
4. **Reconsider `max` as the combiner.** VTS documents a silence-gated crossfade (Lipsync.md:91-101) or an additive variant (VTS-Model-Settings.md:99). `max` is simple and robust, but the mic opens the jaw on humming, which is the same limitation VTS documents (Lipsync.md:138). VTS mitigates this with a calibrated silence detection. A cheap option is to weight the mic down when the camera's `mouthPress` or closed lips are high.
5. **Optional, larger: vowel detection** (uLipSync-style A/I/U/E/O) to drive round or wide mouth states from audio. This is a bigger effort. VTS notes that it also discards camera expression while you speak (Lipsync.md:134).
6. **Optional: `MouthX`** (from MediaPipe `mouthLeft`/`mouthRight`), because VTS offers it for MediaPipe (Mediapipe-Webcam-Tracker.md:40).

## 5. Open questions

- What VTS's exact MouthOpen and MouthSmile formulas are for each backend. Not documented.
- What VTS's smoothing algorithm, slider scale and defaults are. Not documented.
- What the defaults and ranges of the lipsync Volume Gain, Volume Cutoff and Frequency Gain sliders are, and how volume is measured. Not documented.
- Whether `VoiceVolumePlusMouthOpen` is clamped after summing. The table says it is a sum and the Lipsync page says 0..1, but the method is not stated.
- For rivtuber: should the Rive rig get a continuous mouth-form value in -1..1 (smile minus frown, as in `ParamMouthForm`) in addition to the discrete state? This is a product and rig decision to ask the user about.
