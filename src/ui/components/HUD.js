// ============================
// 游戏 HUD — 硬核版
// 燃料条 + 弹药 + 4武器栏 + 警报
// ============================
import { WEAPON_CONFIG, WEAPONS } from '../../utils/constants.js';

export class HUD {
  constructor(game) {
    this.game = game;

    this.el = document.createElement('div');
    this.el.className = 'hud screen-hidden';
    this.el.innerHTML = `
      <div class="hud-top-left" id="hud-hp"></div>
      <div class="hud-top-center" id="hud-mission">🎯 摧毁所有目标</div>
      <div class="hud-top-right" id="hud-score">💰 0</div>

      <!-- 燃料条 -->
      <div class="hud-fuel-container" id="hud-fuel-container">
        <div class="hud-fuel-label">⛽ 燃料</div>
        <div class="hud-fuel-bar">
          <div class="hud-fuel-fill" id="hud-fuel-fill"></div>
        </div>
        <div class="hud-fuel-text" id="hud-fuel-text">100%</div>
      </div>

      <!-- 武器栏（4格） -->
      <div class="hud-weapons" id="hud-weapons">
        <div class="weapon-slot" id="hud-weapon-bomb" data-key="1">
          <span class="weapon-key">1</span>
          <span class="weapon-icon">💣</span>
          <span class="weapon-ammo" id="ammo-bomb">15</span>
        </div>
        <div class="weapon-slot" id="hud-weapon-gun" data-key="2">
          <span class="weapon-key">2</span>
          <span class="weapon-icon">🔫</span>
          <span class="weapon-ammo" id="ammo-gun">200</span>
        </div>
        <div class="weapon-slot" id="hud-weapon-missile" data-key="3">
          <span class="weapon-key">3</span>
          <span class="weapon-icon">🚀</span>
          <span class="weapon-ammo" id="ammo-missile">4</span>
        </div>
        <div class="weapon-slot" id="hud-weapon-napalm" data-key="4">
          <span class="weapon-key">4</span>
          <span class="weapon-icon">🔥</span>
          <span class="weapon-ammo" id="ammo-napalm">3</span>
        </div>
      </div>

      <div class="hud-bottom-right" id="hud-targets">🎯 目标: 0</div>

      <!-- 警报区域 -->
      <div class="hud-warnings" id="hud-warnings"></div>

      <!-- BOSS 血量条 -->
      <div class="boss-hp-container" id="boss-hp-container" style="display:none">
        <div class="boss-hp-label">⚠️ BOSS</div>
        <div class="boss-hp-bar">
          <div class="boss-hp-fill" id="boss-hp-fill"></div>
        </div>
        <div class="boss-hp-text" id="boss-hp-text">100%</div>
      </div>
    `;
    document.getElementById('ui-container').appendChild(this.el);
  }

  update(game) {
    const player = game.player;
    if (!player) return;

    // === 生命值 ===
    const hpEl = document.getElementById('hud-hp');
    if (hpEl) {
      let hearts = '';
      for (let i = 0; i < player.maxHP; i++) {
        hearts += `<span class="hud-heart ${i < player.hp ? '' : 'lost'}">❤️</span>`;
      }
      if (player.hasShield) hearts += '<span class="hud-heart">🛡️</span>';
      if (player.speedBoostTimer > 0) hearts += '<span class="hud-heart">⚡</span>';
      if (player.hasMegaBomb) hearts += '<span class="hud-heart">💣</span>';
      hpEl.innerHTML = hearts;
    }

    // === 燃料条 ===
    const fuelFill = document.getElementById('hud-fuel-fill');
    const fuelText = document.getElementById('hud-fuel-text');
    if (fuelFill && fuelText) {
      const fuelPercent = Math.max(0, (player.fuel / player.maxFuel) * 100);
      fuelFill.style.width = `${fuelPercent}%`;
      fuelText.textContent = `${Math.round(fuelPercent)}%`;

      // 颜色变化
      if (fuelPercent > 50) {
        fuelFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
      } else if (fuelPercent > 20) {
        fuelFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
      } else {
        fuelFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
      }
    }

    // === 武器栏 ===
    const weaponTypes = [WEAPONS.BOMB, WEAPONS.GUN, WEAPONS.MISSILE, WEAPONS.NAPALM];
    const weaponIds = ['bomb', 'gun', 'missile', 'napalm'];
    for (let i = 0; i < weaponTypes.length; i++) {
      const slot = document.getElementById(`hud-weapon-${weaponIds[i]}`);
      const ammoEl = document.getElementById(`ammo-${weaponIds[i]}`);
      if (slot) {
        slot.className = `weapon-slot ${player.currentWeapon === weaponTypes[i] ? 'active' : ''}`;
        // 弹药为 0 时变暗
        if (player.ammo[weaponTypes[i]] <= 0) {
          slot.classList.add('empty');
        }
      }
      if (ammoEl) {
        ammoEl.textContent = player.ammo[weaponTypes[i]];
      }
    }

    // === 分数 ===
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = `💰 ${player.stats.targetsDestroyed * 100}`;

    // === 目标 ===
    const targetsEl = document.getElementById('hud-targets');
    if (targetsEl && game.combatSystem) {
      const remaining = game.combatSystem.getRemainingTargets();
      const fighters = game.combatSystem.getAliveFighters();
      let text = `🎯 目标: ${remaining}`;
      if (fighters > 0) text += ` | ✈️ 战斗机: ${fighters}`;
      targetsEl.textContent = text;
    }

    // === 警报 ===
    const warningsEl = document.getElementById('hud-warnings');
    if (warningsEl) {
      let warnings = [];
      if (player.warnings.criticalFuel) {
        warnings.push('<span class="warning-critical">⛽ 燃料严重不足！</span>');
      } else if (player.warnings.lowFuel) {
        warnings.push('<span class="warning-low">⛽ 燃料不足</span>');
      }
      if (player.warnings.radarLocked) {
        warnings.push('<span class="warning-radar">📡 已被雷达锁定！</span>');
      }
      if (player.warnings.missileIncoming) {
        warnings.push('<span class="warning-missile">🚀 导弹来袭！</span>');
      }
      if (player.warnings.emptyAmmo) {
        warnings.push('<span class="warning-ammo">📦 弹药耗尽！</span>');
      }
      warningsEl.innerHTML = warnings.join('');
    }

    // === BOSS 血量条 ===
    const bossContainer = document.getElementById('boss-hp-container');
    const boss = game.levelManager?.boss;
    if (boss && boss.isAlive) {
      if (bossContainer) bossContainer.style.display = 'flex';
      const fillEl = document.getElementById('boss-hp-fill');
      const textEl = document.getElementById('boss-hp-text');
      const hpPercent = Math.max(0, boss.hp / boss.maxHp * 100);
      if (fillEl) {
        fillEl.style.width = `${hpPercent}%`;
        if (hpPercent > 60) fillEl.style.background = 'linear-gradient(90deg, #e74c3c, #ff6b35)';
        else if (hpPercent > 30) fillEl.style.background = 'linear-gradient(90deg, #ff6600, #ffaa00)';
        else fillEl.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
      }
      if (textEl) textEl.textContent = `${Math.round(hpPercent)}%`;
    } else {
      if (bossContainer) bossContainer.style.display = 'none';
    }
  }
}
