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

## Phase 2 — Enemy variety (makes weapon choice matter)

Right now every enemy is the same pixel with bigger numbers, so the optimal
turret mix never changes. Introduce types, unlocked progressively so each
bracket of waves feels new:

- **RUNNER** (wave 15+) — 2× speed, 0.5× HP; favours GUN/DRONE/FREEZER.
- **TANK** (wave 25+) — 0.5× speed, 4× HP, more gold; favours SNIPER/MORTAR.
- **SPLITTER** (wave 35+) — splits into 2–3 small pixels on death; favours
  splash damage.
- **GHOST** (wave 50+) — periodically blinks (untargetable); punishes
  slow-rate turrets, favours LASER's continuous beam.
- Bosses gain modifiers from the same pool at higher waves (splitting boss,
  blinking boss…).

Each type is just a spawn-table entry in `waveConf` plus a small behaviour
hook in `updateEnemies` — no new systems needed.

## Phase 3 — Weapon evolutions & milestones (mid-run goals)

- **Evolutions**: at DMG+RATE level thresholds (e.g. 25 combined), a weapon
  tab offers a one-time evolution with a visual change and a twist: GUN →
  TWIN GUN (two bullets), MORTAR → CLUSTER (3 mini-blasts), LASER → PRISM
  (splits to 2 targets), etc. Gives each tab a long-term goal beyond +25%.
- **Milestones**: passive bonuses at kill/wave/gold thresholds shown in a
  small list (e.g. "10k kills: +5% damage forever"). Cheap to build, gives
  the numbers a memory across the whole save.

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
