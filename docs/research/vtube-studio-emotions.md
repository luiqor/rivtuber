# VTube Studio emotions/expressions vs. rivtuber

Researched 2026-11-23. Primary sources only: the VTS wiki (git clone of `DenchiSoft/VTubeStudio.wiki`), the VTS API README (`DenchiSoft/VTubeStudio`), and the Live2D Cubism SDK manual. "Not documented" means I searched these sources and found nothing. It is not a claim about what VTS does internally.

- `W` = https://github.com/DenchiSoft/VTubeStudio/wiki/
- `API` = https://github.com/DenchiSoft/VTubeStudio (README)
- `L2D` = https://docs.live2d.com/en/cubism-sdk-manual/expression/

## 1. VTube Studio findings

### 1.1 Emotion-related tracking inputs
- The input table lists **MouthSmile** ("how much you're smiling"), **Brows** ("up/down for both brows combined"), **BrowLeftY/BrowRightY**, **EyeOpenLeft/Right**, **CheekPuff** (iOS only) and **TongueOut** (iOS and Android only). Source: W`VTS-Model-Settings`, "Supported INPUT parameters".
- The table has **no EyeSmile, eye squint, eye wide, mouth frown, brow form/angle, or emotion inputs**. Frowning is a negative MouthSmile direction at most. That reading comes from the "Better frowning" item below. The range of MouthSmile is not documented.
- VTS computes its inputs from the tracker blendshapes with its own code. Users cannot use the raw blendshapes (W`NVIDIA-Webcam-Tracker`). The mapping from raw ARKit blendshapes to MouthSmile/Brows is not documented.
- **Tracking V2 → Better frowning** (iOS, experimental): "Automatically frown more by lowering your brows. This is done by detecting when the brows are down and subtracting a certain value of MouthSmile in that case." The threshold and amount are not documented (W`VTube-Studio-Settings`).
- Lipsync: `MouthSmile → ParamMouthForm` is the standard mapping. `VoiceFrequencyPlusMouthSmile` combines voice and smile (W`Lipsync`, W`VTS-Model-Settings`).

### 1.2 Expressions (`.exp3.json`)
- Expressions "set Live2D parameters to certain values using hotkeys". They are created in the in-app Expression Editor or in Cubism Viewer, and saved as `.exp3.json` (W`Expressions-(a.k.a.-Stickers-or-Emotes)`).
- Activation is **manual only**: a "Set/Unset Expression" hotkey (keyboard, mouse or on-screen button), the expression-list toggle, or the API. Source: same page and W`VTS-Model-Settings` "Hotkey Settings and Types", which lists only the keyboard and on-screen trigger types. **I found no documented hotkey or expression trigger driven by tracking values** (for example "smile above X turns on the happy expression").
- Parameter modes in VTS: **Overwrite (the VTS default)**, **Add**, **Multiply**. Add and Multiply are applied "after everything else", multiplications first and then additions, and they stack (0.5 × 0.5 = 0.25). Overwrite expressions on the same parameter follow last-activated-wins, and turning one off falls back to the previous one (W`Expressions-…`).
- Live2D's own SDK differs here. **Add is the default** when the file sets no Blend. Multiply scales the incoming motion, which keeps blinking working. Overwrite "ignores eye blinking and does not blink" (L2D). VTS's editor defaults to Overwrite (W`Expressions-…`).
- Priority order: default < idle animation < **face tracking** < one-time animation < **expression** < physics. An active Overwrite expression therefore hides tracking for that parameter (W`Interaction-between-Animations,-Tracking,-Physics,-etc.`).
- Physics output parameters cannot be used in expressions (W`Expressions-…`).
- **Expression Groups** (beta) make expressions in a group mutually exclusive, and the group sets the fade time (W`Expressions-…`).
- Fade: hotkeys have fade-time settings, and expressions can stop after N seconds or when the key is released (W`VTS-Model-Settings` line ~199). The API's `ExpressionActivationRequest` `fadeTime` is clamped to 0–2 s, defaults to 0.25, and fade-out uses the fade-in time (API, "ExpressionActivationRequest").
- `InjectParameterDataRequest`: in `"set"` mode (the default) only one plugin may control a parameter. In `"add"` mode any number of plugins add to the current value (API). An external plugin could therefore build tracking-triggered emotions on top of VTS.

