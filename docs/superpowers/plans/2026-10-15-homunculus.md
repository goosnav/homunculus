# Homunculus implementation plan

**Goal:** Deliver an immediately runnable, persistent 3D creature simulation using the owner's assets and a real small local LLM.

**Architecture:** Standard-library Python simulation/API with an independent cognition worker; local Three.js renderer; optional system-webview desktop shell.

**Spec:** ../specs/2026-10-15-homunculus-design.md

**Global constraints:** Python 3.10+; zero mandatory Python packages; offline static assets; fixed camera; allowlisted LLM actions; bounded memory, inference and speech; loopback HTTP; no kiosk configuration/input.

## Review focus

- Invalid or truncated LLM responses cannot freeze movement or become arbitrary actions.
- Browser refresh/restarts preserve settings and memories without replaying old speech.
- Obstacles and invalid drag coordinates cannot trap or eject the creature.
- Slow/unavailable Ollama cannot accumulate unlimited requests.
- Kiosk is enforced by the server, not just hidden controls.

## Task 1 — simulation and persistence

- [ ] Write behavioral unittest cases for bounded needs/memory, navigation, critical rest, validated dragging, config validation, and atomic save/recovery.
- [ ] Run `python3 -m unittest discover -s tests -v`; confirm missing implementation failure.
- [ ] Implement `homunculus/config.py`, `world.py`, `simulation.py`, `storage.py` with `Simulation.tick(dt)`, `snapshot()`, `interact(kind, payload)`, `apply_thought(dict)`, `Store.load()/save(dict)` and `Settings.update(dict)`.
- [ ] Run suite, then commit the tested core.

## Task 2 — cognition and local application

- [ ] Test structured response validation, real HTTP request shape against a local Ollama stub, inference timeout/offline behavior, request token, traversal, invalid input, and kiosk lock.
- [ ] Implement `brain.py`, `speech.py`, `runtime.py`, `server.py`, and `__main__.py`. `Runtime.snapshot()` supplies the renderer; a bounded queue and worker own all LLM calls. Settings changes invalidate old in-flight thoughts.
- [ ] Run tests and a real small-model inference.

## Task 3 — room and interaction

- [ ] Export actual PS1 character from Blender to a compact rigid-part GLB; include provenance and reproducible export tool. Copy selected PS1 item GLBs. Vendor Three.js and loader with license.
- [ ] Implement `web/index.html`, `style.css`, `app.js`, `room.js`, `speech.js`. Fixed room camera; procedural rig animation; onboarding/settings dialogs; subtitles and speech; drag/tap; clear offline/error states.
- [ ] Run in Chromium and inspect rendered screenshots, interaction, settings persistence, resizing and console errors.

## Task 4 — distribution and review

- [ ] Add OS launchers, build ZIP tool, optional native-build CI, Pi kiosk launcher/service example, hardware/operation docs and quickstart.
- [ ] Run full suite, browser smoke check, real model check and archive extraction launch check.
- [ ] Perform independent code review; address material findings and record verified results/limitations.
