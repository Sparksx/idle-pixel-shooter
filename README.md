# Idle Pixel Shooter

A tiny black & white idle / tower-defense shooter. Enemies (pixels) spawn from
a portal in the middle of the arena and march toward your turret line. Turrets
fire automatically; every kill earns gold you can spend on upgrades and new
turrets.

**Play it:** https://sparksx.github.io/idle-pixel-shooter/

## Features

- Six weapon types:
  - **GUN** — fast single-target bullets
  - **MORTAR** — slow arcing shells with splash damage
  - **DRONE** — flies over the arena hunting enemies on its own
  - **LASER** — continuous beam, damage per second
  - **FREEZER** — lobs zone shots that slow every enemy inside
  - **SNIPER** — very slow, huge hits on the toughest enemy anywhere
- No slot limit: buy as many weapons as you can afford — each copy of a
  weapon costs more than the last. Ground weapons pack themselves along
  the turret line (splitting into a second row when crowded), drones fly
- Tabbed panel: one tab per weapon (buy + per-type **DMG**/**RATE**
  upgrades) plus a **SPAWN** tab with global portal upgrades:
  - **SPAWN RATE** — enemies arrive faster
  - **GOLD BONUS** — more gold per kill
  - **SWARM SIZE** — more enemies per wave
  - **WALL HP** — a tougher wall
  - **WALL REPAIR** — the wall repairs itself faster
  - **OFFLINE GAIN** — better offline earnings (max level 10)
  - **OFFLINE TIME** — +1h offline earnings cap (max level 20)
- Portal upgrade levels are gated by wave progression (e.g. one SWARM
  level per 10 waves reached), so the portal — and the difficulty it
  brings — evolves with your push instead of being bought up front
- **Rebirth** (wave 50+, in the **CORE** tab): reset the run for
  **cores** — the deeper the wave, the more cores. Spend them on
  permanent upgrades that survive rebirth:
  - **CORE DMG** / **CORE GOLD** — global damage / gold multipliers
  - **HEAD START** — extra starting gold after rebirth
  - **WAVE SKIP** — start later runs several waves in (max level 20)
  - OFFLINE portal levels also survive rebirth
- **Enemy variety** that unlocks with wave progress, so the best turret mix
  keeps changing: **RUNNER** (wave 15+, fast and fragile), **TANK** (wave
  25+, slow, 4× HP, pays more), **SPLITTER** (wave 35+, breaks into fast
  minis on death) and **GHOST** (wave 50+, blinks out of phase —
  untargetable — for part of every cycle)
- **Weapon evolutions**: at 25 combined DMG+RATE levels each weapon offers a
  one-time evolution with a new look and a twist — TWIN GUN, CLUSTER
  MORTAR, WASP, PRISM LASER, PERMAFROST, RAILGUN (evolutions reset on
  rebirth: they're the mid-run goal)
- **Milestones** (the **FEATS** tab): passive +damage / +gold bonuses at
  lifetime kills, best-wave and gold-earned thresholds — they survive
  rebirth
- Endless waves with scaling HP and gold; a multi-pixel **boss** every 10
  waves — and from wave 60 bosses roll a modifier from the enemy pool
  (splitting boss, blinking boss…)
- **Elite waves** every 25 waves, announced on screen before they start:
  **FRENZY** (faster, pays 1.5×), **GOLD RUSH** (tougher, pays 3×) and
  **REGEN** (enemies heal) rotate on a fixed schedule
- **Daily challenge** (CORE tab, after your first rebirth): the date seeds
  one rule for everyone — a banned weapon, HALF GOLD, RUNNERS/TANKS ONLY
  or a BRITTLE WALL. Your main run is stashed while you play a fresh run
  under the rule; clear wave 30 for a core payout that scales with your
  best wave. One clear per day, no backend needed
- Enemies that reach the turret line latch onto the **wall** and bite it
  every second — kill them before it breaks. The wall repairs itself once
  the biting stops (and fully between waves); if it drops to 0 the field
  clears and the run is pushed back 5 waves — a setback, never a game over
- Save is stored in browser `localStorage`, with offline earnings
  (50–100% of your recent gold/sec, capped at 4 hours + 1 hour per
  OFFLINE TIME level) when you come back
- Works on desktop and mobile — pure HTML/CSS/JS, no build step, no backend

## Run locally

It's a static site, but it uses ES modules so it needs to be served over HTTP:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Hosting on GitHub Pages

A workflow (`.github/workflows/deploy.yml`) deploys the repository root to
GitHub Pages on every push to `main`. To enable it once: repository
**Settings → Pages → Source → GitHub Actions**.

## Project layout

```
index.html      page shell
style.css       black & white UI styling
js/config.js    balance numbers: turrets, upgrades, wave scaling
js/save.js      localStorage load/save
js/game.js      simulation: waves, enemies, turrets, projectiles
js/render.js    canvas rendering (160x200 logical pixels, scaled up)
js/ui.js        shop and upgrade buttons
js/main.js      bootstrap, game loop, offline gains
```

## Ideas for later

See [ROADMAP.md](ROADMAP.md) for the plan to extend the game's lifespan
(prestige loop, enemy variety, weapon evolutions, milestones…).

- Sound, particles, screen shake
- Cloud saves (would need a backend)
