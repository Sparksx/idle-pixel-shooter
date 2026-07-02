import { W, H, TURRET_Y, SLOTS, SPAWN } from './config.js';

const BOSS_PATTERN = ['#...#', '.###.', '#####', '.###.', '#...#'];

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawGround(ctx, game);
  drawPortal(ctx, time);
  drawBlasts(ctx, game);
  drawShells(ctx, game);
  drawBeams(ctx, game, time);
  drawEnemies(ctx, game);
  drawBullets(ctx, game);
  drawTurrets(ctx, game);
  drawBossBar(ctx, game);
}

function drawGround(ctx, game) {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, TURRET_Y + 3, W, H - TURRET_Y - 3);
  ctx.fillStyle = '#444';
  for (const x of SLOTS) ctx.fillRect(x - 3, TURRET_Y + 3, 7, 1);
}

function drawPortal(ctx, time) {
  const h = 4 + Math.sin(time * 4) * 2;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(SPAWN.x - h + 0.5, SPAWN.y - h + 0.5, h * 2, h * 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(SPAWN.x - 1, SPAWN.y - 1, 2, 2);
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    const frac = Math.max(e.hp / e.maxHp, 0);
    const shade = e.hitFlash > 0 ? 255 : Math.round(110 + 145 * frac);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    if (e.boss) {
      // A boss is a cluster of pixels rather than a single one.
      for (let r = 0; r < BOSS_PATTERN.length; r++) {
        for (let c = 0; c < BOSS_PATTERN[r].length; c++) {
          if (BOSS_PATTERN[r][c] === '#') {
            ctx.fillRect(x - 5 + c * 2, y - 5 + r * 2, 2, 2);
          }
        }
      }
    } else {
      ctx.fillRect(x - 1, y - 1, 3, 3);
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
  ctx.fillStyle = '#fff';
  for (const t of game.state.turrets) {
    const x = SLOTS[t.slot];
    const y = TURRET_Y;
    if (t.type === 'gun') {
      ctx.fillRect(x - 2, y - 2, 5, 4);
      const a = t.angle ?? -Math.PI / 2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y - 1.5);
      ctx.lineTo(x + 0.5 + Math.cos(a) * 4, y - 1.5 + Math.sin(a) * 4);
      ctx.stroke();
    } else if (t.type === 'mortar') {
      ctx.fillRect(x - 3, y - 2, 7, 4);
      ctx.fillRect(x - 1, y - 4, 3, 2);
    } else if (t.type === 'laser') {
      ctx.fillRect(x - 2, y - 2, 5, 4);
      ctx.fillRect(x, y - 5, 1, 3);
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
