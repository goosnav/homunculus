# Changelog

## 0.4.0 — 2026-10-16: through the glass

**A window, not a video game**
- **Static, front-on camera.** You look straight into his room through the glass, from a little above his eye line, like a fishtank. He takes up about a third of the view, instead of being a small figure in an isometric room. The camera never moves. It widens only when a narrow window needs it, so his whole box stays visible at any window shape. A right-hand wall was added so the room still has no visible edges.
- **He's alive in there.** He eats from his bowl (reaches in, brings food to his mouth, chews), reads a small red book at the desk and turns its pages, prods the booster pack and then stands with a hand on his chin, pushes on the door and knocks on it, and paces with his hands behind his back. When idle he fidgets: he scratches his head, stretches, shrugs and looks around. The bowl moved so he faces you while he eats.
- **The built-in personality is the default.** The first-run window offers the built-in character (no downloads) or Ollama (open-ended conversation). Older saves that already used Ollama keep it.

**Hardening (carried over from the unfinished upgrade pass)**
- Saves:
  - reading a save is strict: size and nesting limits, and `NaN` or `Infinity` is rejected
  - a save that can't be read for permission reasons is never overwritten
  - an oversized save keeps the last good file
- Model downloads have to finish with Ollama's success message, progress is clamped, and a failed download can be retried.
- The model list is validated.
- A reply to a queued message sees exactly the world as it was before that message.
- The page reconnects after the launcher restarts.
- Menus work with the keyboard. With the room focused, arrow keys move him, Enter taps the glass, and Escape cancels a drag. Cancelled drags put him back.
- The packaged app opens its own native window by default.
- CI runs the tests on Linux (Python 3.10 and 3.12), Windows and macOS, runs the room's JavaScript tests, and builds the source ZIP.

**Removed**
- The button-driven "paper star" project from the unfinished pass. It made the window feel like a game UI. The journal and the drawing he pins on the wall remain the quiet, passive progression.

## 0.3.0 — 2026-10-15: the playable upgrade

This release acts on the runtime, player-experience and security audit that was started before it.

**More to do**
- **He's never mute.** Without Ollama he runs on a simple built-in mind. It has authored lines for taps, being picked up, the dark, ACCESS DENIED, your return, greetings, questions and goodbyes. Lines don't repeat back to back. The status bar says "Simple mind only" rather than pretending.
- **A shared project: his journal (File → His journal…).** It has 13 pages. Seven come from things he explores on his own (the door, the book, the booster pack, the bowl, the bed, the glass, the floor). Six come from things you do together (talking, knocking, picking him up, the dark, ACCESS DENIED, coming back). Missing pages show a hint. Pages are saved, and a notice appears when one is found.
- **A keepsake.** When all 13 pages are found, he pins a drawing of you on his wall and tells you about it.
- **He remarks on what he finds.** These remarks wait their turn and never interrupt a reaction to something you did.

**Clearer feedback**
- What you type is echoed on screen ("YOU") straight away.
- A plain click on him is a hello. Only a real drag picks him up and costs trust.
- A missing 3D asset is no longer reported as a WebGL problem.
- If the launcher restarts, the page picks up the new session token by itself.
- Multi-line motivations are accepted.
- Opening the window counts as being watched immediately.

**Fixes**
- A reply to a queued message only sees the conversation before that message.
- A save containing `Infinity` or `NaN`, or larger than 2 MB, is moved aside instead of crashing the body thread.
- A late, rejected thought from an old personality can no longer overwrite the new brain status.
- Absence is measured from your last visit, not the last autosave.

## 0.2.0
- Single XP window that fills the page, with a frameless native window and an edgeless room that fills any window shape.
- He knows when he's being watched, plus trust, release attempts, and downloading a brain from inside the app.
- Optional offline microphone (Vosk), Start Homunculus launchers, the Pi appliance layout, and a source ZIP.
