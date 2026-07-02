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
  - **OFFLINE GAIN** — better offline earnings (max level 10)
- Endless waves with scaling HP and gold; a multi-pixel **boss** every 10 waves
- Enemies that slip past the turret line loop back through the portal — a
  wave only ends once everything is killed
- Save is stored in browser `localStorage`, with offline earnings
  (50–100% of your recent gold/sec, capped at 8 hours) when you come back
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

- More turret types and per-turret (instead of per-type) upgrades
- Prestige / rebirth loop
- Enemy variety (fast, tanky, splitting pixels)
- Sound, particles, screen shake
- Cloud saves (would need a backend)
