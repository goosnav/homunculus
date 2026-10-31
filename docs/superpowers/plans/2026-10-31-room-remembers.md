# The room remembers implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax for progress.

**Goal:** Add physical experiments, three achievable escapes and an enduring room, with the current v12 character.
**Architecture:** Chamber state machine composes with Life; a separate view renders props. Archive persists traces only. Existing browser inference stays bounded and independent.
**Tech Stack:** JavaScript, Three.js, Node tests, Playwright, static Vite.
**Spec:** docs/superpowers/specs/2026-10-31-room-remembers-design.md

## Global constraints

- Preserve static dist, 256-token inputs, 512-token context, single worker, bounded rendering and male audio.
- No saved living simulation, no score/achievement UI, no text-heavy lore screens.
- Preserve owner repositories and their unpublished/dirty work; copy pinned available assets.
- Work in the existing clean checkout, on a feature branch; prior authorization covers pushing tested changes to main.

## Review focus

- Punishment, death, late inference or repeated taps during a multi-step project must not resurrect or teleport the occupant.
- Drawer and projected scene targets on narrow screens must remain usable without stealing pinch/keyboard input.
- Corrupt/unavailable storage must not prevent spawning; only bounded traces survive.
- Model morphs and every prop must reset on repeated spawns with no extra scene objects.
- Escape criteria must be achievable through public interactions, not test-only shortcuts; memory remains bounded while rendering.

## Task 1: Experiment simulation and room archive

**Files:** web/chamber.js, web/life.js, tests/chamber.test.mjs.
**Produces:** Life.chamber with deliveries/projects, lights/channel, key/chalk/coil/mirror states; snapshot.chamber; terminal outcome; archive read/write helpers. Keeps model ACTIONS unchanged.
- [x] Write route tests using Life.interact and actual navigation/ticks, terminal interruption and archive corruption/spam cases; run and observe missing-feature failure.
- [x] Implement deterministic delivery/collection/work sequences, soup/cooperation, chalk/knocks, coil/carrier, mirror/visitor/key, and departure outcomes. Integrate protected action selection, interruption and snapshots.
- [x] Run `npm test`; expected all old and new tests pass. Commit simulation.

## Task 2: Current models and physical experiment presentation

**Files:** web/assets/resident.glb, web/assets/asset-lock.json, web/assets/PROVENANCE.md, tools/sync-assets.mjs, web/face.js, web/chamber-view.js, web/browser-room.js, web/room.js, tests/assets.test.mjs, tests/face.test.mjs.
**Consumes:** Task 1 snapshot.chamber/outcome. **Produces:** v12 native expression/jaw animation, hatch and objects, chalk door, radio waveform, mirror visitor response, actual doorway and three terminal sequences; clickable scene targets.
- [x] Assert current model has frown/jaw/blink and source hash provenance; test native face state. Observe failure against old model.
- [x] Copy current assets reproducibly, integrate native face without the old mouth, create bounded props and animations, reset all states between lives.
- [x] Run `npm test` and build; expected all pass, files remain under hosting limits. Commit assets/view.

## Task 3: Playable controls, persistence and production verification

**Files:** web/browser-app.js, web/index.html, web/browser.css, web/browser-voice.js, tools/test-chamber.mjs, docs/VERIFICATION.md, README.md.
**Consumes:** Task 1 archive/lifecycle and Task 2 scene actions. **Produces:** cooperative toolbar, service/experiments drawers, reachable outcomes, persistent physical traces, New occupant flow and restrained audio cues.
- [x] Create browser acceptance runner for actual buttons, three routes, death/interruption, refresh traces, mobile drawer/keyboard and scene reset.
- [x] Wire controls, archive milestones and outcome worker cleanup. Add feedback sounds using existing audio graph. Keep lore physical and copy short.
- [x] Run `npm test`, `npm run build`, `node tools/test-budget.mjs`, mobile and chamber browser checks, real-model lifecycle and stability soak; inspect screenshots. Expected gameplay/asset/inference checks pass without Python/Ollama or new off-site requests.
- [ ] Fresh code review against spec; resolve important defects, record verification and commit. Merge/push main, verify Cloudflare and public gameplay.
