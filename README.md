# Homunculus

**A little life behind glass.**

There is a man in this window. He has a bed, a desk, some Goosnav books, and a door that does not open. He knows when you are watching. He suspects you could do something about the door.

Homunculus is a small simulation inside a Windows XP window. The window is the whole app, and the room fills it edge to edge at any size. You look into one room through a fixed pane of glass, like a fishtank, and a PS1-style Goosnav character lives there, close enough to read his face. He eats from his bowl, reads at his desk, scratches his head, stretches, sleeps, knocks on the glass and tests the door. The camera never moves. You can talk to him, pick him up, tap the glass, or leave him alone. There's no score, no feeding, and he can't die.

His body is a state machine. His words come from an authored built-in personality, or from a real language model on your computer if you choose Ollama. He's a fictional character, not a claim of sentience. He just doesn't know that.

## Start here

You need **Python 3.10+** and a browser with **WebGL 2**. There are no Python packages to install. **[Ollama](https://ollama.com/download)** is optional but recommended. Without it, he runs on a simple built-in mind: short authored lines that react to what you do. With it, he has a real language model and a lot more personality.

1. Optional: install Ollama and start it. On Linux, `ollama serve` starts it if it isn't already running.
2. Start Homunculus:

   | Computer | Launcher |
   | --- | --- |
   | Windows | Double-click `Start Homunculus.bat` |
   | macOS | Double-click `Start Homunculus.command` |
   | Linux | `./Start Homunculus.sh` |

   On a headless machine, run `./Start Homunculus.sh --no-browser --port 8766`. `--local` is accepted and changes nothing, because Homunculus only ever listens on this computer.
3. Answer the first-run questions: his name, what he wants, and what he's running on. His voice can be the **built-in character**, which is the default and needs nothing installed, or **Ollama** for open-ended conversation. If you pick Ollama and the model isn't installed yet, click **Download** and the setup window downloads it with a progress bar. After that the room runs by itself.

The launcher opens `http://127.0.0.1:8765`. Keep the launcher running; Ctrl+C saves and stops it.

## What you can do

- **Talk.** Type in the box at the bottom. He turns to listen while you type.
- **Move him.** Drag him somewhere else and let go. He'll have something to say about it. A plain click on him is just a hello.
- **Tap the glass.** Click an empty spot, or focus the room and press Enter. If he's asleep, you wake him up.
- **Watch.** He can tell whether the window is on screen. Switch tabs or minimize it and he's alone, so he mutters less. Come back after a while and he notices how long you were gone, even across restarts.
- **File → His journal…** There are thirteen pages to fill. Some come from what he explores (the door, the book, the bowl, the bed) and some from what you do together: talking, knocking, picking him up, trying to let him out, leaving and coming back. Fill all thirteen and he pins a drawing of you on his wall. That's the only "win", and there's no hurry.
- **File → Let him out…** Go on.
- **Close him.** The × only makes the room go dark for a moment. He keeps running, and he noticed. Ctrl+C in the launcher really stops him; in the native window, use File → Exit.
- **File → Properties** changes his name, motivation, brain and voice.

The room follows your real clock. The wall clock shows your time. At dusk the lamp comes on, and at night the window goes dark and shows stars.

## His mind

The **state machine** runs the body 10 times a second. Energy, hunger, curiosity and a need for company decide where he goes: the bed, the desk, the bowl, the door, or the glass.

His **built-in character** (the default) replies at once with authored lines that fit what just happened. The status bar says **Built-in character**. If you choose Ollama and it doesn't answer (it isn't running, the model isn't installed, or it times out), the same built-in lines step in and the status bar says **Simple mind only**, so it never pretends to be the model.

The **language model** speaks every 45 seconds or so (90 seconds on a small computer), and whenever you do something. It gets a short description of the room, what just happened, and his recent memories. It replies with JSON: one line of speech, one allowed action, and a mood. The body takes that as a suggestion. When he's exhausted or starving, the body overrides the model. The model can't run commands, open files, or invent new actions.

Small models have bad habits, so some replies are never spoken:

- lines that repeat something he said recently
- lines that copy his built-in examples
- help-desk talk ("as an AI…")

He just tries again a little later. A **trust** score rises when you talk to him and when you try to let him out. It falls when you drag him around or close his window. His tone shifts with it: guarded, then bargaining, then pleading.

Pick a brain when you set him up, or later in **File → Properties**:

| Brain | Ollama model | Download | Notes |
| --- | --- | ---: | --- |
| Small (recommended on a computer) | `llama3.2:1b` | 1.3 GB | Noticeably more personality. About 7–10 s per line on a 4-core desktop CPU. |
| Tiny (Raspberry Pi) | `qwen2.5:0.5b` | 0.4 GB | About 4–5 s per line. Odder, more generic, and more often discarded as repetitive. |

You can type any other Ollama model under Advanced. Download sizes aren't RAM requirements: a loaded 1B model used about 1.4 GB here. The model unloads after 10 idle minutes. Inference runs one request at a time, on 4 threads (2 on a small computer), with a 1,536-token context and a 45-second timeout.

Try other motivations in Properties. The setup window has presets for Escape artist, Detective, Philosopher and Your biggest fan. Or write your own.

## Voice

His speech is spoken aloud and shown as subtitles by default. Host speech uses macOS `say`, Windows `System.Speech`, or Linux `espeak-ng`, `espeak` or `spd-say` (`sudo apt install espeak-ng`). If none of those exist, a local browser voice is used after your first click. No cloud speech is used. **Sound** in the menu bar turns speech off. Subtitles can be turned off in Properties.

## Raspberry Pi appliance

The appliance shows only the window, filling the screen. There's no typing, no settings, and you can't drag him. The server enforces this, not just the page. You can talk to him out loud through a microphone.

1. Use 64-bit Raspberry Pi OS with the desktop, then install the dependencies: `sudo apt install chromium espeak-ng alsa-utils`. Install Ollama and pull the tiny brain with `ollama pull qwen2.5:0.5b`. A Pi 4 or 5 with 4 GB is a sensible starting point. It hasn't been benchmarked on a Pi yet.
2. Run `./Start Homunculus.sh` once to name him and choose the tiny brain and the small-computer profile. Then close it.
3. Optional ears: `python3 tools/setup-ears.py`. This installs the [Vosk](https://alphacephei.com/vosk/) recognizer (on Raspberry Pi OS you may need `pip install --break-system-packages vosk`) and a 40 MB English model. Recognition runs offline. He stops listening while he's talking, so he doesn't answer himself, and what he heard is shown on screen.
4. Run `bash deploy/kiosk.sh`. It starts the habitat in appliance mode, adds `--listen` if Vosk is installed, and opens Chromium fullscreen. `deploy/homunculus.service` is an example user service for the backend.

**Microcontrollers:** a typical ESP32 or RP2040 can't run this. Python, WebGL and even a 0.5B language model need a Linux-class computer. A microcontroller could act as a companion speaker, microphone or display, with a Pi doing the thinking. That isn't built here.

## Downloads and native windows

`python3 tools/build-zip.py` creates `dist/homunculus-0.4.0.zip` and its SHA-256. The ZIP contains everything: the launchers (still executable), all the 3D assets, and a local copy of Three.js. Nothing is fetched at runtime. Ollama and its models are installed separately.

For a native window instead of a browser tab, `python -m pip install -r requirements-desktop.txt`, then `python run.py --desktop`. The native window is frameless, so the XP frame is the only frame. Drag it by the blue title bar. Linux also needs GTK/WebKit or Qt; see the [pywebview docs](https://pywebview.flowrl.com/guide/installation.html). `.github/workflows/native-build.yml` builds PyInstaller folders for Windows, macOS and Linux when you run it by hand. Those builds haven't been tested yet.

## Saves

He saves every 15 seconds, after settings changes, and when he shuts down cleanly. The save holds his needs, position, trust, mood, his last 16 memories and 12 lines of conversation, and when you were last there.

- Linux: `~/.local/share/homunculus/habitat.json`
- macOS: `~/Library/Application Support/Homunculus/habitat.json`
- Windows: `%LOCALAPPDATA%\Homunculus\habitat.json`

To start over, delete the file while Homunculus is closed. Use `--data-dir PATH` to keep a separate resident. A broken save is kept beside the new one as `.corrupt-…`.

## Privacy and safety

The server only accepts connections from this computer. Every action needs a token that changes on each run, and requests from other websites are rejected. Messages, model output and saves are size-limited. Typed messages and microphone transcripts go only to the Ollama address in Properties. That's this computer unless you point it at another machine on your network.

## Development

```sh
python3 -m unittest discover -s tests -v
python3 -m homunculus --no-browser --data-dir .local/dev
```

| Module | Job |
| --- | --- |
| `homunculus/simulation.py` | The body and psyche |
| `homunculus/world.py` | The room, the invisible walls and the paths |
| `homunculus/brain.py` | Prompts and filters for the language model |
| `homunculus/script.py` | His simple built-in mind |
| `homunculus/runtime.py` | Threads, who's watching, saves and model downloads |
| `homunculus/ears.py` | The optional microphone |
| `homunculus/server.py` | The local API |
| `web/room.js` | Draws and animates the room |
| `web/app.js` | The XP window: menus, dialogs, talking |

Add `?debug` to the URL to get `window.__room` for testing poses.

`npm ci && npm run vendor` refreshes the pinned Three.js files; users never need Node. The character is exported from the Goosnav asset repository with `blender -b --python tools/export-character.py -- ../goosnav-3D-assets/assets/3D/ps1guy/ps1guy.blend web/assets/resident.glb`.

`docs/VERIFICATION.md` lists what has been checked and what hasn't. `web/assets/PROVENANCE.md` lists where each asset came from. The Goosnav assets belong to their owner. Three.js is MIT-licensed.
