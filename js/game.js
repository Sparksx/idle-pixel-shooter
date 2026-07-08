import {
  W,
  TURRET_Y,
  SPAWN,
  TURRET_TYPES,
  UPGRADE_TYPES,
  SPAWN_UPGRADES,
  REBIRTH,
  CORE_UPGRADES,
  ENEMY_TYPES,
  WALL,
  EVOLUTIONS,
  EVOLVE_LEVELS,
  MILESTONES,
  CHALLENGE,
  milestoneText,
  dailyRule,
  eliteConf,
  rollEnemyKind,
  rollBossMod,
  waveConf,
} from './config.js';

const milestoneKey = (m) => `${m.stat}:${m.at}`;

export class Game {
  constructor(state) {
    this.state = state;
    this.enemies = [];
    this.bullets = [];
    this.shells = [];
    this.blasts = [];
    this.beams = [];
    this.zones = []; // freeze zones
    this.tracers = []; // sniper shot visuals
    this.cd = new Map(); // per-turret cooldowns (runtime only, not saved)
    this.dronePos = new Map(); // per-drone position (runtime only)
    this.turretPos = new Map(); // ground turret positions (runtime only)
    this.waveSpawned = 0;
    this.spawnTimer = 0.5;
    // Rolling gold/sec estimate, used for offline earnings.
    this.goldEarnedWindow = 0;
    this.windowTime = 0;
    // Splitter children are buffered here and flushed at the end of update()
    // so a splash blast can't chain-kill minis the same frame they appear.
    this.pendingSpawns = [];
    this.wallFlash = 0; // runtime bite-flash visual
    this.wallHitT = WALL.regenDelay; // seconds since the wall was last bitten
    this.banner = null; // short on-canvas announcement: {text, t}
    this.announcedElite = 0; // wave number of the last announced elite wave
    // Old saves may carry more wall HP than the current max allows.
    this.state.wallHp = Math.min(this.state.wallHp, this.wallMaxHp());
    // Optional toast callback wired up by main.js.
    this.toast = null;
    // Milestones already reached at load don't get re-announced.
    this.announced = new Set(
      MILESTONES.filter((m) => this.milestoneDone(m)).map(milestoneKey),
    );
  }

  // --- derived numbers -----------------------------------------------------

  stats(type) {
    const def = TURRET_TYPES[type];
    const up = this.state.upgrades[type];
    return {
      dmg:
        def.dmg *
        Math.pow(UPGRADE_TYPES.dmg.mult, up.dmg) *
        this.coreDmgMult() *
        this.milestoneDmgMult(),
      rate: def.rate * Math.pow(UPGRADE_TYPES.rate.mult, up.rate),
    };
  }

  milestoneDone(m) {
    return this.state[m.stat] >= m.at;
  }

  milestoneDmgMult() {
    let b = 1;
    for (const m of MILESTONES) if (m.dmg && this.milestoneDone(m)) b += m.dmg;
    return b;
  }

  milestoneGoldMult() {
    let b = 1;
    for (const m of MILESTONES) if (m.gold && this.milestoneDone(m)) b += m.gold;
    return b;
  }

  evolveLevels(type) {
    const up = this.state.upgrades[type];
    return up.dmg + up.rate;
  }

  evolveCost(type) {
    return Math.round(TURRET_TYPES[type].baseCost * EVOLUTIONS[type].costMult);
  }

  evolved(type) {
    return !!this.state.evolved[type];
  }

  coreDmgMult() {
    return Math.pow(CORE_UPGRADES.dmg.mult, this.state.coreUpgrades.dmg);
  }

  coreGoldMult() {
    return Math.pow(CORE_UPGRADES.gold.mult, this.state.coreUpgrades.gold);
  }

  turretCost(type) {
    const def = TURRET_TYPES[type];
    return Math.round(def.baseCost * Math.pow(def.costGrowth, this.ownedCount(type)));
  }

  upgradeCost(type, kind) {
    const def = UPGRADE_TYPES[kind];
    const lvl = this.state.upgrades[type][kind];
    return Math.round(def.baseCost * Math.pow(def.costGrowth, lvl));
  }

