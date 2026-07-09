import { TURRET_TYPES, WALL } from './config.js';

const KEY = 'idle-pixel-shooter-v1';

export function defaultState() {
  return {
    gold: 30,
    wave: 1,
    kills: 0,
    turrets: [{ type: 'gun' }],
    upgrades: Object.fromEntries(
      Object.keys(TURRET_TYPES).map((t) => [t, { dmg: 0, rate: 0 }]),
    ),
    evolved: Object.fromEntries(Object.keys(TURRET_TYPES).map((t) => [t, false])),
    spawnUpgrades: { rate: 0, gold: 0, swarm: 0, wallHp: 0, repair: 0, offline: 0, offlineTime: 0 },
    wallHp: WALL.maxHp,
    cores: 0,
    rebirths: 0,
    coreUpgrades: { dmg: 0, gold: 0, start: 0, skip: 0 },
    // Lifetime stats behind milestones; they survive rebirth.
    bestWave: 1,
    goldEarned: 0,
    seenEnemies: {},
    // Daily challenge: the active challenge (or null), the stashed main run
    // while one is running, and the date of the last completed daily.
    challenge: null,
    stashedRun: null,
    dailyDone: '',
    goldPerSec: 0,
    lastSeen: Date.now(),
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const base = defaultState();
    const s = { ...base, ...JSON.parse(raw) };
    // Older saves miss newer turret types, spawn/core upgrade kinds, and
    // carried a now-obsolete slot per turret.
    s.upgrades = { ...base.upgrades, ...s.upgrades };
    s.evolved = { ...base.evolved, ...s.evolved };
    s.spawnUpgrades = { ...base.spawnUpgrades, ...s.spawnUpgrades };
    s.coreUpgrades = { ...base.coreUpgrades, ...s.coreUpgrades };
    s.turrets = s.turrets.map((t) => ({ type: t.type }));
    // Older saves never tracked a best wave; seed it from the current run.
    s.bestWave = Math.max(s.bestWave ?? 1, s.wave);
    return s;
  } catch {
    return defaultState();
  }
}

export function save(state) {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the game keeps running, just unsaved.
  }
}

export function wipe() {
  localStorage.removeItem(KEY);
}
