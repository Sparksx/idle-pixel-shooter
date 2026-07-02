const KEY = 'idle-pixel-shooter-v1';

export function defaultState() {
  return {
    gold: 30,
    wave: 1,
    kills: 0,
    turrets: [{ type: 'gun' }],
    upgrades: {
      gun: { dmg: 0, rate: 0 },
      mortar: { dmg: 0, rate: 0 },
      laser: { dmg: 0, rate: 0 },
      drone: { dmg: 0, rate: 0 },
      freezer: { dmg: 0, rate: 0 },
      sniper: { dmg: 0, rate: 0 },
    },
    spawnUpgrades: { rate: 0, gold: 0, swarm: 0, offline: 0 },
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
    // Older saves miss newer turret types and the spawn upgrades entirely,
    // and carried a now-obsolete slot per turret.
    s.upgrades = { ...base.upgrades, ...s.upgrades };
    s.spawnUpgrades = { ...base.spawnUpgrades, ...s.spawnUpgrades };
    s.turrets = s.turrets.map((t) => ({ type: t.type }));
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