  spawnUpgradeCost(kind) {
    const def = SPAWN_UPGRADES[kind];
    const lvl = this.state.spawnUpgrades[kind];
    return Math.round(def.baseCost * Math.pow(def.costGrowth, lvl));
  }

  // Highest level currently purchasable: capped by the def's maxLevel and by
  // wave progression (one level per wavePerLevel waves reached).
  spawnUpgradeMaxLevel(kind) {
    const def = SPAWN_UPGRADES[kind];
    const byWave = Math.floor(this.state.wave / def.wavePerLevel);
    return def.maxLevel != null ? Math.min(def.maxLevel, byWave) : byWave;
  }

  ownedCount(type) {
    return this.state.turrets.filter((t) => t.type === type).length;
  }

  spawnIntervalMult() {
    return Math.pow(0.92, this.state.spawnUpgrades.rate);
  }

  goldMult() {
    return (
      Math.pow(1.15, this.state.spawnUpgrades.gold) *
      this.coreGoldMult() *
      this.milestoneGoldMult() *
      (this.challengeRule()?.goldMult ?? 1)
    );
  }

  // --- daily challenge -------------------------------------------------------

  todayKey() {
    return new Date().toISOString().slice(0, 10); // UTC daily rollover
  }

  todayRule() {
    return dailyRule(this.todayKey());
  }

  challengeRule() {
    const c = this.state.challenge;
    return c ? (CHALLENGE.rules.find((r) => r.id === c.rule) ?? null) : null;
  }

  bannedType(type) {
    return this.challengeRule()?.ban === type;
  }

  challengeUnlocked() {
    return this.state.rebirths >= CHALLENGE.unlockRebirths;
  }

  dailyDoneToday() {
    return this.state.dailyDone === this.todayKey();
  }

  challengeReward() {
    return CHALLENGE.baseReward + Math.floor(REBIRTH.cores(this.state.bestWave) / 2);
  }

  canStartChallenge() {
    return this.challengeUnlocked() && !this.state.challenge && !this.dailyDoneToday();
  }

  coreUpgradeCost(kind) {
    const def = CORE_UPGRADES[kind];
    return Math.round(def.baseCost * Math.pow(def.costGrowth, this.state.coreUpgrades[kind]));
  }

  waveCount(conf) {
    if (conf.boss) return 1;
    return Math.min(conf.count + this.state.spawnUpgrades.swarm, 30);
  }

  wallMaxHp() {
    const base = WALL.maxHp + SPAWN_UPGRADES.wallHp.amount * this.state.spawnUpgrades.wallHp;
    return Math.round(base * (this.challengeRule()?.wallMult ?? 1));
  }

  wallRepairRate() {
    return WALL.regenRate + SPAWN_UPGRADES.repair.amount * this.state.spawnUpgrades.repair;
  }

  wallDmg(e) {
    if (e.boss) return WALL.dmg * WALL.bossDmgMult;
    if (e.mini) return WALL.dmg * WALL.miniDmgMult;
    return WALL.dmg * (ENEMY_TYPES[e.kind]?.wall ?? 1);
  }

  // --- player actions ------------------------------------------------------

  buyTurret(type) {
    if (this.bannedType(type)) return false;
    const cost = this.turretCost(type);
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.turrets.push({ type });
    return true;
  }

