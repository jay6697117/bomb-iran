// ============================
// 暂停菜单 UI
// ============================

export class PauseMenu {
  constructor(game, uiManager, callbacks) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'pause-overlay screen-hidden fade-in';
    this.el.innerHTML = `
      <div class="pause-menu">
        <h2>⏸️ 游戏暂停</h2>
        <div class="menu-buttons">
          <button class="game-btn" id="btn-resume">▶ 继续游戏</button>
          <button class="game-btn secondary" id="btn-restart">🔄 重新开始</button>
          <button class="game-btn secondary" id="btn-quit">🏠 返回主菜单</button>
        </div>
      </div>
    `;
    document.getElementById('ui-container').appendChild(this.el);

    this.el.querySelector('#btn-resume').addEventListener('click', () => {
      game.audioManager.play('click');
      game.setState('playing');
      uiManager.showScreen('hud');
    });

    this.el.querySelector('#btn-restart').addEventListener('click', () => {
      game.audioManager.play('click');
      if (callbacks.onRestart) callbacks.onRestart();
    });

    this.el.querySelector('#btn-quit').addEventListener('click', () => {
      game.audioManager.play('click');
      if (callbacks.onQuit) callbacks.onQuit();
    });
  }
}
