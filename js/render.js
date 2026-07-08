import { W, H, TURRET_Y, SPAWN } from './config.js';

const BOSS_PATTERN = ['#...#', '.###.', '#####', '.###.', '#...#'];

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawGround(ctx, game);
  drawWall(ctx, game);
  drawPortal(ctx, time);
  drawZones(ctx, game, time);
  drawBlasts(ctx, game);
  drawShells(ctx, game);
  drawBeams(ctx, game, time);
  drawTracers(ctx, game);
  drawEnemies(ctx, game);
  drawBullets(ctx, game);
  drawTurrets(ctx, game);
  drawDrones(ctx, game, time);
  drawBossBar(ctx, game);
}

function drawGround(ctx, game) {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, TURRET_Y + 3, W, H - TURRET_Y - 3);
}

// The wall is its own HP bar: the bright span shrinks from the right as it
// takes damage, and the whole strip flashes white on every bite.
function drawWall(ctx, game) {
  const frac = Math.max(game.state.wallHp / game.wallMaxHp(), 0);
  ctx.fillStyle = '#333';
  ctx.fillRect(0, TURRET_Y - 2, W, 2);
  ctx.fillStyle = game.wallFlash > 0 ? '#fff' : frac > 0.3 ? '#aaa' : '#777';
  ctx.fillRect(0, TURRET_Y - 2, Math.round(W * frac), 2);
}

function drawPortal(ctx, time) {
  const h = 4 + Math.sin(time * 4) * 2;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(SPAWN.x - h + 0.5, SPAWN.y - h + 0.5, h * 2, h * 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(SPAWN.x - 1, SPAWN.y - 1, 2, 2);
}

function drawZones(ctx, game, time) {
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  for (const z of game.zones) {
    const shade = Math.round(180 - 120 * z.t);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineDashOffset = Math.floor(time * 8) % 4;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    // A phased ghost is just a dark outline — out of reach until it blinks
    // back in.
    if (e.phased) {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      const r = e.boss ? 6 : 2;
      ctx.strokeRect(x - r - 0.5, y - r - 0.5, r * 2 + 1, r * 2 + 1);
      continue;
    }
    const frac = Math.max(e.hp / e.maxHp, 0);
    const shade = e.hitFlash > 0 ? 255 : Math.round(110 + 145 * frac);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    if (e.boss) {
      // A boss is a cluster of pixels rather than a single one.
      for (let r = 0; r < BOSS_PATTERN.length; r++) {
        for (let c = 0; c < BOSS_PATTERN[r].length; c++) {
          if (BOSS_PATTERN[r][c] === '#') {
            ctx.fillRect(x - 5 + c * 2, y - 5 + r * 2, 2, 2);
          }
        }
      }
    } else if (e.kind === 'runner' || e.kind === 'mini') {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    } else if (e.kind === 'tank') {
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, 1, 1);
    } else if (e.kind === 'splitter') {
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillRect(x - 2, y - 2, 1, 1);
      ctx.fillRect(x + 2, y - 2, 1, 1);
      ctx.fillRect(x - 2, y + 2, 1, 1);
      ctx.fillRect(x + 2, y + 2, 1, 1);
    } else if (e.kind === 'ghost') {
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }
    // Frozen enemies get an outline so the slow is readable.
    if (e.slow < 1) {
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      const r = e.boss ? 6 : 2;
      ctx.strokeRect(x - r - 0.5, y - r - 0.5, r * 2 + 1, r * 2 + 1);
    }
  }
}

function drawBullets(ctx, game) {
  ctx.fillStyle = '#fff';
  for (const b of game.bullets) {
    ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
  }
}

function drawShells(ctx, game) {
  ctx.fillStyle = '#ccc';
  for (const s of game.shells) {
    const px = s.x0 + (s.x1 - s.x0) * s.t;
    const py = s.y0 + (s.y1 - s.y0) * s.t - Math.sin(Math.PI * s.t) * 28;
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
  }
}