  buyUpgrade(type, kind) {
    const cost = this.upgradeCost(type, kind);
    if (this.ownedCount(type) === 0 || this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.upgrades[type][kind]++;
    return true;
  }

  buySpawnUpgrade(kind) {
    const lvl = this.state.spawnUpgrades[kind];
    if (lvl >= this.spawnUpgradeMaxLevel(kind)) return false;
    const cost = this.spawnUpgradeCost(kind);
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.spawnUpgrades[kind]++;
    return true;
  }

  buyEvolution(type) {
    if (this.evolved(type) || this.ownedCount(type) === 0) return false;
    if (this.evolveLevels(type) < EVOLVE_LEVELS) return false;
    const cost = this.evolveCost(type);
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.evolved[type] = true;
    this.toast?.(`${TURRET_TYPES[type].name} EVOLVED: ${EVOLUTIONS[type].name}`);
    return true;
  }

  buyCoreUpgrade(kind) {
    const def = CORE_UPGRADES[kind];
    const lvl = this.state.coreUpgrades[kind];
    if (def.maxLevel != null && lvl >= def.maxLevel) return false;
    const cost = this.coreUpgradeCost(kind);
    if (this.state.cores < cost) return false;
    this.state.cores -= cost;
    this.state.coreUpgrades[kind]++;
    return true;
  }

  canRebirth() {
    return this.state.wave >= REBIRTH.minWave && !this.state.challenge;
  }

  rebirthCores() {
    return REBIRTH.cores(this.state.wave);
  }

  // Cash the run in for cores and start over. Cores, core upgrades, OFFLINE
  // portal levels and lifetime kills persist; everything else resets.
  rebirth() {
    if (!this.canRebirth()) return false;
    const s = this.state;
    s.cores += this.rebirthCores();
    s.rebirths++;
    s.gold = 30 + CORE_UPGRADES.start.amount * s.coreUpgrades.start;
    s.wave = 1 + CORE_UPGRADES.skip.amount * s.coreUpgrades.skip;
    s.turrets = [{ type: 'gun' }];
    s.upgrades = Object.fromEntries(
      Object.keys(TURRET_TYPES).map((t) => [t, { dmg: 0, rate: 0 }]),
    );
    s.evolved = Object.fromEntries(Object.keys(TURRET_TYPES).map((t) => [t, false]));
    s.spawnUpgrades.rate = 0;
    s.spawnUpgrades.gold = 0;
    s.spawnUpgrades.swarm = 0;
    s.spawnUpgrades.wallHp = 0;
    s.spawnUpgrades.repair = 0;
    s.wallHp = this.wallMaxHp();
    s.goldPerSec = 0; // the new run earns nothing yet — don't inflate offline gains
    this.resetFieldState();
    return true;
  }

  resetFieldState() {
    this.clearField();
    this.cd.clear();
    this.dronePos.clear();
    this.waveSpawned = 0;
    this.spawnTimer = 1;
    this.goldEarnedWindow = 0;
    this.windowTime = 0;
    this.wallHitT = WALL.regenDelay;
    this.announcedElite = 0;
  }

  // Everything a run owns; stashed while a daily challenge is active.
  runSnapshot() {
    const s = this.state;
    return {
      gold: s.gold,
      wave: s.wave,
      turrets: s.turrets,
      upgrades: s.upgrades,
      evolved: s.evolved,
      spawnUpgrades: { ...s.spawnUpgrades },
      wallHp: s.wallHp,
      goldPerSec: s.goldPerSec,
    };
  }

  // Stash the main run and start today's seeded side-run: a fresh wave-1 run
  // (permanent core/milestone bonuses still apply) under the day's rule.
  startChallenge() {
    if (!this.canStartChallenge()) return false;
    const s = this.state;
    const rule = this.todayRule();
    s.stashedRun = this.runSnapshot();
    s.challenge = {
      date: this.todayKey(),
      rule: rule.id,
      target: CHALLENGE.targetWave,
      reward: this.challengeReward(),
    };
    s.gold = 30;
    s.wave = 1;
    s.turrets = [{ type: 'gun' }];
    s.upgrades = Object.fromEntries(
      Object.keys(TURRET_TYPES).map((t) => [t, { dmg: 0, rate: 0 }]),
    );
    s.evolved = Object.fromEntries(Object.keys(TURRET_TYPES).map((t) => [t, false]));
    s.spawnUpgrades = { ...s.spawnUpgrades, rate: 0, gold: 0, swarm: 0, wallHp: 0, repair: 0 };
    s.goldPerSec = 0;
    s.wallHp = this.wallMaxHp(); // after the rule is set, so BRITTLE WALL bites
    this.resetFieldState();
    this.toast?.(`DAILY: ${rule.name} — CLEAR WAVE ${s.challenge.target} FOR ${s.challenge.reward} CORES`);
    this.banner = { text: `DAILY: ${rule.name}`, t: 3 };
    return true;
  }

  // Leave the challenge and put the main run back exactly as stashed.
  // On success the reward lands first and the day is marked done.
  endChallenge(success) {
    const s = this.state;
    if (!s.challenge) return false;
    if (success) {
      s.cores += s.challenge.reward;
      s.dailyDone = s.challenge.date;
      this.toast?.(`CHALLENGE COMPLETE — +${s.challenge.reward} CORES`);
      this.banner = { text: 'CHALLENGE COMPLETE', t: 3 };
    }
    const snap = s.stashedRun;
    s.challenge = null;
    s.stashedRun = null;
    if (snap) Object.assign(s, snap);
    s.wallHp = Math.min(s.wallHp, this.wallMaxHp());
    this.resetFieldState();
    return true;
  }

  abandonChallenge() {
    return this.endChallenge(false);
  }

  // --- simulation ----------------------------------------------------------

  update(dt) {
    this.beams.length = 0;
    this.updateLayout();
    this.updateWave(dt);
    this.updateZones(dt);
    this.updateEnemies(dt);
    this.updateWall(dt);
    this.updateTurrets(dt);
    this.updateBullets(dt);
    this.updateShells(dt);
    this.updateBlasts(dt);
    this.updateTracers(dt);
    if (this.pendingSpawns.length) {
      this.enemies.push(...this.pendingSpawns);
      this.pendingSpawns.length = 0;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.trackGoldRate(dt);
    this.checkMilestones();
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
  }

  // Ground turrets have no slots: they are spread evenly along the turret
  // line in purchase order, splitting into a second row once it gets crowded.
  updateLayout() {
    const ground = this.state.turrets.filter((t) => !TURRET_TYPES[t.type].flying);
    this.turretPos.clear();
    const rows = ground.length <= 8 ? 1 : 2;
    const perRow = Math.ceil(ground.length / rows);
    ground.forEach((t, i) => {
      const row = Math.floor(i / perRow);
      const idx = i - row * perRow;
      const inRow = Math.min(perRow, ground.length - row * perRow);
      const x = inRow > 1 ? 10 + ((W - 20) / (inRow - 1)) * idx : W / 2;
      this.turretPos.set(t, { x: Math.round(x), y: TURRET_Y + row * 7 });
    });
  }

  updateWave(dt) {
    const conf = waveConf(this.state.wave);
    const count = this.waveCount(conf);
    this.announceElite();
    if (this.waveSpawned < count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer += Math.max((conf.interval || 1) * this.spawnIntervalMult(), 0.2);
        this.waveSpawned++;
        this.spawnEnemy(conf);
      }
    } else if (this.enemies.length === 0) {
      this.state.wave++;
      const c = this.state.challenge;
      if (c && this.state.wave > c.target) {
        this.endChallenge(true);
        return;
      }
      // Challenge waves don't count toward BEST WAVE — that stat is the
      // main run's push.
      if (!c && this.state.wave > this.state.bestWave) this.state.bestWave = this.state.wave;
      this.waveSpawned = 0;
      this.spawnTimer = 1;
      // Surviving a wave leaves time to patch every crack.
      this.state.wallHp = this.wallMaxHp();
    }
  }

  // Announce an elite wave once, on screen, before its first spawn (and on
  // reload mid-wave). announcedElite resets whenever the wave counter jumps
  // back, so the same wave number can announce again next run.
  announceElite() {
    const elite = eliteConf(this.state.wave);
    if (!elite || this.announcedElite === this.state.wave) return;
    this.announcedElite = this.state.wave;
    this.toast?.(`ELITE WAVE ${this.state.wave}: ${elite.name} — ${elite.desc}`);
    this.banner = { text: `ELITE: ${elite.name}`, t: 3 };
    if (this.waveSpawned === 0) this.spawnTimer = Math.max(this.spawnTimer, 2);
  }

  marchVelocity(speed) {
    const targetX = 8 + Math.random() * (W - 16);
    const dx = targetX - SPAWN.x;
    const dy = TURRET_Y - 6 - SPAWN.y;
    const len = Math.hypot(dx, dy);
    return { vx: (dx / len) * speed, vy: (dy / len) * speed };
  }

  // Non-boss spawns roll a kind from the wave's unlocked pool; bosses roll a
  // modifier from the same pool at high waves. Kind multipliers stack on top
  // of the wave's base numbers, and elite-wave / challenge-rule modifiers on
  // top of those.
  spawnEnemy(conf) {
    const rule = this.challengeRule();
    let kind = conf.boss ? rollBossMod(this.state.wave) : rollEnemyKind(this.state.wave);
    if (!conf.boss && rule?.forceKind) kind = rule.forceKind;
    const elite = eliteConf(this.state.wave);
    const k = ENEMY_TYPES[kind];
    const speed = conf.speed * (k.speed ?? 1) * (elite?.speed ?? 1);
    const hp = conf.hp * (k.hp ?? 1) * (elite?.hp ?? 1);
    const e = {
      kind,
      x: SPAWN.x + (Math.random() * 10 - 5),
      y: SPAWN.y + (Math.random() * 10 - 5),
      ...this.marchVelocity(speed),
      speed,
      hp,
      maxHp: hp,
      gold: conf.gold * (k.gold ?? 1) * (elite?.gold ?? 1) * this.goldMult(),
      boss: conf.boss,
      hitFlash: 0,
      slow: 1,
      dead: false,
    };
    if (elite?.regen) e.regen = elite.regen;
    if (k.blink) e.blinkT = Math.random() * (k.blink.visible + k.blink.hidden);
    this.enemies.push(e);
    this.announceKind(kind);
  }

  announceKind(kind) {
    if (kind === 'normal' || this.state.seenEnemies[kind]) return;
    this.state.seenEnemies[kind] = true;
    const k = ENEMY_TYPES[kind];
    this.toast?.(`NEW ENEMY: ${k.name} — ${k.intro}`);
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      // Ghosts cycle in and out of phase; while phased they are untargetable
      // and immune (see damage / nearestEnemy / toughestEnemy). A ghost that
      // reaches the wall materializes for good — no phasing mid-bite.
      const blink = e.atWall ? null : ENEMY_TYPES[e.kind]?.blink;
      if (blink) {
        e.blinkT = (e.blinkT + dt) % (blink.visible + blink.hidden);
        e.phased = e.blinkT >= blink.visible;
      }
      // Freeze zones slow everything inside them (and burn, once evolved).
      e.slow = 1;
      if (!e.phased) {
        for (const z of this.zones) {
          if (Math.hypot(e.x - z.x, e.y - z.y) <= z.r) {
            e.slow = z.factor;
            if (z.dps) this.damage(e, z.dps * dt);
            break;
          }
        }
      }
      e.x += e.vx * dt * e.slow;
      e.y += e.vy * dt * e.slow;
      e.hitFlash = Math.max(e.hitFlash - dt, 0);
      // REGEN elites heal a fraction of max hp per second — burst damage
      // beats them, chip damage doesn't.
      if (e.regen && !e.dead && e.hp < e.maxHp) {
        e.hp = Math.min(e.hp + e.maxHp * e.regen * dt, e.maxHp);
      }
      // Reached the wall: the enemy latches on and starts biting (see
      // updateWall). It stays targetable — and being closest to the turret
      // line, nearest-enemy weapons naturally focus the biters first.
      if (!e.atWall && e.y >= TURRET_Y - 4) {
        e.atWall = true;
        e.y = TURRET_Y - 4;
        e.vx = 0;
        e.vy = 0;
        e.phased = false;
        e.biteT = 0;
      }
    }
  }

