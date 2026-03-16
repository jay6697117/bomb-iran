// ============================
// UI 管理器 - 管理所有 UI 屏幕的切换
// ============================
import { GAME_STATES } from '../utils/constants.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('ui-container');
    this.currentScreen = null;
    this.screens = {};
  }

  // 注册屏幕
  registerScreen(name, screenInstance) {
    this.screens[name] = screenInstance;
  }

  // 显示指定屏幕（隐藏其他）
  showScreen(name) {
    for (const [key, screen] of Object.entries(this.screens)) {
      if (screen.el) {
        screen.el.classList.toggle('screen-hidden', key !== name);
      }
    }
    this.currentScreen = name;
  }

  // 显示结算画面
  showResult(result) {
    if (this.screens.result) {
      this.screens.result.show(result);
    }
    this.showScreen('result');
    this.game.setState(GAME_STATES.RESULT);
  }

  // 显示过场画面
  showCutscene(levelData, onReady) {
    if (this.screens.cutscene) {
      this.screens.cutscene.show(levelData, onReady);
    }
    this.showScreen('cutscene');
    this.game.setState(GAME_STATES.CUTSCENE);
  }

  // 创建 HUD 更新循环
  startHUDUpdate() {
    const update = () => {
      if (this.screens.hud && this.game.state === GAME_STATES.PLAYING) {
        this.screens.hud.update(this.game);
      }
      requestAnimationFrame(update);
    };
    update();
  }
}
