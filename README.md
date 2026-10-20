# Homunculus

A little life behind glass, inside a Windows XP window.

Press **Spawn homunculus**. A real tiny language model downloads into the browser while the room takes shape. The resident tries the door, works on the wall, and attempts to copy himself into a beige computer. His words and action choices come from the model; his body keeps moving while it thinks.

The buttons beneath the message box change his circumstances. Force-read feeds him actual Book II OCR excerpts. An anvil kills him, then leaves a skeleton. Black hole opens a floor void; stepping into it permanently removes him. Further messages get no reply. Refreshing or closing ends that individual; a new spawn creates someone else. Model files can remain cached separately.

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

This model is deliberately small. Its answers can be odd, generic, or wrong. Speech is short and unsolicited model decisions are silent. The model chooses from validated actions and cannot directly manipulate geometry or execute code.

Inference input is capped at 256 tokens to limit memory during play. The WASM context is fixed at 512 tokens with 64-token batches. Action selection and speech reuse their common prompt context, and the KV cache is cleared between thoughts. Older context is trimmed before the current event; forced reading keeps material from both selected excerpts. Mobile controls accommodate the on-screen keyboard. Audio is enabled by the Spawn tap. A bundled Flite KAL male robot voice generates PCM in a worker, then passes through a 1,550 Hz low-pass filter for the glass effect. It uses no OS voice or speech service. Its approximately 21 MB runtime loads on the first spoken reply; effects use Web Audio. Browser/device audio restrictions and system volume still apply.

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
