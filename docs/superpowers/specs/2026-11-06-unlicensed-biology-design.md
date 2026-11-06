# Unlicensed biology

The user asked for a crazier, deeper fishbowl simulation, an optional emotion instrument, and Goosnav-style slug, worm and biological-mass occupants selected randomly on spawn. They delegated creative direction and execution; earlier authorization to publish tested game changes to main remains in force. This design records implementation decisions rather than requiring another approval loop.

Direction: a shabby observation chamber acquiring unsuitable forms of life. Worn XP laboratory controls, physical absurdity, resident-owned behavior. The camera remains fixed; no destination view, player-avatar movement, exposition wall, achievement dashboard, fake model speech, or model/runtime explanation in the game interface.

## Four bodies, one individual per life

Spawn randomly selects human, slug, worm or biological mass. The original v12 human stays available. Three actual editable Blender sources and compact rigged GLBs are built in the active Goosnav 3D library, deriving the characteristic long nose and puppet face from active v12 code. Distinct silhouettes: low slug mantle/foot/feelers, segmented worm, asymmetric lobed mass. Each has expressive jaw/eyes and body joints. Creature locomotion, arrival, work, rest, recoil and death have dedicated poses; they do not walk on invisible human legs. The tiny language model receives the actual body premise.

Only the selected body loads. Switching bodies releases the previous body resources and reuses the chamber renderer/props. Death is permanent: the human leaves its skeleton; creatures leave a collapsed dry remnant, with no further replies. Hole deaths and departures leave the room empty. No body or living state persists across reloads. Debug-only forced selection supports deterministic validation; public spawning stays random.

## Emotion instrument and observer contact

An optional nonmodal XP `emotion.exe` utility opens from the menu. It shows one analog signal/short bounded trace and five selectable readings: Fear, Trust, Curiosity, Irritation, Energy. No random fake heartbeat or medical units. Fear/curiosity/irritation persist and recover in the simulation; trust reflects the existing cooperation that drives refusal, energy is the existing need. Accepted interventions and actual completed care cause changes. A model feeling cannot erase previous fear. Signals stop on death; every life resets them.

The instrument is draggable by its titlebar, keyboard movable, closable with Escape, clamped to the visible mobile viewport and does not trap focus or block page zoom. It starts closed. Caption is resident name or NO SIGNAL. The room remains the primary view.

Tapping glass passes its position as attention, not a movement order. A gentle wave is a separate cooldown-limited action. The resident may look, ignore it when irritated or busy, or recoil after repeated tapping. Visitors and ongoing work take priority. No inference request per pointer movement.

## Interacting systems

A compact apparatus drawer provides fixtures that remain usable while the resident works:

- Draft direction and off/gentle/strong power move cloud cover and the existing paper boat. Rain has a physical position; steering a boat into the open drain replaces waiting thirty seconds. No body dragging or camera movement.
- Mist affects humidity. Morphologies have different responses to damp, light and vibration. Their response is visible in posture and emotion readings.
- Resonance has three tones, off/low/high power and three floor pads. A stable personal affinity can be discovered by watching behavior/readings. Sustained high power warns, then causes a reversible gravity leak: occupant and selected loose props float while jobs/navigation suspend. Off or bass lowers everything; hazards still work and death cannot be undone.
- Darkness, mist and low treble reveal a giant eye pressed against the observation glass. It withdraws when the conditions change. Only the glass apparition is shown; there is no exterior environment or camera switch.
- Offer paper, wire and cloth through the apparatus. The resident physically collects/installs each scrap into a species-specific nest. Low matching resonance near the completed structure awakens a small room-heart. Keep it, or have the resident carry it to the open drain. Branches leave different bounded physical remnants for future occupants. There is no resource grind or repeat reward counter.

These coexist with the six After Hours encounters. Physical jobs share Chamber's single movement owner. Fixture controls do not queue another person action. Cruelty can cause refusals; soup remains recovery. The resident can continue an ordinary life while the player experiments.

## Runtime and verification

No additional inference engine, dependency or API. Preserve 256-token input / 512-context / single worker, male filtered voice, small framebuffer and mobile 16px input. New scene props are finite and reusable. History, visual traces and persistence are bounded. Validate malformed actions and terminal/interruption cases. Save only allowlisted room remnants.

Test all four bodies, expressions and locomotion in real rendered screenshots; verify asset bounds/rigs/export hashes and source previews. Exercise apparatus combinations, gravity recovery, glass retreat, two heart outcomes, boat steering, emotion cause/recovery, instrument dragging/keyboard/mobile bounds, death and repeated spawns. Run full unit suites, static build, existing story routes, real model/voice/cache checks and longer browser memory soak. One fresh whole-branch review before publishing. Physical iPhone testing and human fun/retention remain separate from automation.
