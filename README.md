# Lenz's Alibi — The Faraday Case

A first-person forensic-physics mystery. Explore a 3D electromagnetics lab, solve physics puzzles on the equipment left running, and use the verified results to name the culprit, the method and the hiding place.

## Run it

```bash
python server.py
```

Opens http://localhost:8140. (Any static server works; `python server.py 9000` picks another port.)
The 3D engine (three.js r128) and the two web fonts load from a CDN, so the first load needs internet.

**Graphics.** The title screen has a *High-detail graphics* tick box (soft shadows, sharper rendering). Untick it on a slow laptop. (Bloom post-processing was removed — it caused lag.)

**Tutorial.** The big *▶ Tutorial* button on the title screen plays Case 01 in guide mode. The *Guide mode* tick box turns the same help on for any case:
- an objective card (top-right) with a compass arrow and distance to the next goal,
- glowing arrows on the floor (path-found around walls) leading to an orange beacon over the next device,
- a plain-language explainer for whichever handheld tool you are holding,
- a foldable "how this device works" guide inside every terminal and the case board, with up to four optional hints (each more specific than the last).

- **Flux**, a floating 3D horseshoe-magnet detective (`js/flux.js`), talks you through every step. Inside each device he reads your current settings and tells you what is wrong and why: a nudge first, then the exact fix after a second mistake.

Press **H** in game to hide or show the guide.

## Controls

| Key | Action |
| --- | --- |
| W A S D, Shift | move, run |
| Mouse (click the view first), ← → | look |
| E | inspect equipment |
| 1 / 2 / 3 | magnetometer / iron-filing spray / induction wand |
| Click (with a tool held) | magnetometer: log a reading to the Survey map · spray: drop filings (also mapped) |
| Tab | case board and accusation |
| H | hide / show the tutorial guide |
| M | sound on / off (also a Sound checkbox on the case menu) |
| Space / Enter / Esc | skip the ending cutscene |
| Esc | close a terminal, release the mouse |

## Tools

- **Magnetometer (1)**: shows B where you stand. Click to log a reading; the Field Survey Table only plots readings you logged (there is no auto-sweep), so you have to walk the lab to find the hidden magnet.
- **Iron-filing spray (2)**: 14 cans. Each patch shows field direction on the floor and on the Survey map (direction only, no strength).
- **Induction wand (3)**: buzzes near the live supply conduit. The last step of the Maglock Conduit Panel is to follow the buzz from the blast door to the bench outlet it feeds.

## Ending cutscene and sound

- A correct accusation plays a ~28 s in-engine cutscene before the verdict screen. It shows the Case Board ("CASE SOLVED"), then the hidden panel being unbolted and set aside. Behind it is a dark cavity (or a shaft for the floor panel), drawn through a stencil cut-out in the wall or floor, and the cryo pod slides out of it. Dr. Thorne steps out and shivers. The two-piece blast door then slides open onto a lit corridor, and two officers walk in, cuff the culprit and escort them out. The people are built from jointed parts (knees, elbows, faces, hair) and each suspect has their own look. It works for every panel position and can be skipped.
- `js/audio.js` makes all sound with the Web Audio API (no audio files). A calm A-minor chord pad plays throughout. A soft heartbeat pulse and a gentle arpeggio grow as you verify clues, during field surges and in the cutscene. Underneath is a very quiet room tone, a low drone near the accelerator, footsteps and the wand hum. There is no crackle or hiss. The music is muffled while a terminal is open.

## Cases

- **Case 01 — The Vanishing in Bay 2** (tutorial): one Faraday oscilloscope puzzle, one hidden magnet, 3 suspects.
- **Case 02 — The Cryo-Shaft Incident**: eddy-current braking, Ampère's law + counter-solenoid, decoy fields, 3 suspects.
- **Case 03 — Cold Case Generator**: all four instruments, 4 suspects, 2–4 decoys, field surges and thermal drift.

Every case is built from the **seed** on the title screen: same case + same seed = same culprit and numbers, so a class can compare work. **AP Exam Mode** hides live readouts and field arrows and requires a hand calculation before the instruments run.

## Files

| File | What it holds |
| --- | --- |
| `index.html`, `css/style.css` | page shell, menu, HUD, overlay styling |
| `js/case.js` | seeded RNG, shared physics, lab layout, procedural case generator |
| `js/world.js` | 3D lab, movement and collision, handheld tools |
| `js/puzzles.js` | Ghost-Pulse Oscilloscope (Faraday/Lenz), Maglock Conduit Panel (Ampère/solenoid) |
| `js/audio.js` | procedural soundtrack, soft lab ambience and sound effects |
| `js/puzzles2.js` | Cryo-Shaft Drop Rig (eddy braking), Mass Spectrometer (Lorentz), Field Survey Table (superposition) |
| `js/main.js` | menu, HUD, terminals, case board, accusation, instability events |
| `js/flux.js` | Flux sidekick: 3D model and device-aware advice |
| `js/tutorial.js` | guide mode: objective steps, floor-arrow path finding, tool/device explainers, hints |
| `server.py` | local no-cache dev server |

## Physics models

- **Faraday**: flux per turn Φ(x) = Φ₀(1 + x²/a²)^(−3/2); ε = −N dΦ/dt; peak |ε| = 0.859·N·Φ₀·v/a.
- **Ampère**: long straight wires, B = μ₀I/2πr; lasso returns μ₀I_enc. Solenoids: B = μ₀nI.
- **Eddy braking**: m dv/dt = mg − kv, with k = 2.0·σ_rel·(t/2 mm)·B² kg/s.
- **Mass spec**: r = √(2mV/|q|)/B, semicircular orbit back to the entry wall.
- **Field survey**: in-plane point dipoles, B = (μ₀/4π)[3(m·r̂)r̂ − m]/r³, summed over all sources.
