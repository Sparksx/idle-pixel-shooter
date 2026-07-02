const KEY = 'idle-pixel-shooter-v1';

export function defaultState() {
  return {
    gold: 30,
    wave: 1,
    kills: 0,
    turrets: [{ type: 'gun', slot: 2 }],
    upgrades: {
      gun: { dmg: 0, rate: 0 },
      mortar: { dmg: 0, rate: 0 },
      laser: { dmg: 0, rate: 0 },
    },
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
    s.upgrades = { ...base.upgrades, ...s.upgrades };
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
