# Goosnav assets

Used with the owner's instruction for Homunculus. These remain the owner's assets; no third-party redistribution license is granted here.

- `resident.glb`: current owner-authored `exports/ps1guy_v12.glb`, copied from local asset-library commit `beaa91a01f4aff1513ff0b33d95554801e08dd80` on 2026-10-31. This local committed revision is ahead of the asset library's remote main at import time. Its native puppet jaw, lip/frown shapes and blinking eyes replace the previous v10 skin patch and runtime mouth overlay. Geometry, rig and morphs are preserved. No asset-repository commits were published by this task.
- Exact source paths, sizes and SHA256 values for all six GLBs are in `asset-lock.json`. Refresh explicitly with `node tools/sync-assets.mjs /path/to/goosnav-3D-assets`. Production builds use the checked-in GLBs and do not clone the asset library. The project does not currently have an asset submodule.
- `book.glb`: `props/ps1/book2_goosnav_dilemma.glb`.
- `pack.glb`: `props/ps1/goosklerf_booster_pack.glb`.
- `zine.glb`: `props/ps1/goosnav_zine_09.glb`.
- `card.glb`: `props/ps1/goosklerf_freewill.glb`.
- `skeleton.glb`: copied from `goosnav-3D-assets/exports/ps1guy_skeleton_v1.glb` on 2026-10-19. Used after terminal death in the browser edition.
- `comic/`: eight excerpt scans from the owner's actual Book II PDF, with raw Tesseract OCR. Full source/hash/page mapping: `comic/PROVENANCE.json`. The complete book is not bundled.

Copied from the adjacent asset repository on 2026-10-15. Original files were not modified. This is a 3D simulation, not new comic artwork.

## Creature adaptations

The slug, worm and biological mass in `creatures/` are original Goosnav-style adaptations of the active v12 character face, authored in the owner's `goosnav-3D-assets` repository. They are not claims of canonical comic designs. Editable Blender sources, rig contract, rendered previews, and focused validation are published at commit `21b0ec9`. `creatures/source-manifest.json` contains full source commit and checksums; tests verify the bundled bytes. No external textures or remote runtime asset dependencies are used.
