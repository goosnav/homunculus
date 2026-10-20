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

October 19 browser milestone: Vite build and actual WASM inference verified. 29 JS and 74 Python tests pass. Custom quick OCR processed all 147 sheets; eight raw excerpts ship. Browser ZIP built/extracted and served. Independent review caught poisoned room-asset retries and lost reading events; both fixed and re-reviewed. See docs/VERIFICATION.md. Room includes physical aperture, hammer/computer/headset, cracks, frown overlay and terminal skeleton; expression readability and richer secrets remain in progress. No Cloudflare plugin found in connected catalog; no local Wrangler login found. Public deployment and device matrix are pending. Goal remains active.
