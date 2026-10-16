# Changelog

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