  // Latched enemies bite the wall once a second; when nobody has bitten for
  // a while the wall repairs itself (and fully, between waves).
  updateWall(dt) {
    this.wallHitT += dt;
    this.wallFlash = Math.max(this.wallFlash - dt, 0);
    for (const e of this.enemies) {
      if (!e.atWall || e.dead) continue;
      e.biteT += dt;
      if (e.biteT >= WALL.hitEvery) {
        e.biteT -= WALL.hitEvery;
        this.state.wallHp -= this.wallDmg(e);
        this.wallHitT = 0;
        this.wallFlash = 0.15;
      }
    }
    if (this.state.wallHp <= 0) {
      this.breach();
    } else if (this.wallHitT >= WALL.regenDelay) {
      this.state.wallHp = Math.min(
        this.state.wallHp + this.wallRepairRate() * dt,
        this.wallMaxHp(),
      );
    }
  }

  // The wall is down: clear the field, rebuild the wall and push the run
  // back a few waves. A setback, never a game over — an unattended run
  // oscillates around the wave it can hold instead of dying.
  breach() {
    const s = this.state;
    // WAVE SKIP never cushions a challenge run — those always start at 1.
    const startWave = s.challenge ? 1 : 1 + CORE_UPGRADES.skip.amount * s.coreUpgrades.skip;
    s.wave = Math.max(s.wave - WALL.setback, Math.min(startWave, s.wave), 1);
    this.announcedElite = 0;
    this.clearField();
    this.waveSpawned = 0;
    this.spawnTimer = 2; // a breather while the wall goes back up
    s.wallHp = this.wallMaxHp();
    this.wallHitT = WALL.regenDelay;
    this.toast?.(`WALL BREACHED — PUSHED BACK TO WAVE ${s.wave}`);
  }

