# After Hours Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, with one fresh whole-branch review. Steps use checkbox syntax.

**Goal:** Build a substantial replayable after-hours story with physical play between encounters.
**Architecture:** NightShift composes with Chamber's single movement/job executor; NightView reuses a fixed set of scene objects. Existing Life handles mortality and bounded model context. Optional archive fields preserve objects only.
**Tech Stack:** JavaScript, Three.js, Node test runner, Playwright, static Vite.
**Spec:** docs/superpowers/specs/2026-11-05-after-hours-design.md

## Global constraints
- Fixed room camera; no destination view, corpse resurrection, saved life or generated-dialogue impersonation.
- 256 input tokens, 512 context, single worker, existing male voice/framebuffer limits.
- Bounded scene objects, sanitized archives, no new dependencies or downloaded assets.
- 10–30 minute exploratory-play target, not a verified retention claim; Call night service makes quiet intervals optional. Verify substantive decisions, routes and endings instead of a timer floor.
- UI remains XP, contextual drawers and short clues, no achievement dashboard.

## Review focus
- Any punitive action or death during a story job must release the job and prevent late completion.
- Wrong station, missing tools, uncooperative resident or abandoned encounter must remain recoverable.
- Shuffled cases and recurring cases must not reuse stale action flags or accidentally skip requirements.
- Timers/geometry/state must remain bounded over repeated lives and 30 minutes; model messages cannot steal story motion.
- Narrow-screen controls and scene targets must stay usable without covering the entire room or blocking pinch.

## Task 1: Shift simulation and independent play
**Files:** web/night.js, web/chamber.js, web/life.js, tests/night.test.mjs, tests/chamber.test.mjs.
**Interface:** Life.night, snapshot.night; NightShift.interact/tick/completed/cancel; Chamber job items prefixed night: with duration/location; bounded archive afterHours.
- [x] Write and observe failing tests for full timeline, alternate resolutions, toy/plant/neighbor, shuffled variants, interruptions, archive and 30-minute bounds.
- [x] Implement six encounters, alternate routes, tending/toy/neighbor/boat play, departure seal and stay ending, recoverable cancellation and persistence.
- [x] Run complete Node suite and commit. Expected all pass, six distinct encounters and stay/leave endings reachable with optional intermission skipping.

## Task 2: Physical room presentation and playable controls
**Files:** web/night-view.js, web/browser-room.js, web/chamber-view.js, web/browser-app.js, web/browser.css, web/index.html, web/browser-voice.js, tools/test-night.mjs, tools/test-chamber.mjs.
**Consumes:** snapshot.night and validated interactions. **Produces:** physical parcel, plant/rain/puddle/boat, telephone/code, mouse/shadow, inspector/seal/shelf; contextual drawer and scene targets.
- [x] Create browser acceptance runner, observe missing controls failure.
- [x] Build reusable props and animations, integrate job poses/hit targets, short clue drawer, sounds, archive writes and ending state.
- [x] Complete real browser story path and alternate legacy escape route; inspect screenshots desktop/390px, check scene reuse, commit.

## Task 3: Release verification
**Files:** tools/test-night.mjs, .github/workflows/ci.yml, README.md, docs/VERIFICATION.md.
- [x] Run full Node/Python suites, static build/token budget/mobile checks, real model lifecycle and longer memory soak.
- [x] Fresh whole-branch review; one regression-covered fix pass, verify all important findings resolved.
- [x] Commit, merge/push main, check CI/Cloudflare and public gameplay. Record limits and measured pacing.
