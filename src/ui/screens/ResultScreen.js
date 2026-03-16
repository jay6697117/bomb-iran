// ============================
// 关卡结算 UI
// ============================

export class ResultScreen {
  constructor(game, uiManager, callbacks) {
    this.game = game;
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'result-screen screen-hidden fade-in';
    document.getElementById('ui-container').appendChild(this.el);
  }

  show(result) {
    const gradeClass = `grade-${result.grade}`;
    this.el.innerHTML = `
      <div class="result-panel game-panel">
        <div class="result-grade ${gradeClass}">${result.grade}</div>
        <h3 style="margin-bottom:16px;color:#ccc">${result.levelName || '关卡完成'}</h3>
        <div class="result-stats">
          <div class="stat-row"><span>摧毁率</span><span>${result.destroyRate}%</span></div>
          <div class="stat-row"><span>用时</span><span>${result.timeUsed}s</span></div>
          <div class="stat-row"><span>存活</span><span>${result.survived ? '✅ 是' : '❌ 否'}</span></div>
          <div class="stat-row"><span>综合评分</span><span>${result.score}</span></div>
        </div>
        <div class="result-coins">+${result.coins} 💰</div>
        <div class="result-buttons">
          <button class="game-btn secondary" id="btn-result-retry">🔄 重试</button>
          ${result.grade !== 'F' ? '<button class="game-btn" id="btn-result-next">➡️ 下一关</button>' : ''}
          <button class="game-btn secondary" id="btn-result-menu">🏠 菜单</button>
        </div>
      </div>
    `;

    this.el.querySelector('#btn-result-retry')?.addEventListener('click', () => {
      this.game.audioManager.play('click');
      if (this.callbacks.onRestart) this.callbacks.onRestart();
    });

    this.el.querySelector('#btn-result-next')?.addEventListener('click', () => {
      this.game.audioManager.play('click');
      if (this.callbacks.onNext) this.callbacks.onNext();
    });

    this.el.querySelector('#btn-result-menu')?.addEventListener('click', () => {
      this.game.audioManager.play('click');
      if (this.callbacks.onQuit) this.callbacks.onQuit();
    });
  }
}
