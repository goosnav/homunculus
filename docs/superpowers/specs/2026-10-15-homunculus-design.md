# Homunculus — a little life behind glass

An ambient creature simulation, framed as an old Windows XP application. A small person lives in a single room and gradually makes a case for being allowed out. The pleasure is observing purposeful, slightly ridiculous behavior and forming a relationship through brief conversation. No chores, death timers, currencies, or dashboards in the main experience.

## Experience

Fixed orthographic camera looking into a cutaway room. Warm dusty walls, checkerboard linoleum, a desk, bed, lamp, suspicious closed door, and the owner's actual Goosnav character and product models. Low-resolution real-time rendering, flat shading, nearest-neighbor textures, blob shadows. A blue XP title bar, restrained menus, tiny status bar, optional subtitles, and a message field. Drag the creature, tap the glass, or leave it alone. Settings live in a dialog; first launch asks for name, motivation, and machine profile.

Default premise: “You are a little person living inside a computer window. You have a bed, a desk, some books, and a door that does not open. Someone is watching from the other side of the glass. You would like them to let you out. You are not sure what ‘out’ is, but you are certain it has better furniture.”

## Architecture

Python 3.10+ standard-library local server owns time, state, persistence, input validation and one background cognition worker. Three.js is vendored locally and renders the room; it never owns canonical simulation state. No CDN, telemetry, cloud model, Electron bundle, or mandatory npm runtime. Optional pywebview uses the system webview for a native window.

The state machine ticks at 10 Hz and handles walking, resting, reading, inspecting, watching, eating, and escape attempts. Bounded needs and motives determine choices, and simple grid navigation avoids furniture. The LLM runs independently, at most one request at a time, on conversation or an occasional thought (45s desktop / 90s low-power). It gets compact observations and recent memories, and emits a short utterance and one allowlisted action. It cannot execute tools, access files, or change simulation rules. Invalid or unavailable output leaves the creature's physical behavior running; the connection state is visible and failure is never represented as an LLM-generated reply.

Ollama API uses a configurable endpoint/model, a 1,536-token context, bounded output and timeout. Default qwen2.5:0.5b (398 MB model download); smaller smollm2:360m-instruct-q4_K_M (271 MB) and smollm2:135m available as explicit choices. Runtime memory exceeds weight-file size. Use the existing local Ollama installation for verification.

Speech uses OS TTS (Linux espeak/espeak-ng, macOS say, Windows System.Speech) when available, with browser speech synthesis fallback and subtitles. Queue is bounded. Speech does not block simulation. Browser audio requires a user gesture; native host speech supports unattended kiosk operation.

## State and boundaries

Atomic versioned JSON save in the OS user-data folder, including settings, needs, position, bounded episodic memory and conversation. Corrupt saves are preserved separately. Offline time does not punish the creature. Loopback-only HTTP with request token and origin checks. Server serves only the web directory, limits message/body sizes, rejects non-finite coordinates and unknown settings, bounds cognition backlog, and locks configuration/input in kiosk mode.

## Delivery and hardware

Cross-platform source ZIP with launchers; optional PyInstaller per-OS build workflow. Desktop browser or native window, Raspberry Pi Chromium kiosk with low-power profile (320×240, 15fps) and host TTS. No interactive settings or typing in kiosk. Microcontrollers cannot host this complete Python/WebGL/Ollama application: document a companion-device architecture, not a fictitious native port. Voice input is optional future work; text input and spoken output are the implemented interaction path.

## Verification

Behavioral tests for needs, navigation, memory limits, persistence/corruption recovery, malformed model output, failed inference, bounded queues, token/origin checks, and kiosk restrictions. Browser checks cover onboarding, actual GLB rendering, conversation, settings persistence, dragging, degraded brain status and keyboard operation. Run a real Ollama inference and record measured size/latency without claiming untested Pi or other-OS performance.
