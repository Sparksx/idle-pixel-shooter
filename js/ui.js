import { TURRET_TYPES, UPGRADE_TYPES } from './config.js';

export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

export function buildUI(game) {
  const statGold = document.getElementById('stat-gold');
  const statWave = document.getElementById('stat-wave');
  const statKills = document.getElementById('stat-kills');
  const shop = document.getElementById('shop');
  const upgrades = document.getElementById('upgrades');

  const shopBtns = [];
  for (const type of Object.keys(TURRET_TYPES)) {
    const btn = document.createElement('button');
    const label = document.createElement('span');
    const sub = document.createElement('small');
    btn.append(label, sub);
    btn.addEventListener('click', () => {
      if (game.buyTurret(type)) refresh();
    });
    shop.append(btn);
    shopBtns.push({ btn, label, sub, type });
  }

  const upgradeBtns = [];
  for (const type of Object.keys(TURRET_TYPES)) {
    for (const kind of Object.keys(UPGRADE_TYPES)) {
      const btn = document.createElement('button');
      const label = document.createElement('span');
      const sub = document.createElement('small');
      btn.append(label, sub);
      btn.addEventListener('click', () => {
        if (game.buyUpgrade(type, kind)) refresh();
      });
      upgrades.append(btn);
      upgradeBtns.push({ btn, label, sub, type, kind });
    }
  }

  function refresh() {
    const s = game.state;
    statGold.textContent = fmt(s.gold);
    statWave.textContent = s.wave;
    statKills.textContent = fmt(s.kills);

    const slotFree = game.freeSlot() !== -1;
    for (const { btn, label, sub, type } of shopBtns) {
      const cost = game.turretCost(type);
      const owned = game.ownedCount(type);
      label.textContent = `+ ${TURRET_TYPES[type].name}` + (owned ? ` (${owned})` : '');
      sub.textContent = slotFree ? `${fmt(cost)} G` : 'SLOTS FULL';
      btn.disabled = !slotFree || s.gold < cost;
    }

    for (const { btn, label, sub, type, kind } of upgradeBtns) {
      const owned = game.ownedCount(type);
      btn.hidden = owned === 0;
      if (btn.hidden) continue;
      const cost = game.upgradeCost(type, kind);
      const lvl = s.upgrades[type][kind];
      label.textContent = `${TURRET_TYPES[type].name} ${UPGRADE_TYPES[kind].name} LV${lvl}`;
      sub.textContent = `${fmt(cost)} G`;
      btn.disabled = s.gold < cost;
    }
  }

  refresh();
  return { refresh };
}
