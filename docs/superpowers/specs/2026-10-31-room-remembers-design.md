# The room remembers

A major playable iteration, commissioned with creative discretion. Direction: a neglected Windows XP observation console watching a shabby, impossible room. Physical, dry, unsettling; no neon dashboard, lore cards, achievement list, daily chores, or dialogue dump. Existing original Three.js room remains the focal point. Follow the aesthetic-web-design anti-slop field guide in the adjacent Goosnav skill pack.

## Player experience

The observer can help as well as hurt. Room service sends a physical object through a hatch. The occupant walks over, picks it up, and does something legible with it. Four deliveries: soup, chalk, copper coil, mirror. One delivery/project at a time; repeated clicks cannot accumulate objects. Cruel interventions damage cooperation; soup restores it. Refusal is a physical gesture and returning tray, not a hidden permanent soft-lock.

Three routes are available on the first life. Chalk leads to an outline on the wall; lights out reveals it, three knocks make it open, and Let him out sends him through. A coil repairs the computer; tuning through three channels shows a distinct carrier signal. Darkness plus the carrier lets him transfer into the screen. A mirror reflects an approaching impossible solid; a service bell can attract one, with a cooldown. A reflected visitor leaves a key, which the occupant collects; Let him out then opens the actual door. The occupant performs work over seconds, with real progress on props. Discoveries have clear feedback without announcing recipes or numerical progress. Readiness is visible: a door-shaped light, a steady waveform, a key in hand. A small optional one-line affordance may explain immediate feedback.

The camera never leaves the room or follows the occupant. No destination is shown, including after computer transfer: the screen loses its carrier. Each ending has an authored departure sequence and a distinct empty room, followed by an unobtrusive New occupant button. Death remains permanent. New lives do not resurrect old individuals. Anvil and hole still kill, including during projects or departure before the escape completes. The old coercive tools remain available in an Experiments drawer; cooperative tools lead the default toolbar.

## Return visits and lore

The room, not a living simulation, persists locally. A bounded archive stores visits and three discovered traces: a chalk doorway, a signal echo, a key hook. Later occupants notice these traces; a chalk outline shortens drawing work, a signal echo alters the computer idle waveform, a key hook remains on the wall. These are physical hints about prior lives, not a collectible score. Session states, dialogue and living characters are never restored. Corrupt/unavailable storage falls back safely to an empty archive. A fresh life always has access to all three routes. Room number and a few inherited marks create continuity. No fabricated canonical Goosnav comic lore: this is original game fiction.

## Models and technical limits

Use the latest available owner-authored v12 character export with native jaw/frown/blink morphs; remove the old overlaid mouth. Retain the skeleton and actual licensed book/pack/card props. Homunculus has copied assets, not a submodule. Record hashes and source commits in an asset lock, without making Cloudflare clone the complete asset library or relying on unpublished commits at build time. Do not alter the dirty skill-pack repository or publish the asset repository's ahead commits.

Preserve CPU wllama Q4_0, input <=256 tokens, fixed 512-token context, single worker, bounded rendering, male audio and static dist build. The new gameplay is deterministic and runs during slow or failed inference. No new inference model, network service, fonts or paid API. New event context remains concise. Fixed reusable meshes/materials, no per-frame texture/object allocation. Respect mobile keyboard behavior, 16px inputs, touch targets and pinch zoom. New controls have keyboard equivalents and labels.

## Architecture

`chamber.js` owns the experiment state machine and bounded archive helpers; `Life` owns navigation, interventions, terminal states and delegates projects to it. `chamber-view.js` owns reusable scene props/visual sequences and interaction hit targets. The app owns drawers, archive writes, status feedback and worker lifetime. v12 face animation is separate from gameplay. Existing model-generated words remain real; no canned dialogue is presented as generated speech.

## Acceptance

Prove three end-to-end routes using normal Life interactions and walking/ticking, recover cooperation after cruelty, interruption/death during every route, no resurrection, bounded persistence, duplicate delivery/bell spam, all scene props reset on respawn. Exercise real browser buttons, the updated face, native audio, mobile layout, model input bound and worker termination. Inspect screenshots of arrival, delivery, work, each exit and inherited traces. Repeat real inference while the richer scene runs and compare memory to the October 20 baseline. Push to main after verification, using the user's standing publication authorization.
