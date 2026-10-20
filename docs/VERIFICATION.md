# Verification record

## Mobile stability patch — October 20, 2026

User supplied an iPhone Safari repeated-page-failure screenshot and reported failures after time in the room and after messages. The exact iPhone process termination has not been reproduced on physical hardware; memory pressure is an evidenced risk, not a proven device crash diagnosis.

- The shipped decoder returns float32 logits for every input position and all 49,152 vocabulary entries. Repeated real OCR produced 1,945-token decision prompts. Both decisions and speech now have a 384-token input budget, counted with the actual chat template. Previous examples and old memories yield before the current event; both selected pages retain real excerpt text and all ten action labels survive.
- `tools/test-budget.mjs` uses the actual bundled tokenizer on twelve consecutive readings plus long Unicode messages. All inputs stay at or below 384 tokens. Real-tokenizer testing caught and fixed Tensor counting, empty decoding, and old-page memory classification mistakes before publishing.
- Linux Chrome renderer RSS, same profile scenario: baseline reading peak 1,572 MiB; patched reading peak 1,083 MiB (about 31% lower). Idle after reading: 1,350 → 1,046 MiB. Initial spawn peak remains approximately 1,175 MiB. These are desktop process measurements, not iPhone memory guarantees. Disabling ONNX prepacking was experimentally evaluated and not adopted; it made no material additional improvement.
- A 390×1 CSS room previously requested a 187,200×480 framebuffer. The new test reproduces this. Rendering now has bounds on dimensions and total pixels, and suspends for surfaces smaller than 16 pixels.
- Mobile input font is 16px, pinch zoom remains enabled, and the app follows the visual viewport above the keyboard. `tools/test-mobile.mjs` verifies sizing, simulated keyboard viewport, and restoration; this is not physical Safari keyboard verification.
- Audio now primes speech synchronously from the Spawn button, and allows an available English/default voice when there is no voice marked local. Per the user's follow-up, audio stays enabled and the sound toggle is removed. Missing speech APIs cannot break spawning. This follows [WebKit's speech gesture check](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/speech/SpeechSynthesis.cpp). Unit tests cover gesture priming, empty/non-local voice lists and cancellation; audible iPhone output remains to be confirmed.
- 44 JavaScript tests pass. Build integrity passes. Full real-browser lifecycle test additionally checks actual decision and reading token counts. CI now includes the real-tokenizer and mobile-layout checks.

The offline preview at commit `6781d35` was freshly extracted, all 50 files checked, and its complete real-model lifecycle passed with external requests blocked. It was published as `v0.5.0-browser-preview` before the subsequent iPhone report; it does not contain this mobile patch.

## Complete static release — October 20, 2026

- Cloudflare's reported failure was reproduced from `origin/main/package.json`: only `vendor` existed there; the browser build had not been published to main.
- `npm ci` succeeds on Node 24.21.0 (the version in the reported Cloudflare log). The preserved desktop regression suite passes all 74 tests.
- `npm test`: 37 tests pass. New packaging/cache tests verify ordered reconstruction, SHA256 integrity failures, repeat-cache reuse, cache-denial fallback and size-limited build output. New simulation tests cover tool pickup, strike-only wall damage, staged door work and bounded discoveries.
- `npm run build`: prepares a pinned SmolLM2 135M q8 ONNX revision, verifies source hashes, splits weights into 20 MiB parts, bundles the game/runtime, and checks the finished `dist/`. 45 files, 157.9 MiB total; each file is below Pages' 25 MiB limit. The complete tokenizer/configuration/weights are included.
- Real Linux Chrome/SwiftShader production test with **all off-site HTTP requests blocked**: spawn in 6.5 seconds, a real model action in 4.1 seconds, generated Book II dialogue, permanent anvil death/skeleton/silence, close and refresh lifecycle all passed. These timings are observations on this machine, not device guarantees. The tiny model's reading comment was generic; it is not a reliable comic interpreter.
- Second spawn made **zero model-part network requests**. No Python API, Ollama or off-site request occurred. The transient GLB failure is intentionally injected by the test; retry succeeds. No JavaScript page errors.
- The smoothed character GLB is in the browser build. Tool pickup/strike/pause, door work and seated computer transfer have authored phases; preferred escape method and private fixation vary per life. Bounded discoveries now include answering wall taps, a door into another room, a copied-room monitor, a backwards clock and a disappearing bowl.
- Clean archived checkout: `npm ci`, build (fresh upstream downloads) and all 37 JavaScript tests pass. All four GitHub CI jobs on main passed (Ubuntu Python 3.10/3.12, Windows, macOS).
- Visual continuation check: hammer pickup/strikes, seated transfer, copied-room monitor, open-room doorway and absent bowl rendered without JavaScript errors; screenshots inspected after animations settled.
- Cloudflare itself built the complete static site successfully, then its **Workers Builds** deploy command failed while auto-detecting `vite.config.js`. Reproduced that exact failure locally; an explicit assets-only `wrangler.jsonc` fixes `npx wrangler deploy --dry-run`. Wrangler 4.151.2 is pinned. No server-side application code or bindings.
- Independent read-only code review found no release blocker. The build checker was separately run by the reviewer and passed.

