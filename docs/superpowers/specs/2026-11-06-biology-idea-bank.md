# Biology and apparatus: idea bank

The user asked for stranger visible events, more interaction without losing the fishbowl simulation, an optional emotion instrument, and randomized slug, worm, and biological-mass residents. Creative direction was delegated. This bank records the wider exploration; only the selected group belongs to this implementation.

Direction: a neglected Windows XP observation console attached to an increasingly biological service room. Worn, physical, funny and unsettling. The fixed room remains the focal point. No new inference runtime, currency, achievement interface, lore wall, external camera, or unbounded prop collection.

## Selected for this release

- Randomized human, slug, worm and biological-mass bodies, with distinct visible habits and responses to damp, noise and comfort. A human mind can inhabit each body; names and generated speech remain.
- An optional small XP instrument window exposing changing fear, curiosity, irritation and trust. These describe the deterministic simulation, not a model's internal feelings.
- A reusable fan with four directions and three speeds, plus a mist valve. The draft physically steers the existing cloud and paper boat; directing the boat to the open drain replaces an arbitrary sailing timer.
- A resonance instrument with three frequencies, three intensity states and three floor pads. Its settings remain adjustable during resident work. Gentle affinity resonance encourages a species-specific response; high resonance warns before something goes wrong.
- A reversible gravity leak: the occupant and a fixed set of loose props float. Bass or switching off settles them. Physical work pauses and resumes; terminal hazards still run and cannot resurrect a resident.
- An enormous eye or face pressed against the observer glass, produced by low treble, darkness and mist. The camera never leaves the room. Light or bass makes it retreat, and the resident can be soothed.
- A resident-built nest using three distinct delivered scraps: paper, wire and cloth. Each installation is physical work through the existing single Chamber executor. Species arrange the same finite props differently.
- A room-heart awakened by sustained gentle affinity resonance near the completed nest. Keeping it or releasing it through an open drain leaves a different bounded physical remnant. The living state itself is never persisted.

These belong together: the apparatus changes the environment; the body makes those changes legible; the instrument helps the observer learn; the nest gives gentle experiments a constructive outcome; overload and the glass visitor give those same controls dangerous surprises. They can be repeated and combined with ordinary life instead of adding another serial queue of encounters.

## Deferred ideas

1. The clockwork mouse develops a favored corner and hides there after loud experiments.
2. Soup temporarily changes a mass resident's silhouette.
3. A worm or slug sheds an abandoned outline that the resident initially mistakes for another occupant.
4. A flower turns toward the observer rather than the lamp.
5. The borrowed shadow is caught in the fan and comes out folded.
6. The neighbor returns an object before it has been delivered.
7. A mirror briefly shows the resident's previous body shape.
8. A second, tiny door appears inside the nest.
9. Repeated resonance gives the brass bell a small tongue.
10. The resident makes a curtain to cover the inspection eye.
11. A paper moth follows warm light and lands on the telephone receiver.
12. A jar stores an echo that responds to knocks with the wrong rhythm.
13. Three finite scraps can be rearranged into a shelter, shrine or small resonant sculpture.
14. A stubborn growth colonizes one wall socket and politely refuses inspection.
15. A room number crawls away from its plate and has to be coaxed back with warmth.
16. An envelope under the door opens its own mouth to complain about the room's noise.

These are possibilities, not promised additions. More linear cases, collectible counts, care chores, arbitrary timers and decorative overlays were rejected as the main expansion because they add activity without improving the observer's ability to experiment.

## Integration contract

`web/laboratory.js` owns deterministic apparatus, resonance consequences, nest state and the small archive allowlist. `Laboratory.interact(life, kind, payload)` returns `null` for actions it does not handle and a boolean for recognized actions. Fixture settings are immediate while alive. Resident work uses `lab:` jobs in the existing Chamber executor; no automatic work queue competes with NightShift.

The three resonance pads are `[-0.65, 0.85]`, `[0.6, 0.6]` and `[0.15, -1.55]`; the nest sits at `[-0.75, 0.65]`. The renderer consumes bounded snapshots. Draft supplies a vector to NightShift rather than mutating boat state itself. Temperament remains the sole authority for emotion values; the laboratory supplies normalized current stimuli and semantic event pulses.

Call laboratory ticking after terminal hazards and arrival handling but before night, chamber and navigation. While gravity suspends movement, continue ticking the laboratory so recovery remains possible. Dispatch completed `lab:` work to `laboratory.complete`, and notify `laboratory.interrupt` when existing work is canceled. A stale or terminal callback must never create a scrap, heart or remnant.

Only `archive.laboratory.remnants` persists, using the allowlist `cradle`, `heart`, `shed`. Prior inhabitants' bodies, identity, apparatus settings, live hearts, jobs, dialogue and positions are not restored.

## Verification intent

Exercise public fixture actions during occupied work; invalid payloads; distinct morphology responses; both nest branches; incorrect and distant resonance; interrupted and stale job callbacks; gravity warning, recovery and rearming; apparition entry, withdrawal and event latching; drain closure during release; and thirty minutes of repeated changes. Parent integration checks cover actual walking, every body and prop on screen, the fixed camera, mobile controls, real inference, and bounded rendering resources.
