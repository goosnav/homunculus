# Homunculus

A little life behind glass, inside a Windows XP window.

Press **Spawn homunculus**. A real tiny language model downloads into the browser while the room takes shape. The resident tries the door, works on the wall, and attempts to copy himself into a beige computer. His words and action choices come from the model; his body keeps moving while it thinks.

The buttons beneath the message box change his circumstances. Force-read feeds him actual Book II OCR excerpts. An anvil kills him, then leaves a skeleton or a collapsed creature husk. Black hole opens a floor void; stepping into it permanently removes him. Further messages get no reply. Refreshing or closing ends that individual; a new spawn creates someone else. Model files can remain cached separately.

Each arrival drops from above with loose limbs, a floor impact and a slow recovery, at a slightly different position. Rare large checkerboard Platonic solids pass through the walls. He watches them fearfully; some lunge and make him stumble.

## Run the browser edition

Use Node **22.12 or newer** to build:

```sh
npm ci
npm run build
npm run check:build
npm run preview
```

Open the local address Vite prints. `dist/` is the complete static website: no Python backend, Ollama, API key, database, or server-side inference. For development, run `npm run dev`.

The model is **SmolLM2 135M Instruct**, Q4_0 GGUF, running on single-thread CPU WebAssembly through wllama 2.3.7. The build downloads a fixed, checksum-verified model revision from Hugging Face and includes its tokenizer reference files and approximately 88 MiB of weights in `dist/`. Weights are split into 20 MiB files for Cloudflare Pages. On Spawn, the browser reads those files from the same website and caches them when storage persists. There are no runtime requests to Hugging Face or another inference service. The extracted browser ZIP also contains the model and works without internet when served on localhost. WebGL 2 and WebAssembly are required. Initialization has a three-minute timeout and shows an error with retry/cancel; there is no scripted substitute mind.

The wasm32 runtime is deliberately pinned for browser compatibility. The superseded ONNX runtime is excluded from the deployed build; Transformers.js remains a development dependency for reference-tokenizer regression tests.

This model is deliberately small. Its answers can be odd, generic, or wrong. Speech is short. Ordinary autonomous decisions are silent; major room encounters can prompt a brief reaction. The model chooses from validated actions and cannot directly manipulate geometry or execute code.

Inference input is capped at 256 tokens to limit memory during play. The WASM context is fixed at 512 tokens with 64-token batches. Action selection and speech reuse their common prompt context, and the KV cache is cleared between thoughts. Older context is trimmed before the current event; forced reading keeps material from both selected excerpts. Mobile controls accommodate the on-screen keyboard. Audio is enabled by the Spawn tap. A bundled Flite KAL male robot voice generates PCM in a worker, then passes through a 1,550 Hz low-pass filter for the glass effect. It uses no OS voice or speech service. Its approximately 21 MB runtime loads on the first spoken reply; effects use Web Audio. Browser/device audio restrictions and system volume still apply.

## The room remembers

Room service sends soup, chalk, a copper coil or a mirror through a physical hatch. The occupant collects and uses them over time; mistreatment can make him refuse, and food can rebuild cooperation. Lights, the three-channel receiver, the service bell and the door latch interact with those objects. The original coercive controls live in the Experiments drawer.

An after-hours shift unfolds through an unsolicited parcel, indoor weather, a telephone call, a loose shadow, an inspection and an eviction. The middle encounters change order; signals, instructions and alternative responses change what remains. The Things in the room drawer supplies contextual controls and a short clue. He can tend a plant, chase a wind-up mouse, feed the wall, or float a paper boat between arrivals. Optional paperwork accumulates under File.

The existing three departures open after the building finishes its inspection. He can also refuse eviction, claim the room and continue living through later incidents. Quiet intervals leave room for ordinary life and side play; Call night service brings the next incident early. The design target is 10–30 minutes of exploratory play, but a knowledgeable player can finish faster. Automated route timing verifies reachability, not enjoyment or retention. The camera stays on the room throughout: it never follows him or shows where he goes. The observation window remains open after departure or death, with a New occupant control.

A small local archive (`homunculus-room-v1`) remembers the room's visit count, physical traces, completed shifts and an allowlisted set of keepsakes. It never saves a living character or dialogue. A new occupant can notice an earlier outline, hook, signal residue, shelf objects or a plant that has taken root. Every route is available on the first visit; there are no daily locks, achievement counters or grind requirements. Storage denial simply disables continuity.

The human character is the owner's v12 export, with native frown, lip shapes, jaw and blinking eyes. `web/assets/asset-lock.json` records all imported model hashes and the local source commit. `node tools/sync-assets.mjs /path/to/goosnav-3D-assets` refreshes these checked-in assets explicitly; Cloudflare does not need the full asset repository or a Git LFS submodule checkout.

Project/escape rules are in `web/chamber.js`; after-hours encounters and independent play live in `web/night.js`. Their views are `web/chamber-view.js` and `web/night-view.js`. `npm run test:night` completes two full public-button shifts with alternate resolutions, staying/leaving, death, mobile controls and scene reuse. `SOAK_AFTER_HOURS=1 npm run test:stability` warms a complete shift before repeated real inference. `npm run test:chamber` exercises all three routes through the actual browser controls and simulation ticks; real-model and memory tests remain separate. These mechanisms keep running while inference is busy.

## Unlicensed biology

Each spawn randomly chooses a human, slug, worm or biological mass. The three creatures are original rigged Goosnav assets built from the active v12 face construction. Only the selected body loads; replacing it releases the previous geometry, materials and skeleton. Creatures crawl, deform, work, speak and collapse using their own poses. Their body type is included in the bounded language context. Source Blender files and render galleries live in `goosnav/goosnav-3D-assets`; `web/assets/creatures/source-manifest.json` pins the import.