Remaining checks: physical Windows/macOS/Android/iOS browser runs, long-duration performance and further game refinement. Unit/CI OS runs and narrow-viewport screenshots do not substitute for physical-device browser tests.

Live deployment: Cloudflare's `Workers Builds: homunculus` check for `8ea3356` succeeded, as did all four GitHub jobs, including the new real-browser inference test. `https://homunculus.goosnav.shop` now serves the app. Public Chrome test completed real inference (15.9-second initial spawn, 4.6-second first action), Book II dialogue, permanent death and refresh/cache reuse with all off-site traffic blocked. Cloudflare injects its Web Analytics script: the initial strict no-off-site-attempt assertion reported that optional host script after all gameplay assertions passed. The harness now has an explicit Cloudflare-hosting mode that still blocks it and reports it separately; unexpected application requests remain failures.

The October 19 record below describes the earlier milestone; model hosting, pinning, archive contents and test counts are superseded by the complete static release above.

## Browser edition — October 19, 2026

- `npm test`: 30 passing tests. Includes navigation, independent work, actual model action validation, terminal death, late-result rejection, confinement, OCR selection, bounded reading retries, model cancellation, download progress, camera, and poisoned-asset retry. The two new retry regressions were observed failing before their fixes. Windows CI caught a CRLF bug in the test harness; the harness now explicitly tests both LF and CRLF source.
- `python3 -m unittest discover -s tests -v`: 74 passing legacy tests, including an extracted desktop source package. The desktop root now serves `desktop.html`.
- `npm run build` and `npm run check:build`: static `dist/`, 29 files, 25.2 MiB total, each file under 25 MiB. No source PDF, full OCR, old API calls, or Ollama requests in the build.
- Real Linux Chrome with SwiftShader, served by Vite preview: actual CPU WASM SmolLM2 inference, about 8.7 seconds to spawn on this machine/network and 4.2 seconds for a silent action selection. These are observations, not device guarantees.
- The forced-reading event contained text from two original OCR pages; the real model generated a short comment. It was generic rather than an accurate summary, as expected from this tiny model and rough OCR. No canned fallback response was substituted.
- Anvil impact killed the resident, then displayed the actual skeleton asset. Further texts produced no replies; another anvil accumulated. Worker termination, refresh-to-spawn, new spawn, cached weights, and close-to-death passed. A second spawn made zero weight download requests when browser cache persisted.
- No old Python API/Ollama requests or JavaScript page errors during the production smoke test. Screenshots inspected at 1100×820 and 390×720; narrow viewport is not a physical mobile-device test.
- Full book OCR: all 147 PDF sheets recorded; 145 have nonempty OCR (blank or unrecognized sheets remain empty). Raw JSON is `.local/book2/ocr.json`. Eight excerpts and their original scans ship. No manual cleanup.
- Independent code review found two retry bugs; both were reproduced, fixed and re-reviewed with no remaining important findings in that review.
- Browser ZIP extracted successfully; its localhost launcher served bundled JavaScript, CSS, GLBs, OCR JSON and WASM. The package needs Python only as a file server and initially needs internet for the model.

Still unverified or unfinished: Cloudflare HTTPS/custom domain, physical Windows/macOS/Android/iOS browsers, long-duration performance, refined facial expression readability, and the full planned set of secrets/objective sequences. The cached model currently follows its upstream repository revision. `npm audit` reports six advisories in the Transformers.js Node dependency tree (sharp/ONNX native install dependencies); those native modules are absent from the browser bundle, but dependency maintenance remains before a final release.

The records below describe the preserved Python desktop edition, not the new default browser lifecycle.

Checked on 2026-10-15 on the development machine. It's a Dell with an i7-6700 (4 cores), 64 GB of RAM and no GPU, running Linux with Ollama and Python 3.12. The browser checks used headless Chrome with software WebGL (SwiftShader).

## Automated

`python3 -m unittest discover -s tests -v` passes 48 tests. They cover:

- **Body:**
  - needs stay within limits over 30 simulated minutes, and he never ends up somewhere he can't stand (or he's on the bed or chair)
  - paths go around the chair
  - he lies on the bed and gets back up onto clear floor
  - tapping wakes him
  - exhaustion overrides whatever the model asks for
- **Psyche:**
  - he notices you came back after a long absence, once
  - routine notes don't bury what you did
  - the release attempt is remembered and saved
  - moods from the model are checked against the allowed list
