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

// Prestige: from minWave on, the player can REBIRTH — the run (gold, wave,
// turrets, turret upgrades, rate/gold/swarm portal levels) resets in exchange
// for cores. OFFLINE portal levels and everything bought with cores persist.
// The core payout grows superlinearly so pushing 10 more waves before
// resetting is always visibly worth it.
export const REBIRTH = {
  minWave: 50,
  cores: (wave) => Math.floor(Math.pow(wave / 10, 1.5)),
};

// Permanent upgrades bought with cores in the CORE tab. They survive rebirth;
// start and skip only shape the *next* run.
export const CORE_UPGRADES = {
  dmg: {
    name: 'CORE DMG',
    desc: '+25% damage, all turrets',
    baseCost: 1,
    costGrowth: 1.6,
    mult: 1.25,
  },
  gold: {
    name: 'CORE GOLD',
    desc: '+25% gold per kill',
    baseCost: 1,
    costGrowth: 1.6,
    mult: 1.25,
  },
  start: {
    name: 'HEAD START',
    desc: '+150 gold after rebirth',
    baseCost: 2,
    costGrowth: 1.7,
    amount: 150,
  },
  skip: {
    name: 'WAVE SKIP',
    desc: 'rebirth 2 waves further',
    baseCost: 3,
    costGrowth: 1.8,
    amount: 2,
    maxLevel: 20,
  },
};

// Enemy variety: special types unlock with wave progress so each bracket of
// waves changes the optimal turret mix. Every non-boss spawn rolls a kind
// from the unlocked pool (weights below; the plain pixel stays the most
// common). Stat fields multiply the wave's base hp/speed/gold; `splits` and
// `blink` are behaviour hooks handled in Game.
export const ENEMY_TYPES = {
  normal: { name: 'PIXEL', weight: 10 },
  runner: {
    name: 'RUNNER',
    minWave: 15,
    weight: 3,
    hp: 0.5,
    speed: 2,
    gold: 1.2,
    intro: '2X SPEED, HALF HP',
  },
  tank: {
    name: 'TANK',
    minWave: 25,
    weight: 3,
    hp: 4,
    speed: 0.5,
    gold: 2.5,
    intro: '4X HP, PAYS 2.5X',
  },
  splitter: {
    name: 'SPLITTER',
    minWave: 35,
    weight: 3,
    hp: 1.2,
    speed: 0.9,
    gold: 0.7,
    // On death: 2-3 minis (5 for a splitter boss), each with a fraction of
    // the parent's max hp and gold, running faster. Minis never re-split.
    splits: { count: [2, 3], bossCount: 5, hp: 0.25, bossHp: 0.08, gold: 0.45, speed: 1.4 },
    intro: 'SPLITS ON DEATH',
  },
  ghost: {
    name: 'GHOST',
    minWave: 50,
    weight: 3,
    hp: 0.8,
    speed: 1.1,
    gold: 1.8,
    // Cycles: `visible` seconds targetable, then `hidden` seconds phased out
    // (untargetable and immune). Punishes slow-rate turrets.
    blink: { visible: 2.2, hidden: 1.0 },
    intro: 'BLINKS OUT OF PHASE',
  },
};

// From this wave on every boss rolls a modifier from the unlocked special
// types: a runner boss, a splitting boss, a blinking boss...
export const BOSS_MODS_FROM = 60;

export function unlockedEnemyKinds(wave) {
  return Object.keys(ENEMY_TYPES).filter(
    (k) => k !== 'normal' && wave >= ENEMY_TYPES[k].minWave,
  );
}

export function rollEnemyKind(wave) {
  const specials = unlockedEnemyKinds(wave);
  let total = ENEMY_TYPES.normal.weight;
  for (const k of specials) total += ENEMY_TYPES[k].weight;
  let r = Math.random() * total;
  for (const k of specials) {
    r -= ENEMY_TYPES[k].weight;
    if (r < 0) return k;
  }
  return 'normal';
}

export function rollBossMod(wave) {
  if (wave < BOSS_MODS_FROM) return 'normal';
  const specials = unlockedEnemyKinds(wave);
  return specials[Math.floor(Math.random() * specials.length)] ?? 'normal';
}

// Weapon evolutions: once a weapon's DMG+RATE levels add up to EVOLVE_LEVELS
// its tab offers a one-time gold purchase — a visual change plus a mechanical
// twist. Evolutions reset on rebirth: they are the long-term goal each tab
// climbs toward within a run. Cost is baseCost * costMult.
export const EVOLVE_LEVELS = 25;

export const EVOLUTIONS = {
  gun: {
    name: 'TWIN GUN',
    desc: 'fires a second bullet at another enemy',
    costMult: 300,
  },
  mortar: {
    name: 'CLUSTER MORTAR',
    desc: 'shells burst into 3 mini-blasts',
    costMult: 300,
  },
  drone: {
    name: 'WASP',
    desc: 'stings the two nearest enemies at once',
    costMult: 300,
  },
  laser: {
    name: 'PRISM LASER',
    desc: 'beam splits to a second target at half power',
    costMult: 300,
  },
  freezer: {
    name: 'PERMAFROST',
    desc: 'freeze zones also damage enemies inside',
    costMult: 300,
  },
  sniper: {
    name: 'RAILGUN',
    desc: 'shots pierce everything in their path',
    costMult: 300,
  },
};

// Milestones: passive bonuses at lifetime-stat thresholds. All three stats
// survive rebirth, so these give the numbers a memory across the whole save.
// Bonuses are additive within each column (dmg / gold) and multiply into the
// same global pipeline as core upgrades.
export const MILESTONE_STATS = {
  kills: 'KILLS',
  bestWave: 'BEST WAVE',
  goldEarned: 'GOLD EARNED',
};

export const MILESTONES = [
  { stat: 'kills', at: 1e3, dmg: 0.05 },
  { stat: 'kills', at: 1e4, dmg: 0.1 },
  { stat: 'kills', at: 1e5, dmg: 0.15 },
  { stat: 'kills', at: 1e6, dmg: 0.2 },
  { stat: 'bestWave', at: 25, gold: 0.05 },
  { stat: 'bestWave', at: 50, gold: 0.1 },
  { stat: 'bestWave', at: 75, dmg: 0.1 },
  { stat: 'bestWave', at: 100, gold: 0.15 },
  { stat: 'bestWave', at: 150, dmg: 0.15 },
  { stat: 'bestWave', at: 200, gold: 0.25 },
  { stat: 'goldEarned', at: 5e4, gold: 0.05 },
  { stat: 'goldEarned', at: 1e6, gold: 0.1 },
  { stat: 'goldEarned', at: 1e8, gold: 0.2 },
];

export function milestoneText(m) {
  const pct = Math.round((m.dmg ?? m.gold) * 100);
  return {
    req: `${fmt(m.at)} ${MILESTONE_STATS[m.stat]}`,
    bonus: `+${pct}% ${m.dmg ? 'DMG' : 'GOLD'}`,
  };
}

export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

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
