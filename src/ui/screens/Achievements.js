// ============================
// 成就页面 UI
// ============================
import { ACHIEVEMENTS } from '../../utils/constants.js';
import { LevelManager } from '../../levels/LevelManager.js';

export class Achievements {
  constructor(game, uiManager) {
    this.game = game;
    this.uiManager = uiManager;

    this.el = document.createElement('div');
    this.el.className = 'achievements-screen screen-hidden fade-in';
    document.getElementById('ui-container').appendChild(this.el);
  }

  render() {
    const save = LevelManager.loadSave();
    const unlocked = save.achievements || [];

    let html = `<button class="game-btn secondary back-btn-top" id="btn-ach-back">← 返回</button>
      <h2>🏆 成就</h2><div class="achievement-list">`;

    for (const ach of ACHIEVEMENTS) {
      const isUnlocked = unlocked.includes(ach.id);
      html += `<div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${isUnlocked ? '🏅' : '🔒'}</div>
        <div class="ach-info">
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
        </div>
        <div class="ach-reward">+${ach.reward}💰</div>
      </div>`;
    }

    html += `</div>
      <div style="margin-top:16px;color:#888;font-size:14px">
        已解锁: ${unlocked.length} / ${ACHIEVEMENTS.length}
      </div>`;

    this.el.innerHTML = html;

    this.el.querySelector('#btn-ach-back').addEventListener('click', () => {
      this.game.audioManager.play('click');
      this.uiManager.showScreen('mainMenu');
      this.game.setState('menu');
    });
  }

  show() {
    this.render();
  }
}