  clearField() {
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.shells.length = 0;
    this.blasts.length = 0;
    this.zones.length = 0;
    this.tracers.length = 0;
    this.pendingSpawns.length = 0;
  }

  updateTurrets(dt) {
    for (const t of this.state.turrets) {
      const st = this.stats(t.type);
      let cd = Math.max((this.cd.get(t) ?? 0) - dt, 0);

      if (t.type === 'drone') {
        cd = this.updateDrone(t, st, cd, dt);
      } else if (t.type === 'laser') {
        const p = this.turretPos.get(t);
        const tip = { x: p.x, y: p.y - 5 };
        const target = this.nearestEnemy(tip.x, tip.y);
        if (target) {
          this.damage(target, st.dmg * st.rate * dt);
          this.beams.push({ x0: tip.x, y0: tip.y, x1: target.x, y1: target.y });
          if (this.evolved('laser')) {
            // PRISM: a second beam at half power on the next-nearest enemy.
            const second = this.nearestEnemy(tip.x, tip.y, target);
            if (second) {
              this.damage(second, st.dmg * st.rate * dt * 0.5);
              this.beams.push({ x0: tip.x, y0: tip.y, x1: second.x, y1: second.y });
            }
          }
        }
      } else if (t.type === 'gun') {
        const p = this.turretPos.get(t);
        const y = p.y - 2;
        const target = this.nearestEnemy(p.x, y);
        if (target) {
          t.angle = Math.atan2(target.y - y, target.x - p.x);
          if (cd === 0) {
            cd = 1 / st.rate;
            this.fireBullet(p.x, y, target, st.dmg, TURRET_TYPES.gun.bulletSpeed);
            if (this.evolved('gun')) {
              // TWIN GUN: second bullet at another enemy, or the same one.
              const second = this.nearestEnemy(p.x, y, target) ?? target;
              this.fireBullet(p.x, y, second, st.dmg, TURRET_TYPES.gun.bulletSpeed);
            }
          }
        }
      } else if (t.type === 'mortar' || t.type === 'freezer') {
        const def = TURRET_TYPES[t.type];
        const p = this.turretPos.get(t);
        const target = this.nearestEnemy(p.x, p.y);
        if (target && cd === 0) {
          cd = 1 / st.rate;
          this.shells.push({
            x0: p.x,
            y0: p.y - 3,
            x1: Math.min(Math.max(target.x + target.vx * def.shellTime, 2), W - 2),
            y1: Math.min(target.y + target.vy * def.shellTime, TURRET_Y - 5),
            t: 0,
            dur: def.shellTime,
            dmg: st.dmg,
            splash: def.splash ?? def.zoneRadius,
            freeze: t.type === 'freezer',
            cluster: t.type === 'mortar' && this.evolved('mortar'),
            // PERMAFROST: evolved freeze zones burn for the freezer's dmg/sec.
            dps: t.type === 'freezer' && this.evolved('freezer') ? st.dmg : 0,
          });
        }
      } else if (t.type === 'sniper') {
        const target = this.toughestEnemy();
        if (target && cd === 0) {
          cd = 1 / st.rate;
          const p = this.turretPos.get(t);
          const x0 = p.x;
          const y0 = p.y - 7;
          let end = target;
          if (this.evolved('sniper')) {
            // RAILGUN: the shot pierces along its whole path.
            end = this.pierceLine(x0, y0, target, st.dmg);
          } else {
            this.damage(target, st.dmg);
          }
          this.tracers.push({ x0, y0, x1: end.x, y1: end.y, t: 0 });
        }
      }
      this.cd.set(t, cd);
    }
  }

