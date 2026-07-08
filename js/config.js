// Logical canvas size. Everything is simulated and drawn on this small grid,
// then scaled up by CSS with image-rendering: pixelated for the chunky look.
export const W = 160;
export const H = 200;

// Turrets sit on a line near the bottom, enemies spawn from a portal in the
// middle of the arena and march toward the turret line. There is no slot
// limit: ground turrets are packed dynamically along the line (a second row
// opens up when it gets crowded) and drones fly free.
export const TURRET_Y = 184;
export const SPAWN = { x: W / 2, y: 72 };

export const TURRET_TYPES = {
  gun: {
    name: 'GUN',
    desc: 'fast single-target bullets',
    baseCost: 50,
    costGrowth: 1.7,
    dmg: 2,
    rate: 2, // shots per second
    bulletSpeed: 140,
  },
  mortar: {
    name: 'MORTAR',
    desc: 'slow arcing shells, splash damage',
    baseCost: 150,
    costGrowth: 1.7,
    dmg: 12,
    rate: 0.4,
    splash: 13,
    shellTime: 0.9, // seconds of flight
  },
  drone: {
    name: 'DRONE',
    desc: 'flies over the arena, hunts on its own',
    baseCost: 250,
    costGrowth: 1.8,
    dmg: 1.5,
    rate: 3,
    bulletSpeed: 120,
    moveSpeed: 42,
    flying: true,
  },
  laser: {
    name: 'LASER',
    desc: 'continuous beam, damage per second',
    baseCost: 300,
    costGrowth: 1.7,
    dmg: 7, // damage per second (dps = dmg * rate, rate starts at 1)
    rate: 1,
  },
  freezer: {
    name: 'FREEZER',
    desc: 'lobs zone shots that slow enemies',
    baseCost: 400,
    costGrowth: 1.7,
    dmg: 4,
    rate: 0.33,
    zoneRadius: 14,
    zoneDuration: 3,
    slowFactor: 0.35, // speed multiplier for enemies inside a freeze zone
    shellTime: 0.9,
  },
  sniper: {
    name: 'SNIPER',
    desc: 'slow, huge hits on the toughest enemy',
    baseCost: 600,
    costGrowth: 1.7,
    dmg: 45,
    rate: 0.15,
  },
};

// Upgrades are bought per turret type and apply to every turret of that type.
export const UPGRADE_TYPES = {
  dmg: { name: 'DMG', baseCost: 25, costGrowth: 1.6, mult: 1.25 },
  rate: { name: 'RATE', baseCost: 25, costGrowth: 1.6, mult: 1.12 },
};

// Global upgrades for the spawn portal, bought in the SPAWN tab. Levels are
// gated by wave progression: level N needs wave N * wavePerLevel, so the
// portal (and the difficulty it brings) evolves alongside the wave push
// instead of being bought up front with farmed gold.
export const SPAWN_UPGRADES = {
  rate: {
    name: 'SPAWN RATE',
    desc: '-8% spawn delay',
    baseCost: 100,
    costGrowth: 1.75,
    wavePerLevel: 5,
  },
  gold: {
    name: 'GOLD BONUS',
    desc: '+15% gold per kill',
    baseCost: 150,
    costGrowth: 1.8,
    wavePerLevel: 5,
  },
  swarm: {
    name: 'SWARM SIZE',
    desc: '+1 enemy per wave',
    baseCost: 200,
    costGrowth: 1.8,
    wavePerLevel: 10,
  },
  offline: {
    name: 'OFFLINE GAIN',
    desc: '+5% offline earnings',
    baseCost: 250,
    costGrowth: 1.9,
    maxLevel: 10, // 50% base + 10 * 5% = 100%
    wavePerLevel: 10,
  },
  offlineTime: {
    name: 'OFFLINE TIME',
    desc: '+1h offline cap',
    baseCost: 300,
    costGrowth: 1.9,
    maxLevel: 20, // 4h base + 20h = a full day
    wavePerLevel: 10,
  },
};

// Offline earnings: while the tab is closed the player earns goldPerSec at
// reduced efficiency, for a capped number of hours. Both knobs are pushed by
// the OFFLINE GAIN and OFFLINE TIME spawn upgrades.
export const OFFLINE = {
  baseHours: 4,
  hoursPerLevel: 1,
  baseEff: 0.5,
  effPerLevel: 0.05,
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
