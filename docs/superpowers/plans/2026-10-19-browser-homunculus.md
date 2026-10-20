# Browser Homunculus Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the user's browser-only XP homunculus, real tiny LLM, consequential interventions, expressive room, secrets, local download, GitHub source, and Cloudflare subdomain.

**Architecture:** A pure JS simulation feeds the existing Three.js room. A worker loads and runs a quantized LLM; the UI owns spawn/download/lifecycle and never runs inference on the rendering thread.

**Tech Stack:** JavaScript modules, Three.js, Transformers.js/WASM, Node test runner, static Cloudflare hosting.

**Spec:** docs/superpowers/specs/2026-10-19-browser-homunculus-design.md

## Global Constraints

- No backend required by the hosted app. No authored fallback presented as an LLM.
- Default frown, sparse short speech, independent objectives, no score.
- Death and exit invalidate pending thoughts. No resurrection or save restore.
- Comic sources must be genuine and accurately labeled.
- Preserve prior uncommitted user work and Shopify DNS.

## Review Focus

- Anvil or close during loading/inference must cancel work and cannot revive.
- Failed downloads must give retry/cancel with accurate progress.
- Invalid tiny-model responses must not break simulation or become arbitrary commands.
- Movement must avoid furniture even when changing objectives or moved by the observer.
- Repeated interventions, hidden tabs, and GPU-less hardware must remain usable.

### Task 1: Browser life and mind
Files: web/life.js, web/mind.js, web/mind-worker.js, tests/life.test.mjs, tests/mind.test.mjs.
Interfaces: Life.tick(dt), interact(kind,payload), applyThought(result,epoch), snapshot(); BrowserMind.load(progress), think(messages), dispose().
- [x] Write and observe failing tests for movement, independent work, bounded replies, death, late-result invalidation, confinement, and queue limits.
- [x] Implement simulation and worker bridge; pin and vendor model runtime with licensing.
- [x] Run Node tests and real browser WASM inference; record actual download/performance.

### Task 2: Spawn and XP shell
Files: web/index.html (legacy entry preserved as web/desktop.html), web/browser-app.js, web/browser.css; integrate root after validation.
- [x] Connect spawn, real progress, retry/cancel, randomized names, message input, journal, interventions, exit, and dead silence.
- [x] Verify actual static browser flow, errors, and narrow layouts.

### Task 3: Room and character
Files: web/room.js, web/assets, tests/room.test.mjs.
- [ ] Add physical aperture, lived-in details, expressive frowning face, hammer, doorknob, wired computer, confinement, falling anvils, corpse/skeleton, wireframe materialization.
- [ ] Verify render behavior and screenshots, use real owner assets with provenance.

### Task 4: Comic and secrets
Files: web/comic.js, web/assets/comic, web/life.js, tests/life.test.mjs.
- [x] Locate genuine Book 2, convert all sheets to raw OCR JSON and ship selected excerpts, randomize selection, route into real model context and commentary.
- [ ] Add discoverable room/model consequences and unusual events; verify each trigger and persistence within a life.

### Task 5: Delivery and whole-project verification
Files: launchers, tools/build-browser.mjs, README.md, docs/VERIFICATION.md, deployment configuration.
- [x] Make browser edition default, build local archive, test from extraction.
- [x] Run regression tests, real model playtest and lifecycle tests; obtain independent review and resolve major findings.
- [ ] Push GitHub source, deploy static site on Cloudflare, attach exact subdomain and verify HTTPS without apex changes.
- [ ] Audit every objective against direct evidence before marking goal complete.

## Execution ledger

October 19: Current checkout has legacy desktop changes, retained. No new worktree: continuity with this active checkout. Prior continuation classification: progress (authoritative journal/animation edits and tests remain). Browser requirement is not implemented yet. User explicitly requested continuing the full objective; no additional plan approval is required for these reversible implementations.
Pre-flight: simulation snapshot matches Room.update's existing position/yaw/activity/feeling fields; worker output is validated before it reaches Life; UI owns worker shutdown on terminal state. Book prop pages are explicitly substitute artwork, so cannot satisfy Book 2 acceptance.

October 19 browser milestone: Vite build and actual WASM inference verified. 30 JS and 74 Python tests pass. Custom quick OCR processed all 147 sheets; eight raw excerpts ship. Browser ZIP built/extracted and served. Independent review caught poisoned room-asset retries and lost reading events; both fixed and re-reviewed. See docs/VERIFICATION.md. Room includes physical aperture, hammer/computer/headset, cracks, frown overlay and terminal skeleton; expression readability and richer secrets remain in progress. No Cloudflare plugin found in connected catalog; no local Wrangler login found. Public deployment and device matrix are pending. Goal remains active.

Next behavior/visual pass (builder decisions within the approved objective):
- Stage escape work explicitly: fetch/pick up hammer, travel, strike/pause; handle/push/kick/listen at the door; connect/type/transfer at the computer. Feed phase and consequences to the LLM.
- Give each spawn a preferred method and private fixation, affecting independent choices and mind context.
- Add quiet, bounded discoveries with actual scene changes: answering knocks, an identical room behind the door, a copied room on the monitor, backwards clock and a briefly absent bowl. No achievement UI.
- Make tired/fearful/angry/focused/suspicious/pained faces readable, preserving owner model geometry and default frown.
- Verify interrupted sequences and death, deterministic secret triggers, visual poses and real browser compatibility before pushing.

October 20 release instruction: user explicitly requests publishing the static conversion to main after Cloudflare built the old main and failed with “Missing script: build.” Package the complete pinned browser model into dist (including weights), verify same-origin-only real inference, then push main. Model chunks must fit Pages' 25 MiB asset limit. This supersedes the earlier runtime Hugging Face download decision. Continue the authorized behavior/animation work after delivering the build.

October 20 production feedback: user reports iPhone Safari crashes/restarts during play and after messages, input-focus zoom, and silent audio. Prioritize and push stability before more game features. Reproduced unbounded framebuffer sizing and measured long-context memory pressure. Implement a real-tokenizer 384-token prefill budget, bound drawing buffers, fit the visual viewport, use 16px mobile input, and prime speech from the Sound gesture with available voice fallback. No backend/model substitution. Initial model memory remains significant and physical iPhone confirmation is still required before claiming the observed Safari crash resolved.

Ruling: use the explicit new user request as the approved scope for a subsequent small game expansion: rare large magenta/black missing-texture Platonic solids pass through walls, attract the resident's gaze and frighten him, with occasional hostile feints; a Black hole button opens a floor void and walking into it causes permanent disappearance/death. Keep these after the production patch, bounded to one solid and one hole per life, with no extra model or texture downloads.

October 20 follow-through: stability commit 5c77fd7 was pushed and deployed before the game expansion. User confirmed audio and inference now work; keep the current model. User requests always-on male speech muffled behind glass and a randomized ceiling-drop arrival. Implemented bundled Flite KAL synthesis into a Web Audio low-pass filter, authored loose-limb fall/impact/get-up, rare solid visitors and the terminal floor hole. Reviewed and verified with real browser inference/audio, visual frames, mobile layout and bounded-resource tests; navigation after visitor knockback was corrected during review. No extra approval needed: the user explicitly requested these changes and a push when complete.