  updateDrone(t, st, cd, dt) {
    const def = TURRET_TYPES.drone;
    let p = this.dronePos.get(t);
    if (!p) {
      p = { x: W / 2 + (Math.random() * 40 - 20), y: 150 };
      this.dronePos.set(t, p);
    }
    const target = this.nearestEnemy(p.x, p.y);
    // Hover just below its prey, or drift home when the arena is clear.
    const dest = target ? { x: target.x, y: target.y + 14 } : { x: W / 2, y: 145 };
    const dx = dest.x - p.x;
    const dy = dest.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const step = Math.min(def.moveSpeed * dt, d);
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
    if (target && cd === 0) {
      cd = 1 / st.rate;
      this.fireBullet(p.x, p.y, target, st.dmg, def.bulletSpeed);
      if (this.evolved('drone')) {
        // WASP: a second sting at the next-nearest enemy.
        const second = this.nearestEnemy(p.x, p.y, target);
        if (second) this.fireBullet(p.x, p.y, second, st.dmg, def.bulletSpeed);
      }
    }
    return cd;
  }

  // RAILGUN: damage every enemy on the ray from the muzzle through the
  // target. Returns the far end of the tracer.
  pierceLine(x0, y0, target, dmg) {
    const dx = target.x - x0;
    const dy = target.y - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    for (const e of this.enemies) {
      if (e.dead || e.phased) continue;
      const along = (e.x - x0) * ux + (e.y - y0) * uy;
      if (along < 0) continue;
      const perp = Math.abs((e.x - x0) * uy - (e.y - y0) * ux);
      if (perp <= 2.5) this.damage(e, dmg);
    }
    return { x: x0 + ux * 260, y: y0 + uy * 260 };
  }

