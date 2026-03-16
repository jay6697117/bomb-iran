// ============================
// 游戏 HUD（抬头显示）
// ============================

export class HUD {
  constructor(game) {
    this.game = game;

    this.el = document.createElement('div');
    this.el.className = 'hud screen-hidden';
    this.el.innerHTML = `
      <div class="hud-top-left" id="hud-hp"></div>
      <div class="hud-top-center" id="hud-mission">🎯 摧毁所有目标</div>
      <div class="hud-top-right" id="hud-score">💰 0</div>
      <div class="hud-bottom-left">
        <div class="weapon-slot active" id="hud-bomb">💣 炸弹</div>
        <div class="weapon-slot" id="hud-gun">🔫 机枪</div>
      </div>
      <div class="hud-bottom-right" id="hud-targets">🎯 目标: 0</div>
    `;
    document.getElementById('ui-container').appendChild(this.el);
  }

  update(game) {
    const player = game.player;
    if (!player) return;

    // 生命值
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

    // 武器
    const bombSlot = document.getElementById('hud-bomb');
    const gunSlot = document.getElementById('hud-gun');
    if (bombSlot) bombSlot.className = `weapon-slot ${player.currentWeapon === 'bomb' ? 'active' : ''}`;
    if (gunSlot) gunSlot.className = `weapon-slot ${player.currentWeapon === 'gun' ? 'active' : ''}`;

    // 分数
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = `💰 ${player.stats.targetsDestroyed * 100}`;

    // 目标
    const targetsEl = document.getElementById('hud-targets');
    if (targetsEl && game.combatSystem) {
      targetsEl.textContent = `🎯 目标: ${game.combatSystem.getRemainingTargets()}`;
    }
  }
}
