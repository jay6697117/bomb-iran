// ============================
// 过场动画 / 任务简报 UI
// ============================

export class Cutscene {
  constructor(game, uiManager) {
    this.game = game;

    this.el = document.createElement('div');
    this.el.className = 'cutscene screen-hidden fade-in';
    document.getElementById('ui-container').appendChild(this.el);
  }

  show(levelData, onReady) {
    let countdown = 3;

    this.el.innerHTML = `
      <div class="cutscene-panel game-panel">
        <div class="mission-title">任务简报</div>
        <div class="mission-name">${levelData.name}</div>
        <div class="mission-desc">${levelData.description}</div>
        <div class="mission-objectives">
          <h4>任务目标：</h4>
          <ul>
            ${levelData.objectives.map(o => `<li>${o.desc}</li>`).join('')}
          </ul>
        </div>
        <div class="mission-controls">
          <h4>操作指南：</h4>
          <div class="controls-grid">
            <div class="control-group">
              <div class="control-group-title">🛩️ 飞行控制</div>
              <div class="control-row"><span class="control-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span class="control-desc">方向移动</span></div>
              <div class="control-row"><span class="control-keys"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><span class="control-desc">方向移动</span></div>
            </div>
            <div class="control-group">
              <div class="control-group-title">🔥 战斗操作</div>
              <div class="control-row"><span class="control-keys"><kbd>Space</kbd></span><span class="control-desc">开火 / 投弹</span></div>
              <div class="control-row"><span class="control-keys"><kbd>Q</kbd> / <kbd>E</kbd></span><span class="control-desc">切换武器</span></div>
              <div class="control-row"><span class="control-keys"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd></span><span class="control-desc">💣 炸弹 · 🔫 机枪 · 🚀 导弹 · 🔥 凝固弹</span></div>
            </div>
          </div>
        </div>
        <div id="cutscene-countdown" style="font-size:48px;color:#feca57;font-weight:bold">${countdown}</div>
      </div>
    `;

    // 倒计时
    const timer = setInterval(() => {
      countdown--;
      const el = document.getElementById('cutscene-countdown');
      if (el) {
        if (countdown > 0) {
          el.textContent = countdown;
        } else {
          el.textContent = '出击！';
          clearInterval(timer);
          setTimeout(() => {
            if (onReady) onReady();
          }, 500);
        }
      }
    }, 1000);
  }
}