- **Brain:**
  - malformed or truncated replies are rejected, and the brain thread keeps running
  - long replies are cut short, and a dangling comma becomes "…"
  - repeated lines and copies of the examples are dropped
  - help-desk lines are dropped
  - your words arrive as the final chat turn and aren't duplicated
  - events are phrased from your side
  - the real HTTP request matches what Ollama expects
- **Runtime and server:**
  - changing his name, goal, model or address throws away stale thoughts, while toggling sound doesn't
  - the queue is bounded
  - a slow brain doesn't stop the body
  - every action needs the token and must come from the same origin
  - unknown or invalid input is rejected
  - the server refuses to serve files outside `web/`
  - appliance mode blocks typing, settings and model downloads, but still accepts the microphone
  - presence comes from visible polls, with a grace period
  - an unreachable Ollama is reported
- **Ears:** with a fake recognizer and microphone, audio heard while he's speaking is ignored, a missing model is reported rather than crashing, and noise words are ignored.
- **Saves:** they round-trip, and corrupt or non-object saves are kept aside.

## Real model

Run with Ollama on this CPU:

- **`llama3.2:1b`:** about 7–10 s per line (up to 20 s with a long history). Reactions are specific and in character. After a simulated 3-hour absence he said: "…you just wander off for three whole hours without so much as a whisper to anyone in here." To a tap: "This isn't a phone booth, you know." It used about 1.4 GB of RAM while loaded.
- **`qwen2.5:0.5b`:** about 4–5 s per line. It stays in character less often. The help-desk filter catches lines like "as an artificial intelligence…".
- **Also tried and rejected as defaults:** `gemma3:270m` (keeps calling itself an assistant), `qwen3:0.6b` (repeats the prompt's facts back), and `smollm2:360m` (generic).
- **Server process:** 30 MB of RAM and about 0.2% CPU when idle.

## Browser checks (screenshots inspected)

- **First-run window:** the presets work, both brains appear with their installed status, the profile choice is there, and the window can't be dismissed without answering.
- **Room:**
  - the floor and walls run past the frame on every side, so no edges show
  - all four corners of his box are visible
  - dusk and night lighting work, the lamp turns on, the window shows a night sky, and the clock follows your time
- **Poses:** walking, lying in bed (Zs), sitting and reading at the desk, inspecting, knocking on the glass, and the thinking bubble.
- **Full flow with the real model:**
  - setup, then a typed message, then a spoken reply with a subtitle
  - File → Let him out…: progress bar, then "Access is denied", then a remembered reaction
  - × blacks out the room briefly, and he remembers it
- **Window shapes:** at 1280×900, 1600×700 and 600×900 the XP window fills the page, and the room fills the whole inner area with no edges or letterboxing.
- **Appliance mode at 800×480:** there's no menu and no typing. Problems from the ears appear in the notice bar.
- **Source ZIP (953 KB):** extracted, launched with `Start Homunculus.sh --local --no-browser`, and served the page, the API, the GLB assets and Three.js. The launchers kept their executable bits.

## 0.3 playtest

- **Ollama pointed at a dead address:** your message is echoed at once. He replies "Oh. Hello. Nobody ever says hello." and the status reads "Simple mind only". Pages appear in the journal, and a notice announces each one.
- **Completed journal:** a save with all 13 pages restores the drawing on the left wall.

## 0.4 checks

- **Python:** 70 tests pass. **JavaScript:** 7 room tests pass (`node --test tests/room.test.mjs`).
  - The camera stays fixed at 360×720, 800×600 and 2560×720, and every corner of his box stays visible.
  - In landscape windows he fills at least 27% of the frame height.
- **Screenshots at 1100×820, 1500×650 and 560×860:** front-on view, no visible room edges.
- **Forced poses:** eating (hand to mouth, facing the glass), reading the book at the desk, inspecting (hand to chin), knocking on the door.
- **30 seconds of live play in built-in mode:** he walks to the desk, sits and reads, and makes remarks. No console errors.
- **Ollama mode with `llama3.2:1b`:** a typed message got a model reply in 7.4 s.
- **GitHub Actions CI is green** on Ubuntu (Python 3.10 and 3.12), Windows and macOS. That covers the full Python suite, the room's JavaScript tests, and building the ZIP, extracting it and serving the app from the extracted copy. The macOS run found a reverse-DNS stall when the server starts. It's fixed.

## Not verified

- The frameless native window (`--desktop`). Double-clicking the Windows and macOS launchers (the app itself is tested on both in CI), voices and PyInstaller builds. The CI workflow exists but hasn't been run.
- Raspberry Pi performance and Chromium kiosk on a real Pi. Real microphone recognition: the 40 MB Vosk model download failed on this network, so the ears were only tested with a fake recognizer.
- Real WebGL on a GPU (only SwiftShader was used). Real browser audio.
- How it holds up after hours of continuous running.