  fireBullet(x, y, target, dmg, speed) {
    const d = Math.hypot(target.x - x, target.y - y) || 1;
    this.bullets.push({
      x,
      y,
      vx: ((target.x - x) / d) * speed,
      vy: ((target.y - y) / d) * speed,
      speed,
      dmg,
      target,
      life: 2,
    });
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      b.life -= dt;
      // A phased ghost can't be homed on or hit — the bullet flies straight
      // until its target comes back into phase (or the bullet expires).
      const tgt = b.target && !b.target.dead && !b.target.phased ? b.target : null;
      if (tgt) {
        const dx = tgt.x - b.x;
        const dy = tgt.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < Math.max(tgt.boss ? 6 : 3, b.speed * dt)) {
          this.damage(tgt, b.dmg);
          b.life = 0;
          continue;
        }
        b.vx = (dx / d) * b.speed;
        b.vy = (dy / d) * b.speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.bullets = this.bullets.filter(
      (b) => b.life > 0 && b.x > -5 && b.x < W + 5 && b.y > -5,
    );
  }

  updateShells(dt) {
    for (const s of this.shells) {
      s.t += dt / s.dur;
      if (s.t >= 1) {
        if (s.cluster) {
          // CLUSTER: three smaller blasts scattered around the impact point.
          const base = Math.random() * Math.PI * 2;
          for (let i = 0; i < 3; i++) {
            const a = base + (i / 3) * Math.PI * 2;
            const off = s.splash * 0.7;
            const bx = Math.min(Math.max(s.x1 + Math.cos(a) * off, 2), W - 2);
            const by = Math.min(s.y1 + Math.sin(a) * off, TURRET_Y - 5);
            this.explode(bx, by, s.splash * 0.7, s.dmg * 0.6);
          }
        } else {
          for (const e of this.enemies) {
            if (!e.dead && Math.hypot(e.x - s.x1, e.y - s.y1) <= s.splash) {
              this.damage(e, s.dmg);
            }
          }
        }
        if (s.freeze) {
          const def = TURRET_TYPES.freezer;
          this.zones.push({
            x: s.x1,
            y: s.y1,
            r: def.zoneRadius,
            factor: def.slowFactor,
            dps: s.dps,
            t: 0,
            dur: def.zoneDuration,
          });
        } else if (!s.cluster) {
          this.blasts.push({ x: s.x1, y: s.y1, maxR: s.splash, t: 0, dur: 0.3 });
        }
      }
    }
    this.shells = this.shells.filter((s) => s.t < 1);
  }

