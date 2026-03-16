// ============================
// 游戏入口 - 完整游戏流程
// ============================
import { Game } from './core/Game.js';
import { Player } from './entities/Player.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { LevelManager } from './levels/LevelManager.js';
import { LEVEL_DATA } from './levels/LevelData.js';

// UI 系统
import { UIManager } from './ui/UIManager.js';
import { MainMenu } from './ui/screens/MainMenu.js';
import { LevelSelect } from './ui/screens/LevelSelect.js';
import { PauseMenu } from './ui/screens/PauseMenu.js';
import { ResultScreen } from './ui/screens/ResultScreen.js';
import { Cutscene } from './ui/screens/Cutscene.js';
import { Shop } from './ui/screens/Shop.js';
import { Achievements } from './ui/screens/Achievements.js';
import { HUD } from './ui/components/HUD.js';

// =============================
// 初始化
// =============================
const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// 战斗系统
const combatSystem = new CombatSystem();
game.combatSystem = combatSystem;

// 关卡管理器
const levelManager = new LevelManager();
game.levelManager = levelManager;

// UI 管理器
const uiManager = new UIManager(game);
game.uiManager = uiManager;

// =============================
// 游戏流程控制
// =============================

// 开始关卡
function startLevel(levelId) {
  const data = LEVEL_DATA[levelId];
  if (!data) return;

  // 显示任务简报
  uiManager.showCutscene(data, () => {
    // 简报结束后正式开始
    launchLevel(levelId);
  });
}

// 正式启动关卡
function launchLevel(levelId) {
  // 创建玩家（如果没有）
  if (!game.player) {
    const player = new Player(game);
    game.player = player;
  }

  // 应用升级
  const save = LevelManager.loadSave();
  if (save.upgrades) {
    game.player.applyUpgrades(save.upgrades);
  }

  // 加载关卡
  levelManager.loadLevel(game, levelId);

  // 切换到游戏状态
  game.setState('playing');
  uiManager.showScreen('hud');
}

// 重新开始当前关卡
function restartLevel() {
  if (levelManager.currentLevelId) {
    startLevel(levelManager.currentLevelId);
  }
}

// 下一关
function nextLevel() {
  const nextId = levelManager.getNextLevelId();
  if (nextId) {
    startLevel(nextId);
    // 刷新关卡选择界面的解锁状态
    if (uiManager.screens.levelSelect) {
      uiManager.screens.levelSelect.refresh();
    }
  } else {
    // 全部通关
    goToMenu();
  }
}

// 返回主菜单
function goToMenu() {
  game.clearEntities();
  game.sceneManager.clearScene();
  game.player = null;
  game.setState('menu');
  uiManager.showScreen('mainMenu');
}

// =============================
// 注册所有 UI 屏幕
// =============================

// 主菜单
const mainMenu = new MainMenu(game, uiManager);
uiManager.registerScreen('mainMenu', mainMenu);

// 关卡选择
const levelSelect = new LevelSelect(game, uiManager, (levelId) => {
  startLevel(levelId);
});
uiManager.registerScreen('levelSelect', levelSelect);

// HUD
const hud = new HUD(game);
uiManager.registerScreen('hud', hud);

// 暂停菜单
const pauseMenu = new PauseMenu(game, uiManager, {
  onRestart: () => restartLevel(),
  onQuit: () => goToMenu()
});
uiManager.registerScreen('pause', pauseMenu);

// 结算屏
const resultScreen = new ResultScreen(game, uiManager, {
  onRestart: () => restartLevel(),
  onNext: () => nextLevel(),
  onQuit: () => goToMenu()
});
uiManager.registerScreen('result', resultScreen);

// 过场动画
const cutscene = new Cutscene(game, uiManager);
uiManager.registerScreen('cutscene', cutscene);

// 商店
const shop = new Shop(game, uiManager);
uiManager.registerScreen('shop', shop);

// 成就
const achievements = new Achievements(game, uiManager);
uiManager.registerScreen('achievements', achievements);

// =============================
// 重覆商店和成就的 showScreen 来触发渲染
// =============================
const originalShowScreen = uiManager.showScreen.bind(uiManager);
uiManager.showScreen = (name) => {
  originalShowScreen(name);
  if (name === 'shop') shop.show();
  if (name === 'achievements') achievements.show();
  if (name === 'levelSelect') levelSelect.refresh();
};

// =============================
// 启动 HUD 更新循环
// =============================
uiManager.startHUDUpdate();

// =============================
// 预加载资源 → 显示主菜单 → 启动渲染循环
// =============================
game.init().then(() => {
  uiManager.showScreen('mainMenu');
  game.start();
});

// 全局暴露便于调试
window.game = game;

console.log('🎮 Bomb Iran 启动成功！');
console.log('🕹️ WASD 移动 | 空格 射击/投弹 | Q 切换武器 | ESC 暂停');