function drawBeams(ctx, game, time) {
  ctx.strokeStyle = Math.floor(time * 30) % 2 ? '#fff' : '#888';
  ctx.lineWidth = 1;
  for (const b of game.beams) {
    ctx.beginPath();
    ctx.moveTo(b.x0 + 0.5, b.y0 + 0.5);
    ctx.lineTo(b.x1 + 0.5, b.y1 + 0.5);
    ctx.stroke();
  }
}

function drawTracers(ctx, game) {
  ctx.lineWidth = 1;
  for (const tr of game.tracers) {
    const shade = Math.round(255 - 200 * tr.t);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.moveTo(tr.x0 + 0.5, tr.y0 + 0.5);
    ctx.lineTo(tr.x1 + 0.5, tr.y1 + 0.5);
    ctx.stroke();
  }
}

function drawBlasts(ctx, game) {
  ctx.lineWidth = 1;
  for (const b of game.blasts) {
    const shade = Math.round(255 - 195 * b.t);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(b.maxR * b.t, 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTurrets(ctx, game) {
  for (const [t, p] of game.turretPos) {
    const x = p.x;
    const y = p.y;
    const evolved = game.evolved(t.type);
    ctx.fillStyle = '#fff';
    if (t.type === 'gun') {
      ctx.fillRect(x - 2, y - 2, 5, 4);
      const a = t.angle ?? -Math.PI / 2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      // TWIN GUN carries two barrels.
      for (const off of evolved ? [-1, 2] : [0]) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5 + off, y - 1.5);
        ctx.lineTo(x + 0.5 + off + Math.cos(a) * 4, y - 1.5 + Math.sin(a) * 4);
        ctx.stroke();
      }
    } else if (t.type === 'mortar') {
      ctx.fillRect(x - 3, y - 2, 7, 4);
      ctx.fillRect(x - 1, y - 4, 3, 2);
      if (evolved) {
        // CLUSTER: two extra side tubes.
        ctx.fillRect(x - 3, y - 3, 1, 1);
        ctx.fillRect(x + 3, y - 3, 1, 1);
      }
    } else if (t.type === 'laser') {
      ctx.fillRect(x - 2, y - 2, 5, 4);
      ctx.fillRect(x, y - 5, 1, 3);
      // PRISM: a wide splitting head.
      if (evolved) ctx.fillRect(x - 1, y - 6, 3, 1);
    } else if (t.type === 'freezer') {
      ctx.fillRect(x - 3, y - 2, 7, 4);
      ctx.fillRect(x - 2, y - 5, 5, 3);
      // PERMAFROST: a frost crest on the dome.
      if (evolved) ctx.fillRect(x - 1, y - 6, 3, 1);
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, y - 4, 3, 1);
    } else if (t.type === 'sniper') {
      ctx.fillRect(x - 2, y - 2, 5, 4);
      // RAILGUN: a longer, tipped barrel.
      ctx.fillRect(x, y - (evolved ? 10 : 8), 1, evolved ? 8 : 6);
      if (evolved) ctx.fillRect(x - 1, y - 10, 3, 1);
    }
  }
}

function drawDrones(ctx, game, time) {
  const evolved = game.evolved('drone');
  for (const p of game.dronePos.values()) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 1, y - 1, 2, 2);
    // Blinking rotor pixels.
    ctx.fillStyle = Math.floor(time * 10) % 2 ? '#888' : '#ccc';
    ctx.fillRect(x - 2, y - 2, 1, 1);
    ctx.fillRect(x + 1, y - 2, 1, 1);
    if (evolved) {
      // WASP: side wings.
      ctx.fillRect(x - 2, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
    }
  }
}

function drawBossBar(ctx, game) {
  const boss = game.enemies.find((e) => e.boss && !e.dead);
  if (!boss) return;
  ctx.fillStyle = '#333';
  ctx.fillRect(4, 3, W - 8, 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(4, 3, Math.round((W - 8) * (boss.hp / boss.maxHp)), 2);
}
