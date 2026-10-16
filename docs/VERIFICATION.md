# Verification record

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

## Not verified

- The frameless native window (`--desktop`). Windows and macOS launchers, voices and PyInstaller builds. The CI workflow exists but hasn't been run.
- Raspberry Pi performance and Chromium kiosk on a real Pi. Real microphone recognition: the 40 MB Vosk model download failed on this network, so the ears were only tested with a fake recognizer.
- Real WebGL on a GPU (only SwiftShader was used). Real browser audio.
- How it holds up after hours of continuous running.
