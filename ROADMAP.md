# Roadmap — making the game last longer

The POC can be "finished" in a single sitting: gold snowballs, every upgrade
gets bought, and nothing new happens after wave ~50. This document plans the
features that turn it into a game you come back to for weeks. Phases are
ordered by impact-per-effort and each one is shippable on its own.

## Already done (this branch)

- **Offline cap**: offline earnings capped at 4h, extendable to 24h with the
  OFFLINE TIME upgrade — coming back regularly matters now.
- **Wave-gated portal upgrades**: SPAWN tab levels unlock with wave progress
  (one level per N waves), so income multipliers and difficulty scale with
  progression instead of being front-loaded with farmed gold.
- **Phase 1 — prestige / rebirth loop** (see below): shipped.
- **Phase 2 — enemy variety** (see below): shipped.
- **Phase 3 — weapon evolutions & milestones** (see below): shipped.
- **The wall (lose mechanism)**: enemies that reach the turret line latch
  onto a wall with HP and bite it every second instead of looping back to
  the portal. The wall self-repairs between bites and fully between waves;
  a breach clears the field and pushes the run back 5 waves (never a game
  over, so unattended runs oscillate around the wave they can hold). New
  wave-gated WALL HP / WALL REPAIR portal upgrades grow the buffer.

## Phase 1 — Prestige / rebirth loop ✅ done

The core of every long-lived idle game: reset to multiply. As shipped:

- **REBIRTH** action in the new **CORE** tab, unlocked at wave 50. It resets
  gold, wave, turrets, turret upgrades and the rate/gold/swarm portal levels;
  OFFLINE portal levels persist (kinder), and so do cores, core upgrades and
  lifetime kills.
- Grants **cores** on reset: `floor((wave / 10)^1.5)` — wave 50 pays 11,
  wave 100 pays 31; pushing 10 waves further is always visibly worth more.
- Cores buy permanent upgrades in the CORE tab: **CORE DMG** and **CORE
  GOLD** (+25%/level global multipliers), **HEAD START** (+150 starting gold
  per level) and **WAVE SKIP** (start 2 waves further per level, max 20).
- Each run gets shorter as core multipliers grow, which is the addictive part;
  the wave wall (HP × 1.16^wave) guarantees every run eventually stalls and
  makes rebirth the right move.

## Phase 2 — Enemy variety ✅ done

Every non-boss spawn now rolls a type from the pool unlocked by wave, so
each bracket of waves changes the optimal turret mix. As shipped
(`ENEMY_TYPES` in config):

- **RUNNER** (wave 15+) — 2× speed, 0.5× HP, 1.2× gold; favours
  GUN/DRONE/FREEZER.
- **TANK** (wave 25+) — 0.5× speed, 4× HP, 2.5× gold; favours SNIPER/MORTAR.
- **SPLITTER** (wave 35+) — breaks into 2–3 faster minis on death, each
  carrying a share of hp and gold; favours splash damage.
- **GHOST** (wave 50+) — blinks out of phase for 1s of every 3.2s cycle
  (untargetable and immune while phased); punishes slow-rate turrets,
  favours LASER's continuous beam.
- From wave 60, every **boss** rolls a modifier from the same pool: runner,
  tank, splitting or blinking boss.
- A toast introduces each type the first time it spawns; each type has its
  own pixel shape so the mix is readable at a glance.

## Phase 3 — Weapon evolutions & milestones ✅ done

- **Evolutions**: once a weapon's DMG+RATE levels reach 25 combined, its tab
  offers a one-time gold purchase (300× the weapon's base cost) with a
  visual change and a twist. Evolutions reset on rebirth — they are the
  mid-run goal. As shipped: GUN → **TWIN GUN** (second bullet at another
  enemy), MORTAR → **CLUSTER** (3 scattered mini-blasts), DRONE → **WASP**
  (stings two enemies at once), LASER → **PRISM** (beam splits to a second
  target at half power), FREEZER → **PERMAFROST** (zones also deal damage
  per second), SNIPER → **RAILGUN** (shots pierce everything in their path).
- **Milestones**: 13 passive bonuses at lifetime kills / best wave / gold
  earned thresholds, listed in the new **FEATS** tab with progress shown.
  All three stats survive rebirth, so the bonuses (+5%…+25% damage or gold,
  additive per column) give the numbers a memory across the whole save.

## Phase 4 — Wave texture & challenges (variety per session)

- **Elite waves** every 25 waves: fixed modifier (double speed, regenerating,
  gold rush) announced on screen before it starts.
- **Challenge runs**: seeded side-modes launched from the panel ("no mortar",
  "half gold", "runners only") that award cores or a cosmetic border. Seeded
  by date → a daily challenge with no backend.

## Balance targets

Rough pacing to tune toward once prestige lands (time to reach wave N from a
fresh run, active play):

| Milestone | Fresh save | After 3–4 rebirths |
|---|---|---|
| Wave 25 | ~30 min | ~5 min |
| Wave 50 (first rebirth) | ~2 h | ~20 min |
| Wave 100 | — | ~2 h |
| Wave 200 (offline cap maxed) | — | days |

Levers if the curve is off: enemy HP growth (1.16), gold growth (1.10),
turret cost growth (1.7–1.8), core formula exponent.
