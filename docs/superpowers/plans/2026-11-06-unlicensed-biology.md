# Unlicensed biology implementation plan

**Goal:** More consequential fishbowl play, four distinct body types, and an optional emotion instrument.
**Design:** docs/superpowers/specs/2026-11-06-unlicensed-biology-design.md
**Execution:** Root integrates inline; isolated asset, temperament/instrument, and laboratory modules are delegated in parallel. Shared Life/Chamber/Night/app/renderer edits belong to root. One fresh final whole-branch review.

## Contracts
- `Temperament`: constructor, pulse(kind,strength), tick(dt,life), snapshot(life) → five finite 0..100 signals. Trust aliases cooperation; no life persistence.
- `createInstrument({onAction})`: update(snapshot), toggle(), hide(), destroy(); creates its own opener/window, owns bounded SVG history and CSS.
- `Laboratory({random,morphology,archive})`: interact(life,kind,payload) → null or boolean, tick(dt,life), complete(life,kind), interrupt(life,reason), cue(), snapshot(), suspended getter. Jobs are `lab:*`, one Chamber owner. Pure simulation, no DOM/renderer.
- `cleanLaboratory(value)` → bounded allowlisted remnants; Chamber archive owns this optional field.
- Creature asset manifest: source GLB paths/hashes, +Z forward/Y-up ground0, root/body.0..6/head/jaw/eyes/tendrils. Selected model only, resource disposal on switching.

## Review focus
- Async spawn/cancel/retry/body switching must not attach stale models, leak geometry, revive a prior life or create extra renderers/workers.
- Gravity pauses physical work but not recovery fixtures or terminal hazards; all interrupted jobs clear offering state.
- Apparatus state cannot emit events every tick, duplicate scrap installs, build an unbounded queue or bypass cooperation.
- Mouse/keyboard/touch observation never becomes a movement command; mobile panel stays reachable when keyboard/viewport change.
- Creature variants retain readable face, proper ground contact, task posing and permanent death; original desktop/human behaviors remain valid.

## 1. Assets and body lifecycle
- [x] Validate original style references, author and inspect three Blender/GLB variants in asset library, preserving unrelated work.
- [x] Implement species selection, explicit body premise, lazy body loading/replacement/disposal and all creature animation states.
- [x] Add asset/build checks and real browser four-body/spawn/death/resource tests; preserve original human checks deterministically.

## 2. Readable emotion and observation
- [x] Implement/test causal bounded temperament; integrate accepted actions/completed care and gradual recovery.
- [x] Implement optional XP instrument and observer wave/positioned tap; integrate without extra inference.
- [x] Verify mobile/keyboard/pointer behavior, terminal signal and new-life reset.

## 3. Apparatus and resident projects
- [x] Implement/test laboratory fixtures, morphology reactions, reversible gravity/glass visitor, nest construction and heart branches.
- [x] Integrate single-owner jobs and archive, flow-based boat/weather behavior, finite physical renderer props and contextual controls.
- [x] Exercise combinations through public controls, interruptions and 30-minute/repeated-life bounds; inspect screenshots.

## 4. Release
- [x] Full Node/Python tests, model-token budget/static build, browser lifecycle/story paths, mobile and memory soak.
- [x] Fresh whole-branch review and regression-covered correction of important findings.
- [x] Publish game to main, verify CI/hosting/public runtime and record evidence/limitations; finish goal only when complete.
