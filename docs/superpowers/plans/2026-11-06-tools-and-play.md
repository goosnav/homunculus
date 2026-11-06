# Tools and play implementation plan

> **For agentic workers:** Use executing-plans for the root implementation, with independently owned audio and toy modules delegated in parallel.

**Goal:** Make controls understandable on phones and give the resident a repeatable physical toy.

**Architecture:** Keep Life/Chamber as the single executor. Tool UI consumes snapshots; PaperPlay owns bounded toy state and PaperPlayView owns fixed meshes. Audio owns context/worker lifecycle.

**Tech Stack:** Existing JavaScript, Three.js, Vite, Node tests, Playwright Chromium/WebKit.

**Spec:** `docs/superpowers/specs/2026-11-06-tools-and-play.md`

## Global constraints

- Fixed fishbowl camera; no external inference or new dependencies.
- Touch input remains at least 16px; pinch zoom preserved; no sound toggle.
- Keep current bounded LLM and session-scoped resident lifecycle.
- Existing user authorization covers implementation and pushing tested changes to main.

## Review focus

- Keyboard-visible viewport must retain usable composer and dismissible controls.
- Tool selection must not fire a physical action or disrupt ongoing work.
- Explicit setting inputs must reject nonfinite or out-of-range values.
- Death/coercion during toy flight/work must not resurrect or override resident.
- Stale voice worker callbacks and interrupted contexts must not kill current playback.

### Task 1: Audio recovery

Files: `web/browser-voice.js`, `tests/browser-voice.test.mjs`, audio browser test; app integration in task 2.
Interface: `resume()` called in trusted pointer/key gesture; `setVisible(boolean)` from visibilitychange.
- [x] Reproduce interrupted/suspended playback, stale worker errors and background queues.
- [x] Fix lifecycle; verify unit tests and real browser Web Audio/worker playback.

### Task 2: Tool drawer and physical selection

Files: `web/index.html`, `web/browser-app.js`, `web/browser.css`, `web/instrument.*`, `web/laboratory*`, new `web/tool-panel.js`, `tests/laboratory.test.mjs`, `tools/test-tools.mjs`.
Interface: laboratory power accepts optional `{power:0|1|2}`; direction accepts new `draft-direction` with `{direction:0|1|2|3}`. Preserve old cycling API for existing consumers. View selection uses `selectTool(tool, pad)` with bounded highlight duration; ray hits request `tool:<name>` without mutating simulation.
- [x] Add failing explicit-setting validation tests.
- [x] Implement named drawers, single device panel, persistent visible feedback, reasons and physical highlights.
- [x] Add audio gesture/lifecycle hooks; avoid spawn keyboard on touch, compact phone meter.
- [x] Verify touch targets, no overflow/keyboard regression, state-to-button reflection, object selection and existing stories.

### Task 3: Paper plane

Files: new `web/paper-play.js`, `web/paper-play-view.js`, `tests/paper-play.test.mjs`; integration `web/life.js`, `web/chamber.js`, `web/browser-room.js`, tool UI.
Interface: `PaperPlay.interact/tick/complete/interrupt/snapshot/cue`; Chamber jobs `play:*`; `PaperPlayView.update(snapshot,t)`.
- [x] Test launch/retrieve/refold, wind/mist/gravity, cancellation/death and long-run bounds.
- [x] Implement single reusable plane, resident agency, recurring physical surprise.
- [x] Integrate before gravity tick return and after lab interaction guards; render fixed scene geometry.
- [x] Verify real browser flight and existing body/hazard behavior.

### Task 4: Review and release

- [x] Full Node tests, build, asset budget, mobile, real inference and WebKit checks.
- [x] Fresh independent review of diff and fixes if needed.
- [ ] Update verification record, commit, push main and check live deployment.

## Execution notes

Root implements the shared GUI/integration; phone_audio and paper_play own independent modules. No approval pause: creative execution and main pushes are already authorized by the user. Existing work remains in the shared checkout to avoid losing concurrent agent edits.

### Review record

- Mobile audit reproduced hidden feedback, clipped320px controls, hidden radio tuning duringphone calls. Reorganized panels, persistentfeedback, directchannels, smaller short-screen drawers, and sticky toolselection fix these issues.
- Audio7 RED→GREEN lifecycle tests; actual Chromium/WebKit PCM/recovery checks pass.
- Explicitpower/direction/channel setters had failing regressions before implementation.
- Fresh reviewer found paperwork overriding a scare, and carried paper dropping at a stale location. Both fixed and independently verified; refolding also uses canonical paper coordinates. Final review: no important findings; 56 focused tests pass.
- User-approved scope keeps the main work in the shared checkout and authorizes push; no additional approval gate introduced.
