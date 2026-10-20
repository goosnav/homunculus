# Rights and third-party components

Homunculus application code and Goosnav assets: copyright 2026 the repository owner. All rights reserved. No permission for public redistribution of the Goosnav character or product artwork is implied by this repository.

Three.js and its loader utilities are included under the MIT license. The complete license is in `web/vendor/THREE-LICENSE.txt`.

The static browser build includes SmolLM2 135M Instruct ONNX weights under Apache 2.0. The license is in `web/vendor/SMOLLM2-LICENSE.txt`; `tools/model-lock.json` records the exact source revision, URLs and SHA256 checksums. The original model is HuggingFaceTB/SmolLM2-135M-Instruct, converted by onnx-community. Transformers.js and ONNX Runtime are under Apache 2.0 and MIT respectively; their notices are in `web/vendor/transformers/`. The separate legacy desktop edition requires an external Ollama installation and model download under their respective licenses. pywebview and PyInstaller are optional external build dependencies; their respective licenses apply.
