// Logical canvas size. Everything is simulated and drawn on this small grid,
// then scaled up by CSS with image-rendering: pixelated for the chunky look.
export const W = 160;
export const H = 200;

// Turrets sit on a line near the bottom, enemies spawn from a portal in the
// middle of the arena and march toward the turret line.
export const TURRET_Y = 184;
export const SLOTS = [20, 44, 68, 92, 116, 140];
export const SPAWN = { x: W / 2, y: 72 };

export const TURRET_TYPES = {
  gun: {
    name: 'GUN',
    baseCost: 50,
    costGrowth: 1.7,
    dmg: 2,
    rate: 2, // shots per second
    range: 80,
    bulletSpeed: 140,
  },
  mortar: {
    name: 'MORTAR',
    baseCost: 150,
    costGrowth: 1.7,
    dmg: 12,
    rate: 0.4,
    range: 120,
    splash: 13,
    shellTime: 0.9, // seconds of flight
  },
  laser: {
    name: 'LASER',
    baseCost: 300,
    costGrowth: 1.7,
    dmg: 7, // damage per second (dps = dmg * rate, rate starts at 1)
    rate: 1,
    range: 70,
  },
};

// Upgrades are bought per turret type and apply to every turret of that type.
export const UPGRADE_TYPES = {
  dmg: { name: 'DMG', baseCost: 25, costGrowth: 1.6, mult: 1.25 },
  rate: { name: 'RATE', baseCost: 25, costGrowth: 1.6, mult: 1.12 },
};

export const BOSS_EVERY = 10;

export function waveConf(wave) {
  const boss = wave % BOSS_EVERY === 0;
  const hp = 4 * Math.pow(1.16, wave - 1);
  const gold = 2 * Math.pow(1.1, wave - 1);
  if (boss) {
    return { boss, count: 1, interval: 0, hp: hp * 25, gold: gold * 30, speed: 6 };
  }
  return {
    boss,
    count: Math.min(6 + Math.floor(wave / 2), 20),
    interval: Math.max(1.2 - wave * 0.01, 0.5),
    hp,
    gold,
    speed: 10 + Math.min(wave * 0.15, 8),
  };
}
