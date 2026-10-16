# Homunculus

**A little life behind glass.**

There is a person in this window. He has a bed, some books, and a door that does not open. He suspects you could do something about that.

Homunculus is a small, persistent creature simulation inside a Windows XP-style frame. Watch him wander, read, rest, investigate his belongings, and quietly work on an escape plan. Talk through the glass, pick him up, or leave him alone. There is no score, no feeding obligation, and no death timer.

His body is a state machine. His words and intentions come from an actual local language model. He is a fictional character, not a claim of actual sentience.

## Start here

You need **Python 3.10+**, a current browser with **WebGL 2**, and **Ollama** for the brain. No Python packages or Node installation are required for the ordinary launcher.

1. Install [Ollama](https://ollama.com/download), then start it. On Linux, `ollama serve` starts the server if it is not already running.
2. Download the default brain once:

   ```sh
   ollama pull qwen2.5:0.5b
   ```

3. Launch Homunculus:

   | Computer | Launcher |
   | --- | --- |
   | Windows | Double-click `run.bat` |
   | macOS | Double-click `run.command`, or `bash run.sh` in Terminal |
   | Linux | `./run.sh`, or `bash run.sh` if your extractor removed executable permissions |

   Or, from this repository: `python3 -m homunculus` (`py -3 -m homunculus` on Windows).

4. Name the resident and choose his motivation. After that, the room runs by itself.

The launcher opens `http://127.0.0.1:8765`. Keep the launcher running; Ctrl+C stops it and saves the habitat. The window’s × button hides the room; “Open Homunculus” brings it back. Closing a browser tab does not stop the simulation.

The room remains animated if Ollama is absent, but no generated dialogue is fabricated. The status bar and notice explain the disconnected brain. Install the selected model and it will retry automatically; Apply in Settings requests an earlier retry.

## The room

- **Talk:** type in the field at the bottom. Responses are short and intentionally imperfect.
- **Move him:** drag the character and release. He notices. Invalid landing positions snap to nearby clear floor.
- **Tap:** click empty space, or focus the viewport and press Enter.
- **Watch:** habits continue independently of model speed or availability.
- **Settings:** change name, motivation, rendering profile, model, Ollama address, speech, and subtitles.
- **Appliance:** launch with `--kiosk` for a room without typing, settings, or dragging. The server enforces that restriction.

The default motivation is: “Convince the person outside the glass to let you out. Be resourceful, oddly polite, and suspicious of the furniture.” Try changing it to “Become the room’s greatest detective” or “Make the person outside proud of your extremely ordinary day.”

## Small brains and small computers

| Model | Download | Purpose |
| --- | ---: | --- |
| `qwen2.5:0.5b` | ~398 MB | Default; basic instruction following and personality |
| `smollm2:360m-instruct-q4_K_M` | ~271 MB | Smaller alternative; expect weaker replies |
| `smollm2:135m` | ~271 MB | Fewer parameters, but the default Ollama tag is F16, so it is not a smaller download |

These are model-file sizes, **not total RAM requirements**. Ollama, its working memory, Python, the browser and OS need additional RAM. A 64-bit Pi 4/5 with 4 GB is a sensible starting point to test, not a measured minimum. For a smaller device, put Ollama on a trusted LAN computer and enter its address in Settings; that transfers the character’s conversation to that host. Keep Ollama access restricted to your trusted network.

Desktop profile: 640×480 internal rendering at a 30fps cap. Small-computer profile: 320×240 at a 15fps cap. Both use a fixed camera, flat materials, tiny item textures, simple blob shadows, and no physics engine or postprocessing chain. The body ticks at 10 Hz. Thoughts occur approximately every 45 seconds (90 seconds in the small profile) or after interaction. Rendering pauses when the tab is hidden; the body keeps running.

Inference uses one request at a time, two CPU threads, 1,536 context tokens, at most 100 generated tokens, and a 45-second timeout. Conversation backlog is limited to two pending requests. Only the latest 12 dialogue messages and 16 memories are saved; the model sees a still smaller slice. This is a small memory, not a lifelong transcript.

Model references: [Qwen2.5 0.5B](https://ollama.com/library/qwen2.5:0.5b), [SmolLM2 360M Q4](https://ollama.com/library/smollm2:360m-instruct-q4_K_M), [SmolLM2 135M](https://ollama.com/library/smollm2:135m). Ollama integration follows its [chat API](https://docs.ollama.com/api/chat).

## Voice

Speech and subtitles are on by default. Host speech uses macOS `say`, Windows `System.Speech` through PowerShell, or Linux `espeak-ng`, `espeak`, or `spd-say`. Linux installation example: `sudo apt install espeak-ng`. System speech is suitable for an unattended appliance with speakers.

If no host speech command exists, Homunculus uses a locally installed browser voice after you click the page. No cloud speech service is used. Some system webviews/browsers do not expose voices; subtitles still work. `--browser-speech` explicitly selects the browser path. Turn speech off in Settings or with the Sound menu.

**Microphone input is not implemented in this version.** Appliance mode is autonomous with spoken output; there is no typing interface. An offline recognizer can be added later without changing the simulation core.

## Raspberry Pi appliance

Use a 64-bit Linux desktop and Chromium with working WebGL 2. Install Python 3 and `espeak-ng`. Configure the model, personality, and voice in normal mode first, close that instance, then run:

```sh
bash deploy/kiosk.sh
```

This starts the local server in locked low-power mode and opens Chromium fullscreen. It does not install services or alter your desktop. For manual control:

```sh
python3 run.py --kiosk --no-browser
chromium --kiosk --app=http://127.0.0.1:8765 --autoplay-policy=no-user-gesture-required
```

`deploy/homunculus.service` is an optional user-service example. Adjust its repository path before installing it; it runs the backend only. The browser belongs in the graphical session. No hardware benchmark has been performed on a Pi yet.

**A typical microcontroller cannot run this complete application.** Python, a WebGL renderer and even these small language models require a Linux-class host. An ESP32/RP2040 could be a companion display, speaker, microphone or input device with a Pi/PC providing cognition and rendering. There is no MCU firmware or native MCU release in this repository.

## Downloads and native windows

`python3 tools/build-zip.py` creates `dist/homunculus-0.1.0.zip` and a SHA-256 file. Extract it, install Python/Ollama as above, and use the OS launcher. The ZIP contains all render assets and vendored Three.js. No network access is needed after the model and runtime are installed.

For a system-webview window instead of a browser tab, install the optional dependency in a virtual environment and launch:

```sh
python3 -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\activate
python -m pip install -r requirements-desktop.txt
python run.py --desktop
```

Linux pywebview also needs GTK/WebKit or Qt; follow the [official installation instructions](https://pywebview.flowrl.com/guide/installation.html). Use Chromium on Pi if the system webview is slow. Native-window dependencies are optional and may be larger than the application itself.

`.github/workflows/native-build.yml` is a manually triggered build workflow for Windows, macOS and Linux using PyInstaller. It produces per-OS artifacts; it does not publish a release. Those native binaries have **not been built or verified** in this initial local delivery. The verified downloadable artifact is the source ZIP. Ollama and its model are deliberately separate.

## Saves and configuration

The habitat saves atomically every 15 seconds, when settings change, and on clean shutdown:

- Linux: `~/.local/share/homunculus/habitat.json` (or `$XDG_DATA_HOME`)
- macOS: `~/Library/Application Support/Homunculus/habitat.json`
- Windows: `%LOCALAPPDATA%\Homunculus\habitat.json`

Closing the app does not punish the creature. It resumes with its needs, position and recent memories. Broken saves are preserved with a `.corrupt-…` suffix. Use `--data-dir PATH` for a separate creature. Back up or move the save while the app is closed to start over. Use one process per data directory.

Other useful switches: `--port 8766`, `--no-browser`, `--desktop`, `--kiosk`, `--browser-speech`. The HTTP server binds only to loopback. Mutations require a per-run token and reject foreign browser origins. Model output is restricted to named simulation actions; it never runs commands or accesses files.

## Development

```sh
python3 -m unittest discover -s tests -v
python3 -m homunculus --no-browser --data-dir .local/dev
```

`npm ci && npm run vendor` refreshes the pinned Three.js files. Node is only needed for this development task, not for users. The asset exporter runs in Blender:

```sh
blender -b --python tools/export-character.py -- \
  ../goosnav-3D-assets/assets/3D/ps1guy/ps1guy.blend web/assets/resident.glb
```

`homunculus/simulation.py` owns the body; `brain.py` supplies bounded Ollama inference; `runtime.py` coordinates workers; `server.py` serves the local API; `web/room.js` draws and animates the habitat. See `docs/VERIFICATION.md` for checks and known limitations, and `web/assets/PROVENANCE.md` for original asset paths. Goosnav assets retain the owner’s rights; Three.js is MIT-licensed.