  explode(x, y, r, dmg) {
    for (const e of this.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - y) <= r) this.damage(e, dmg);
    }
    this.blasts.push({ x, y, maxR: r, t: 0, dur: 0.3 });
  }

  updateZones(dt) {
    for (const z of this.zones) z.t += dt / z.dur;
    this.zones = this.zones.filter((z) => z.t < 1);
  }

  updateBlasts(dt) {
    for (const b of this.blasts) b.t += dt / b.dur;
    this.blasts = this.blasts.filter((b) => b.t < 1);
  }

  updateTracers(dt) {
    for (const tr of this.tracers) tr.t += dt / 0.15;
    this.tracers = this.tracers.filter((tr) => tr.t < 1);
  }

  damage(e, amt) {
    if (e.dead || e.phased) return;
    e.hp -= amt;
    e.hitFlash = 0.08;
    if (e.hp <= 0) {
      e.dead = true;
      this.state.kills++;
      this.state.gold += e.gold;
      this.state.goldEarned += e.gold;
      this.goldEarnedWindow += e.gold;
      const splits = ENEMY_TYPES[e.kind]?.splits;
      if (splits && !e.mini) this.split(e, splits);
      this.blasts.push({ x: e.x, y: e.y, maxR: e.boss ? 12 : 4, t: 0, dur: 0.3 });
    }
  }

  // A dying splitter breaks into faster minis that carry a fraction of its
  // max hp and gold. Buffered so they can't be caught by the killing blast.
  split(e, def) {
    const [lo, hi] = def.count;
    const n = e.boss ? def.bossCount : lo + Math.floor(Math.random() * (hi - lo + 1));
    const hpFrac = e.boss ? def.bossHp : def.hp;
    for (let i = 0; i < n; i++) {
      const speed = e.speed * def.speed;
      const hp = e.maxHp * hpFrac;
      this.pendingSpawns.push({
        kind: 'mini',
        mini: true,
        x: Math.min(Math.max(e.x + (Math.random() * 8 - 4), 2), W - 2),
        y: Math.min(e.y + (Math.random() * 8 - 4), TURRET_Y - 6),
        ...this.marchVelocity(speed),
        speed,
        hp,
        maxHp: hp,
        gold: e.gold * def.gold,
        boss: false,
        hitFlash: 0,
        slow: 1,
        dead: false,
      });
    }
  }

  checkMilestones() {
    for (const m of MILESTONES) {
      if (!this.milestoneDone(m)) continue;
      const key = milestoneKey(m);
      if (this.announced.has(key)) continue;
      this.announced.add(key);
      const { req, bonus } = milestoneText(m);
      this.toast?.(`MILESTONE: ${req} — ${bonus} FOREVER`);
    }
  }

  // Weapons have no range limit: anything on the field is targetable —
  // except phased ghosts. `exclude` lets evolved weapons pick a second
  // target different from their first.
  nearestEnemy(x, y, exclude = null) {
    let best = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e.phased || e === exclude) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  toughestEnemy() {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead || e.phased) continue;
      if (!best || e.hp > best.hp) best = e;
    }
    return best;
  }

  trackGoldRate(dt) {
    this.windowTime += dt;
    if (this.windowTime >= 5) {
      const rate = this.goldEarnedWindow / this.windowTime;
      const s = this.state;
      s.goldPerSec = s.goldPerSec > 0 ? s.goldPerSec * 0.7 + rate * 0.3 : rate;
      this.windowTime = 0;
      this.goldEarnedWindow = 0;
    }
  }
}
