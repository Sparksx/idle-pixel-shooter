import {
  TURRET_TYPES,
  UPGRADE_TYPES,
  SPAWN_UPGRADES,
  REBIRTH,
  CORE_UPGRADES,
  EVOLUTIONS,
  EVOLVE_LEVELS,
  MILESTONES,
  milestoneText,
  fmt,
} from './config.js';

const TAB_DESCS = {
  spawn: 'portal upgrades — levels unlock as you reach higher waves',
  core: 'rebirth resets the run for cores — core upgrades are permanent',
  feats: 'lifetime milestones — the bonuses survive rebirth',
};

export function buildUI(game) {
  const statGold = document.getElementById('stat-gold');
  const statWave = document.getElementById('stat-wave');
  const statKills = document.getElementById('stat-kills');
  const statCores = document.getElementById('stat-cores');
  const tabsNav = document.getElementById('tabs');
  const tabDesc = document.getElementById('tab-desc');
  const content = document.getElementById('tab-content');

  let active = 'gun';
  let updaters = []; // refresh callbacks for the buttons of the active tab

  const tabIds = ['core', 'spawn', ...Object.keys(TURRET_TYPES), 'feats'];
  const tabButtons = new Map();
  for (const id of tabIds) {
    const btn = document.createElement('button');
    btn.addEventListener('click', () => {
      active = id;
      rebuild();
      refresh();
    });
    tabsNav.append(btn);
    tabButtons.set(id, btn);
  }

  function makeButton(onClick) {
    const btn = document.createElement('button');
    const label = document.createElement('span');
    const desc = document.createElement('small');
    desc.className = 'desc';
    const sub = document.createElement('small');
    btn.append(label, desc, sub);
    btn.addEventListener('click', () => {
      if (onClick()) refresh();
    });
    content.append(btn);
    return { btn, label, desc, sub };
  }

  function rebuild() {
    content.replaceChildren();
    updaters = [];

    if (active === 'core') {
      tabDesc.textContent = TAB_DESCS.core;

      const rb = makeButton(() => {
        if (!game.canRebirth()) return false;
        if (!confirm(`Rebirth for ${game.rebirthCores()} cores? Your run resets.`)) return false;
        return game.rebirth();
      });
      rb.btn.classList.add('span-2');
      rb.desc.textContent = 'keep cores, core upgrades & offline levels';
      updaters.push(() => {
        rb.label.textContent = 'REBIRTH';
        rb.sub.textContent = game.canRebirth()
          ? `+${fmt(game.rebirthCores())} CORES`
          : `REACH WAVE ${REBIRTH.minWave}`;
        rb.btn.disabled = !game.canRebirth();
      });

      for (const kind of Object.keys(CORE_UPGRADES)) {
        const def = CORE_UPGRADES[kind];
        const b = makeButton(() => game.buyCoreUpgrade(kind));
        b.desc.textContent = def.desc;
        updaters.push(() => {
          const lvl = game.state.coreUpgrades[kind];
          const maxed = def.maxLevel != null && lvl >= def.maxLevel;
          const cost = game.coreUpgradeCost(kind);
          b.label.textContent = `${def.name} LV${lvl}`;
          b.sub.textContent = maxed ? 'MAX' : `${fmt(cost)} C`;
          b.btn.disabled = maxed || game.state.cores < cost;
        });
      }
      return;
    }

    if (active === 'feats') {
      tabDesc.textContent = TAB_DESCS.feats;

      const total = document.createElement('div');
      total.className = 'milestone total span-2';
      content.append(total);
      updaters.push(() => {
        const dmg = Math.round((game.milestoneDmgMult() - 1) * 100);
        const gold = Math.round((game.milestoneGoldMult() - 1) * 100);
        total.textContent = `EARNED: +${dmg}% DMG, +${gold}% GOLD`;
      });

      for (const m of MILESTONES) {
        const el = document.createElement('div');
        el.className = 'milestone';
        const bonus = document.createElement('b');
        const req = document.createElement('small');
        el.append(bonus, req);
        content.append(el);
        const text = milestoneText(m);
        bonus.textContent = text.bonus;
        updaters.push(() => {
          const done = game.milestoneDone(m);
          el.classList.toggle('done', done);
          req.textContent = done ? `${text.req} ✓` : `${fmt(game.state[m.stat])} / ${text.req}`;
        });
      }
      return;
    }

    if (active === 'spawn') {
      tabDesc.textContent = TAB_DESCS.spawn;
      for (const kind of Object.keys(SPAWN_UPGRADES)) {
        const def = SPAWN_UPGRADES[kind];
        const b = makeButton(() => game.buySpawnUpgrade(kind));
        b.desc.textContent = def.desc;
        updaters.push(() => {
          const lvl = game.state.spawnUpgrades[kind];
          const maxed = def.maxLevel != null && lvl >= def.maxLevel;
          const waveLocked = !maxed && lvl >= game.spawnUpgradeMaxLevel(kind);
          const cost = game.spawnUpgradeCost(kind);
          b.label.textContent = `${def.name} LV${lvl}`;
          b.sub.textContent = maxed
            ? 'MAX'
            : waveLocked
              ? `REACH WAVE ${(lvl + 1) * def.wavePerLevel}`
              : `${fmt(cost)} G`;
          b.btn.disabled = maxed || waveLocked || game.state.gold < cost;
        });
      }
      return;
    }

    const type = active;
    const def = TURRET_TYPES[type];
    tabDesc.textContent = def.desc;

    const buy = makeButton(() => game.buyTurret(type));
    buy.btn.classList.add('span-2');
    updaters.push(() => {
      const owned = game.ownedCount(type);
      const cost = game.turretCost(type);
      buy.label.textContent = `+ BUY ${def.name}` + (owned ? ` (${owned})` : '');
      buy.sub.textContent = `${fmt(cost)} G`;
      buy.btn.disabled = game.state.gold < cost;
    });

    for (const kind of Object.keys(UPGRADE_TYPES)) {
      const b = makeButton(() => game.buyUpgrade(type, kind));
      updaters.push(() => {
        const owned = game.ownedCount(type);
        const cost = game.upgradeCost(type, kind);
        const lvl = game.state.upgrades[type][kind];
        b.label.textContent = `${UPGRADE_TYPES[kind].name} LV${lvl}`;
        b.sub.textContent = owned === 0 ? 'OWN ONE FIRST' : `${fmt(cost)} G`;
        b.btn.disabled = owned === 0 || game.state.gold < cost;
      });
    }

    // One-time evolution, unlocked by combined DMG+RATE levels.
    const evoDef = EVOLUTIONS[type];
    const evo = makeButton(() => game.buyEvolution(type));
    evo.btn.classList.add('span-2');
    evo.desc.textContent = evoDef.desc;
    updaters.push(() => {
      const done = game.evolved(type);
      const lvls = game.evolveLevels(type);
      const cost = game.evolveCost(type);
      evo.label.textContent = done ? `★ ${evoDef.name}` : `EVOLVE: ${evoDef.name}`;
      if (done) {
        evo.sub.textContent = 'EVOLVED';
        evo.btn.disabled = true;
      } else if (lvls < EVOLVE_LEVELS) {
        evo.sub.textContent = `DMG+RATE LV ${lvls}/${EVOLVE_LEVELS}`;
        evo.btn.disabled = true;
      } else {
        evo.sub.textContent = `${fmt(cost)} G`;
        evo.btn.disabled = game.ownedCount(type) === 0 || game.state.gold < cost;
      }
    });
  }

  function refresh() {
    const s = game.state;
    statGold.textContent = fmt(s.gold);
    statWave.textContent = s.wave;
    statKills.textContent = fmt(s.kills);
    statCores.textContent = fmt(s.cores);

    for (const [id, btn] of tabButtons) {
      if (id === 'core') {
        btn.textContent = 'CORE' + (s.cores ? `·${fmt(s.cores)}` : '');
      } else if (id === 'spawn') {
        btn.textContent = 'SPAWN';
      } else if (id === 'feats') {
        btn.textContent = 'FEATS';
      } else {
        const owned = game.ownedCount(id);
        btn.textContent =
          TURRET_TYPES[id].name + (game.evolved(id) ? '★' : '') + (owned ? `·${owned}` : '');
      }
      btn.classList.toggle('active', id === active);
    }

    for (const u of updaters) u();
  }

  rebuild();
  refresh();
  return { refresh };
}
