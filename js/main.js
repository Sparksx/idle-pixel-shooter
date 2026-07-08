import { OFFLINE } from './config.js';
import { Game } from './game.js';
import { render } from './render.js';
import { load, save, wipe } from './save.js';
import { buildUI } from './ui.js';

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const state = load();
const game = new Game(state);
game.toast = (msg) => toast(msg);
const ui = buildUI(game);

let toastTimeout;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

// While the tab is closed or hidden the sim doesn't run; instead we grant
// gold based on the recent earn rate, capped at 4 hours (+1h per OFFLINE
// TIME level). Base efficiency is 50%; each OFFLINE GAIN level adds 5%,
// up to 100%.
function applyOfflineGains() {
  const away = (Date.now() - state.lastSeen) / 1000;
  if (away > 60 && state.goldPerSec > 0) {
    const eff = Math.min(OFFLINE.baseEff + OFFLINE.effPerLevel * state.spawnUpgrades.offline, 1);
    const capHours = OFFLINE.baseHours + OFFLINE.hoursPerLevel * state.spawnUpgrades.offlineTime;
    const gain = Math.floor(state.goldPerSec * Math.min(away, capHours * 3600) * eff);
    if (gain > 0) {
      state.gold += gain;
      state.goldEarned += gain;
      const capped = away > capHours * 3600;
      toast(`WHILE AWAY: +${gain} GOLD` + (capped ? ` (${capHours}H CAP)` : ''));
    }
  }
  state.lastSeen = Date.now();
}

applyOfflineGains();

let last = performance.now();
let saveTimer = 0;
let uiTimer = 0;

function frame(now) {
  // Clamp dt so a background tab or hiccup doesn't fast-forward the sim.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  game.update(dt);
  render(ctx, game, now / 1000);

  saveTimer += dt;
  if (saveTimer >= 5) {
    saveTimer = 0;
    save(state);
  }
  uiTimer += dt;
  if (uiTimer >= 0.2) {
    uiTimer = 0;
    ui.refresh();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save(state);
  } else {
    last = performance.now();
    applyOfflineGains();
    ui.refresh();
  }
});

document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Wipe your save and start over?')) {
    wipe();
    location.reload();
  }
});

// Debug/testing hook.
window.__game = game;
