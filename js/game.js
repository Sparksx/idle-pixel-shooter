import {
  W,
  TURRET_Y,
  SPAWN,
  TURRET_TYPES,
  UPGRADE_TYPES,
  SPAWN_UPGRADES,
  waveConf,
} from './config.js';

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
  }

  // --- derived numbers -----------------------------------------------------

  stats(type) {
    const def = TURRET_TYPES[type];
    const up = this.state.upgrades[type];
    return {
      dmg: def.dmg * Math.pow(UPGRADE_TYPES.dmg.mult, up.dmg),
      rate: def.rate * Math.pow(UPGRADE_TYPES.rate.mult, up.rate),
      range: def.range,
    };
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

  ownedCount(type) {
    return this.state.turrets.filter((t) => t.type === type).length;
  }

  spawnIntervalMult() {
    return Math.pow(0.92, this.state.spawnUpgrades.rate);
  }

  goldMult() {
    return Math.pow(1.15, this.state.spawnUpgrades.gold);
  }

  waveCount(conf) {
    if (conf.boss) return 1;
    return Math.min(conf.count + this.state.spawnUpgrades.swarm, 30);
  }

  // --- player actions ------------------------------------------------------

  buyTurret(type) {
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
    const def = SPAWN_UPGRADES[kind];
    const lvl = this.state.spawnUpgrades[kind];
    if (def.maxLevel != null && lvl >= def.maxLevel) return false;
    const cost = this.spawnUpgradeCost(kind);
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.spawnUpgrades[kind]++;
    return true;
  }

  // --- simulation ----------------------------------------------------------

  update(dt) {
    this.beams.length = 0;
    this.updateLayout();
    this.updateWave(dt);
    this.updateZones(dt);
    this.updateEnemies(dt);
    this.updateTurrets(dt);
    this.updateBullets(dt);
    this.updateShells(dt);
    this.updateBlasts(dt);
    this.updateTracers(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.trackGoldRate(dt);
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
    if (this.waveSpawned < count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer += Math.max((conf.interval || 1) * this.spawnIntervalMult(), 0.2);
        this.waveSpawned++;
        this.spawnEnemy(conf);
      }
    } else if (this.enemies.length === 0) {
      this.state.wave++;
      this.waveSpawned = 0;
      this.spawnTimer = 1;
    }
  }

  marchVelocity(speed) {
    const targetX = 8 + Math.random() * (W - 16);
    const dx = targetX - SPAWN.x;
    const dy = TURRET_Y - 6 - SPAWN.y;
    const len = Math.hypot(dx, dy);
    return { vx: (dx / len) * speed, vy: (dy / len) * speed };
  }

  spawnEnemy(conf) {
    this.enemies.push({
      x: SPAWN.x + (Math.random() * 10 - 5),
      y: SPAWN.y + (Math.random() * 10 - 5),
      ...this.marchVelocity(conf.speed),
      speed: conf.speed,
      hp: conf.hp,
      maxHp: conf.hp,
      gold: conf.gold * this.goldMult(),
      boss: conf.boss,
      hitFlash: 0,
      slow: 1,
      dead: false,
    });
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      // Freeze zones slow everything inside them.
      e.slow = 1;
      for (const z of this.zones) {
        if (Math.hypot(e.x - z.x, e.y - z.y) <= z.r) {
          e.slow = z.factor;
          break;
        }
      }
      e.x += e.vx * dt * e.slow;
      e.y += e.vy * dt * e.slow;
      e.hitFlash = Math.max(e.hitFlash - dt, 0);
      // Reached the turret line: the enemy slips past and loops back through
      // the portal. Waves only complete once everything is killed, so the
      // difficulty can never outrun the player's damage output.
      if (e.y >= TURRET_Y - 4) {
        e.x = SPAWN.x + (Math.random() * 10 - 5);
        e.y = SPAWN.y;
        Object.assign(e, this.marchVelocity(e.speed));
      }
    }
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
        const target = this.nearestEnemy(tip.x, tip.y, st.range);
        if (target) {
          this.damage(target, st.dmg * st.rate * dt);
          this.beams.push({ x0: tip.x, y0: tip.y, x1: target.x, y1: target.y });
        }
      } else if (t.type === 'gun') {
        const p = this.turretPos.get(t);
        const y = p.y - 2;
        const target = this.nearestEnemy(p.x, y, st.range);
        if (target) {
          t.angle = Math.atan2(target.y - y, target.x - p.x);
          if (cd === 0) {
            cd = 1 / st.rate;
            this.fireBullet(p.x, y, target, st.dmg, TURRET_TYPES.gun.bulletSpeed);
          }
        }
      } else if (t.type === 'mortar' || t.type === 'freezer') {
        const def = TURRET_TYPES[t.type];
        const p = this.turretPos.get(t);
        const target = this.nearestEnemy(p.x, p.y, st.range);
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
          });
        }
      } else if (t.type === 'sniper') {
        const target = this.toughestEnemy();
        if (target && cd === 0) {
          cd = 1 / st.rate;
          const p = this.turretPos.get(t);
          this.damage(target, st.dmg);
          this.tracers.push({ x0: p.x, y0: p.y - 7, x1: target.x, y1: target.y, t: 0 });
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
    const target = this.nearestEnemy(p.x, p.y, 999);
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
    if (target && cd === 0 && Math.hypot(target.x - p.x, target.y - p.y) <= st.range) {
      cd = 1 / st.rate;
      this.fireBullet(p.x, p.y, target, st.dmg, def.bulletSpeed);
    }
    return cd;
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
      const tgt = b.target && !b.target.dead ? b.target : null;
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
        for (const e of this.enemies) {
          if (!e.dead && Math.hypot(e.x - s.x1, e.y - s.y1) <= s.splash) {
            this.damage(e, s.dmg);
          }
        }
        if (s.freeze) {
          const def = TURRET_TYPES.freezer;
          this.zones.push({
            x: s.x1,
            y: s.y1,
            r: def.zoneRadius,
            factor: def.slowFactor,
            t: 0,
            dur: def.zoneDuration,
          });
        } else {
          this.blasts.push({ x: s.x1, y: s.y1, maxR: s.splash, t: 0, dur: 0.3 });
        }
      }
    }
    this.shells = this.shells.filter((s) => s.t < 1);
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
    if (e.dead) return;
    e.hp -= amt;
    e.hitFlash = 0.08;
    if (e.hp <= 0) {
      e.dead = true;
      this.state.kills++;
      this.state.gold += e.gold;
      this.goldEarnedWindow += e.gold;
      this.blasts.push({ x: e.x, y: e.y, maxR: e.boss ? 12 : 4, t: 0, dur: 0.3 });
    }
  }

  nearestEnemy(x, y, range) {
    let best = null;
    let bd = range;
    for (const e of this.enemies) {
      if (e.dead) continue;
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
      if (e.dead) continue;
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
