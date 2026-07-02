import {
  W,
  TURRET_Y,
  SLOTS,
  SPAWN,
  TURRET_TYPES,
  UPGRADE_TYPES,
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
    this.cd = new Map(); // per-turret cooldowns (runtime only, not saved)
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
    const owned = this.state.turrets.filter((t) => t.type === type).length;
    return Math.round(def.baseCost * Math.pow(def.costGrowth, owned));
  }

  upgradeCost(type, kind) {
    const def = UPGRADE_TYPES[kind];
    const lvl = this.state.upgrades[type][kind];
    return Math.round(def.baseCost * Math.pow(def.costGrowth, lvl));
  }

  ownedCount(type) {
    return this.state.turrets.filter((t) => t.type === type).length;
  }

  freeSlot() {
    const used = new Set(this.state.turrets.map((t) => t.slot));
    // Fill from the middle outwards so the line stays symmetric.
    for (const s of [2, 3, 1, 4, 0, 5]) {
      if (!used.has(s)) return s;
    }
    return -1;
  }

  // --- player actions ------------------------------------------------------

  buyTurret(type) {
    const cost = this.turretCost(type);
    const slot = this.freeSlot();
    if (slot === -1 || this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.turrets.push({ type, slot });
    return true;
  }

  buyUpgrade(type, kind) {
    const cost = this.upgradeCost(type, kind);
    if (this.ownedCount(type) === 0 || this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.state.upgrades[type][kind]++;
    return true;
  }

  // --- simulation ----------------------------------------------------------

  update(dt) {
    this.beams.length = 0;
    this.updateWave(dt);
    this.updateEnemies(dt);
    this.updateTurrets(dt);
    this.updateBullets(dt);
    this.updateShells(dt);
    this.updateBlasts(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.trackGoldRate(dt);
  }

  updateWave(dt) {
    const conf = waveConf(this.state.wave);
    if (this.waveSpawned < conf.count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer += conf.interval || 1;
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
      gold: conf.gold,
      boss: conf.boss,
      hitFlash: 0,
      dead: false,
    });
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
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
      const x = SLOTS[t.slot];
      const y = TURRET_Y;
      const st = this.stats(t.type);
      let cd = Math.max((this.cd.get(t) ?? 0) - dt, 0);

      if (t.type === 'laser') {
        const tip = { x, y: y - 5 };
        const target = this.nearestEnemy(tip.x, tip.y, st.range);
        if (target) {
          this.damage(target, st.dmg * st.rate * dt);
          this.beams.push({ x0: tip.x, y0: tip.y, x1: target.x, y1: target.y });
        }
      } else if (t.type === 'gun') {
        const target = this.nearestEnemy(x, y - 2, st.range);
        if (target) {
          t.angle = Math.atan2(target.y - (y - 2), target.x - x);
          if (cd === 0) {
            cd = 1 / st.rate;
            const d = Math.hypot(target.x - x, target.y - (y - 2)) || 1;
            this.bullets.push({
              x,
              y: y - 2,
              vx: ((target.x - x) / d) * TURRET_TYPES.gun.bulletSpeed,
              vy: ((target.y - (y - 2)) / d) * TURRET_TYPES.gun.bulletSpeed,
              speed: TURRET_TYPES.gun.bulletSpeed,
              dmg: st.dmg,
              target,
              life: 2,
            });
          }
        }
      } else if (t.type === 'mortar') {
        const target = this.nearestEnemy(x, y, st.range);
        if (target && cd === 0) {
          cd = 1 / st.rate;
          const flight = TURRET_TYPES.mortar.shellTime;
          this.shells.push({
            x0: x,
            y0: y - 3,
            x1: Math.min(Math.max(target.x + target.vx * flight, 2), W - 2),
            y1: Math.min(target.y + target.vy * flight, TURRET_Y - 5),
            t: 0,
            dur: flight,
            dmg: st.dmg,
            splash: TURRET_TYPES.mortar.splash,
          });
        }
      }
      this.cd.set(t, cd);
    }
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
        this.blasts.push({ x: s.x1, y: s.y1, maxR: s.splash, t: 0, dur: 0.3 });
      }
    }
    this.shells = this.shells.filter((s) => s.t < 1);
  }

  updateBlasts(dt) {
    for (const b of this.blasts) b.t += dt / b.dur;
    this.blasts = this.blasts.filter((b) => b.t < 1);
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
