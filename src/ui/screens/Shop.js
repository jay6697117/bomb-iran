// ============================
// 升级商店 UI
// ============================
import { UPGRADE_CONFIG } from '../../utils/constants.js';
import { LevelManager } from '../../levels/LevelManager.js';

export class Shop {
  constructor(game, uiManager) {
    this.game = game;
    this.uiManager = uiManager;

    this.el = document.createElement('div');
    this.el.className = 'shop-screen screen-hidden fade-in';
    document.getElementById('ui-container').appendChild(this.el);
  }

  render() {
    const save = LevelManager.loadSave();
    const coins = save.coins || 0;
    const upgrades = save.upgrades || {};

    let html = `<h2>🛒 升级商店</h2>
      <div class="shop-coins">💰 ${coins} 金币</div>
      <div class="shop-grid">`;

    for (const [key, config] of Object.entries(UPGRADE_CONFIG)) {
      const level = upgrades[key] || 0;
      const maxed = level >= config.maxLevel;
      const nextCost = maxed ? '-' : config.costs[level + 1] || config.costs[level];
      const canBuy = !maxed && coins >= nextCost;

      // 等级条
      let levelBar = '';
      for (let i = 0; i < config.maxLevel; i++) {
        levelBar += `<span class="${i < level ? 'filled' : ''}"></span>`;
      }

      html += `<div class="shop-item">
        <div class="item-icon">${config.name.split(' ')[0]}</div>
        <div class="item-info">
          <div class="item-name">${config.name.split(' ').slice(1).join(' ')}</div>
          <div class="item-level">Lv.${level} / ${config.maxLevel}</div>
          <div class="item-level-bar">${levelBar}</div>
        </div>
        <button class="game-btn ${canBuy ? '' : 'secondary'}" 
                data-upgrade="${key}" 
                ${!canBuy ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}
                style="padding:8px 16px;font-size:14px">
          ${maxed ? '已满级' : `💰 ${nextCost}`}
        </button>
      </div>`;
    }

    html += `</div>
      <button class="game-btn secondary" id="btn-shop-back" style="margin-top:24px">← 返回</button>`;

    this.el.innerHTML = html;

    // 购买事件
    this.el.querySelectorAll('[data-upgrade]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        this.buyUpgrade(btn.dataset.upgrade);
      });
    });

    // 返回
    this.el.querySelector('#btn-shop-back').addEventListener('click', () => {
      this.game.audioManager.play('click');
      this.uiManager.showScreen('mainMenu');
      this.game.setState('menu');
    });
  }

  buyUpgrade(key) {
    const save = LevelManager.loadSave();
    const config = UPGRADE_CONFIG[key];
    if (!config) return;

    const level = (save.upgrades?.[key]) || 0;
    if (level >= config.maxLevel) return;

    const cost = config.costs[level + 1] || config.costs[level];
    if ((save.coins || 0) < cost) return;

    // 扣除金币，提升等级
    if (!save.upgrades) save.upgrades = {};
    save.upgrades[key] = level + 1;
    save.coins -= cost;

    localStorage.setItem('bomb_iran_save', JSON.stringify(save));
    this.game.audioManager.play('pickup');
    this.render(); // 刷新 UI
  }

  // 显示时刷新
  show() {
    this.render();
  }
}