**Emotion meter** opens a draggable, nonmodal XP instrument. It reports fear, curiosity, irritation, trust and energy from the running simulation with a bounded trace. Care, mistreatment, visitors and apparatus cause changes that settle gradually. A wave can earn a glance; a tap points his attention at that part of the glass. Busy or irritated occupants may ignore you. Neither gesture moves him or requests dialogue.

**Apparatus** controls a four-direction fan, mist and a three-note resonator aimed at three floor tiles. Air moves the indoor rain cloud and paper boat. The boat must actually reach the open drain. Moisture and resonance affect each body differently. Strong upper notes can suspend gravity; bass or power off brings everything back. Darkness, mist and gentle treble can attract an eye to the glass. These encounters keep the camera inside the original observation frame.

Paper, wire and cloth become a nest through real work. A matching gentle note near it can awaken a small room-heart. He can make it a home or carry it to the open drain. Cradles, hearts and shed shells are bounded room remnants; they do not save or resurrect their maker. These projects coexist with the full after-hours shift and its alternate outcomes.

`web/laboratory.js` owns the apparatus and project rules; `laboratory-view.js` renders a fixed set of reusable props. `temperament.js` owns emotional state and `instrument.js` displays it. `npm run test:biology` exercises all four actual GLBs, resource reuse, apparatus, heart building, mobile layout and permanent creature death through the static build. `SOAK_BIOLOGY=1 SOAK_SPECIES=mass npm run test:stability` first advances thirty simulated minutes of apparatus play before repeated real inference and idle survival. A larger [idea bank](docs/superpowers/specs/2026-11-06-biology-idea-bank.md) separates shipped features from future possibilities.

## Book II OCR

`tools/ocr-book.py` is a quick Python wrapper around Poppler and Tesseract. It renders scanned PDF pages and writes raw OCR into JSON, with incremental checkpoints and resume. No manual transcript cleanup.

Install `poppler-utils`, `tesseract-ocr`, and English OCR data, then:

```sh
python3 tools/ocr-book.py book.pdf --output .local/book2/ocr.json \
  --public-output web/assets/comic/excerpts.json
```

Use `--pages 5-30,40` for a subset. `--excerpt-pages` controls which PDF sheets go into the public JSON; defaults select eight. The complete 147-sheet book and its full OCR stay in `.local/`, outside Git and the build. The public game contains eight original page images and their raw text, described in `web/assets/comic/PROVENANCE.json`. Each forced reading picks two excerpts. The OCR tool generates text; the corresponding excerpt JPEGs are already included.

## Downloadable browser edition

After building:

```sh
python3 tools/package-browser.py
```

Extract `build/homunculus-browser.zip` and run its **Start Homunculus** launcher. This simple local package requires Python 3.10+ solely to serve static files on localhost. The simulation and model still run in the browser. No Python packages are needed. Alternatively, serve `dist/` with any static HTTP server; opening `index.html` as a file is unsupported.

## Cloudflare deployment

Use **Cloudflare Pages** with production branch **main**, repository root as the root directory, build command `npm run build`, output directory `dist`, and Node 22.12+. The build checks enforce Cloudflare’s [25 MiB maximum per asset](https://developers.cloudflare.com/pages/platform/limits/). The model is included as checksum-verified chunks, each at most 20 MiB. `npm run build` prepares the model and automatically verifies the completed site. The build requires internet on a fresh checkout; subsequent local builds reuse `.cache/models/`. Single-threaded WASM does not require cross-origin isolation headers.

The existing connected Cloudflare project is **Workers Builds**. It uses the same static output via `wrangler.jsonc`, with build command `npm run build` and deploy command `npx wrangler deploy`. No Worker application code or inference service is deployed. The repository pins Wrangler and CI checks its deployment dry-run. A Pages project can publish the identical `dist/` folder using the settings above.

The intended custom domain is **homunculus.goosnav.shop**. The live HTTPS deployment serves the static app and complete browser model. Its build and deploy checks pass; real inference, reading, death, refresh and cached-model reuse have been exercised on the public site. The existing Shopify apex domain does not need to change.

## Development and verification

```sh
npm test
npm run build
npm run check:build
python3 -m unittest discover -s tests -v
```

For an optional real-model browser smoke test, keep `npm run preview` running and run `BROWSER_EXECUTABLE=/path/to/chrome npm run test:browser` (set the environment variable using your shell’s syntax). This reads the bundled model on a fresh cache and blocks every off-site request. Set `BROWSER_TEST_URL` when using another port or the live HTTPS site. For Cloudflare deployments that inject Web Analytics, set `BROWSER_EXPECT_CLOUDFLARE_BEACON=1`; the test still blocks that script and every off-site request, reporting injected telemetry separately from unexpected application traffic.

The Python command tests the preserved desktop edition and creates its separate source ZIP. Run the Vite build again afterward before deploying `dist/`, so that folder contains only the website.

The browser implementation is in `web/life.js`, `mind-worker.js`, `browser-app.js`, and `browser-room.js`. It extends the existing Three.js room and uses the existing owner-supplied GLB assets. Add `?debug` for a local inspection interface. See [verification evidence and remaining checks](docs/VERIFICATION.md).

The original Python/Ollama desktop app remains available through the repository's original launchers and `python3 run.py`. Its server serves `web/desktop.html`. See [desktop instructions](docs/DESKTOP.md) for its configuration, persistence, appliance mode, and optional Ollama setup; those features describe the separate desktop edition.

Goosnav artwork remains its owner's property. See [asset provenance](web/assets/PROVENANCE.md) and [license](LICENSE.md). Runtime dependency licenses are included in the static build.
