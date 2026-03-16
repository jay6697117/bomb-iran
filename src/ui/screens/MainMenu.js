// ============================
// 主菜单 UI
// ============================

export class MainMenu {
  constructor(game, uiManager) {
    this.game = game;
    this.uiManager = uiManager;

    this.el = document.createElement('div');
    this.el.className = 'main-menu fade-in';
    this.el.innerHTML = `
      <div class="game-title">BOMB IRAN</div>
      <div class="game-subtitle">💣 轰炸伊朗 · 卡通街机轰炸 💣</div>
      <div class="menu-buttons">
        <button class="game-btn" id="btn-start">🎮 开始游戏</button>
        <button class="game-btn secondary" id="btn-shop">🛒 升级商店</button>
        <button class="game-btn secondary" id="btn-achievements">🏆 成就</button>
      </div>
    `;
    document.getElementById('ui-container').appendChild(this.el);

    // 按钮事件
    this.el.querySelector('#btn-start').addEventListener('click', () => {
      this.game.audioManager.init();
      this.game.audioManager.play('click');
      this.uiManager.showScreen('levelSelect');
      this.game.setState('level_select');
    });

    this.el.querySelector('#btn-shop').addEventListener('click', () => {
      this.game.audioManager.play('click');
      this.uiManager.showScreen('shop');
      this.game.setState('shop');
    });

    this.el.querySelector('#btn-achievements').addEventListener('click', () => {
      this.game.audioManager.play('click');
      this.uiManager.showScreen('achievements');
      this.game.setState('achievements');
    });
  }
}
