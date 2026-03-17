// ============================
// 关卡选择 UI
// ============================
import { getChapterLevels } from '../../levels/LevelData.js';
import { LevelManager } from '../../levels/LevelManager.js';

const CHAPTER_NAMES = ['', '🏜️ 沙漠风暴', '🏙️ 城市突袭', '🌊 海岸突击', '⛰️ 山地要塞'];

export class LevelSelect {
  constructor(game, uiManager, onSelectLevel) {
    this.game = game;
    this.uiManager = uiManager;
    this.onSelectLevel = onSelectLevel;

    this.el = document.createElement('div');
    this.el.className = 'level-select screen-hidden fade-in';
    document.getElementById('ui-container').appendChild(this.el);

    this.render();
  }

  render() {
    const save = LevelManager.loadSave();
    // 返回按钮放在左上角
    let html = '<button class="game-btn secondary back-btn-top" id="btn-back-menu">← 返回主菜单</button>';
    html += '<h2>选择关卡</h2>';

    for (let chapter = 1; chapter <= 4; chapter++) {
      const levels = getChapterLevels(chapter);
      html += `<div class="chapter">
        <div class="chapter-title">${CHAPTER_NAMES[chapter]}</div>
        <div class="level-grid">`;

      for (const level of levels) {
        const unlocked = LevelManager.isLevelUnlocked(level.id);
        const record = save.levels?.[level.id];
        const gradeText = record ? record.grade : '';

        html += `<div class="level-card ${unlocked ? '' : 'locked'}" data-level="${level.id}">
          <div class="level-num">${level.id}</div>
          <div style="font-size:12px;color:#aaa;margin-top:4px;">${level.name.replace(/^[^\s]+\s/, '')}</div>
          ${gradeText ? `<div class="level-rating">${gradeText}</div>` : ''}
        </div>`;
      }

      html += '</div></div>';
    }

    this.el.innerHTML = html;

    // 关卡点击
    this.el.querySelectorAll('.level-card:not(.locked)').forEach((card) => {
      card.addEventListener('click', () => {
        const levelId = card.dataset.level;
        this.game.audioManager.play('click');
        if (this.onSelectLevel) this.onSelectLevel(levelId);
      });
    });

    // 返回
    this.el.querySelector('#btn-back-menu').addEventListener('click', () => {
      this.game.audioManager.play('click');
      this.uiManager.showScreen('mainMenu');
      this.game.setState('menu');
    });
  }

  // 刷新（通关后更新解锁状态）
  refresh() {
    this.render();
  }
}