### 1.3 Automatic emotion detection
- **Not documented.** A search of the wiki and API README for "emotion" found no mention of it. Inputs are raw facial features (smile, brows, eyes) plus voice phonemes/volume (W`VTS-Model-Settings`). Nothing classifies happy, sad, angry or surprised.

### 1.4 Not verified
- The `.exp3.json` schema fields (`FadeInTime`/`FadeOutTime`) and the Live2D standard IDs `ParamEyeLSmile`, `ParamBrowLForm` and `ParamMouthForm`: I did not fetch a primary Live2D page for them. The VTS wiki only mentions `ParamMouthForm` (W`Lipsync`).

## 2. rivtuber's current approach

- Tracked signals: `mouthSmile` and `mouthFrown` are averages of left and right. Each eye gets its own `eyeSquint*`, `eyeWide*` and `browDown*`, mirrored (src/lib/engine/blendshapes.ts:27-44). It does not use browInnerUp, browOuterUp, cheekSquint or cheekPuff, although the rig has `cheek-squint` and `inner-up` states (src/lib/engine/eyelid-state.ts:2).
- Eyes: a priority classifier, closed > squint (lower lid raised) > wide > brow-down (`inner-down`) > open, with enter/exit hysteresis (src/lib/engine/eyelid-state.ts:14-24, 44-64). It runs per side, with a 300 ms settle (eyelid-state.ts:67-93) and a squint floor of 0.8 on the rig number (eyelid-state.ts:20; src/lib/rig/face-tracker.ts:183-185).
- Mouth: a winner-takes-all classifier over smile, jaw-open, round, frown, press and lip-bite, with a gain, enter and exit value for each (src/lib/engine/mouth-state.ts:11-36). The settle time is 60 ms to enter a state and 150 ms to return to rest (mouth-state.ts:40-64). The result is written to the `mouthState` enum (face-tracker.ts:164-167).
- Eyes and mouth are fully independent. A smile does not affect the eyes, and brows do not affect the mouth. There are no manual expressions or emotion layers. A grep for emotion|expression|angry|sad|happy|surpris in src/ found nothing.

## 3. Side by side

| Topic | VTS | rivtuber |
|---|---|---|
| Smile signal | MouthSmile → ParamMouthForm, continuous | mouthSmile → `smile` enum state (mouth-state.ts:12) |
| Frown | No input. Optional brow-down subtracts MouthSmile (iOS V2) | Its own `frown` state from mouthFrown (mouth-state.ts:15) |
| Eye squint/wide | No input | Per-eye squint/wide states (eyelid-state.ts:54-59) |
| Brows | Brows, BrowLeftY/RightY (vertical only) | browDown → `inner-down` eyelid only (eyelid-state.ts:60) |
| Cross-feature coupling | Better frowning (brows → mouth) | None |
| Manual expressions | Hotkey/API, Overwrite/Add/Multiply, 0–2 s fade | None |
| Tracking-triggered expressions | Not documented | n/a (states are tracking-driven) |
| Emotion detection | Not documented | None |

## 4. Recommendations (ranked)
1. **Optional brows → mouth coupling**, like VTS "Better frowning": bias toward `frown` when both browDowns are high. VTS has precedent for this (W`VTube-Studio-Settings`). The thresholds are unknown, so they need tuning.
2. **Use browInnerUp and cheekSquint** to reach the rig's unused `inner-up` and `cheek-squint` eyelid states (eyelid-state.ts:2 vs. 44-64). This has no VTS equivalent and is rivtuber-specific.
3. **Manual expression overrides** (hotkeys) with a defined blend rule. The Live2D Multiply lesson applies here: an override that forces the eyelid state would block blinking, the way Overwrite does (L2D).
4. Do not try automatic emotion classification by imitating VTS: VTS documents no such feature.

## 5. Open questions
- Should smile also drive the eyes (a "happy eyes" squint), or only stay in the mouth?
- Does the rig accept combined states (for example smile plus squint) or only one enum each?
- Are manual expressions in scope, and should they override tracking or add to it?
