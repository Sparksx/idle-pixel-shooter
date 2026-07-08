---
name: verify
description: Run and observe this game to verify a change end-to-end (serve + Playwright).
---

# Verifying changes to Idle Pixel Shooter

Static ES-module site, no build step. Serve it, drive it with Playwright,
observe the canvas and state through the `window.__game` debug hook.

## Launch

```sh
python3 -m http.server 8123 &   # ES modules need HTTP, file:// won't work
```

Playwright is installed globally; run drivers with:

```sh
NODE_PATH=/opt/node22/lib/node_modules node driver.js
# launch with: chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

## Driving the game

- `window.__game` (set in main.js) exposes the live `Game` instance: read
  `__game.state`, `__game.enemies`, call methods. The sim runs on
  requestAnimationFrame, so real seconds pass in real time.
- To make enemies survive long enough to reach the wall / test late-game
  behavior: `__game.state.wave = 30; __game.waveSpawned = 0` — wave-30 HP
  outclasses the starting gun. Waves divisible by 10 are boss waves.
- Toasts land in `#toast` (check `.hidden`). Tabs/buttons are generated in
  `#tabs` / `#tab-content`; button labels are `LABEL LV<n>`, so match with
  `hasText: /WALL HP LV/`-style regexes (descriptions can collide).

## Gotchas

- The game autosaves every 5s **and on visibilitychange (including
  reload!)**. To test save/load with a crafted localStorage payload, seed
  it via `context.addInitScript` *before* first navigation — writing it
  from the running page gets clobbered on reload.
- `/favicon.ico` 404s in the console; pre-existing, ignore.
