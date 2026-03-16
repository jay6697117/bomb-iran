// ============================
// 游戏主类 - 管理游戏循环和全局状态
// ============================
import { SceneManager } from './SceneManager.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { AssetLoader } from './AssetLoader.js';
import { GAME_STATES } from '../utils/constants.js';

export class Game {
  constructor(canvas) {
    // 核心系统
    this.sceneManager = new SceneManager(canvas);
    this.physicsWorld = new PhysicsWorld();
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();
    this.assetLoader = new AssetLoader();

    // 游戏状态
    this.state = GAME_STATES.MENU;
    this.lastTime = 0;
    this.isRunning = false;
    this.isPaused = false;

    // 游戏数据
    this.currentLevel = null;
    this.player = null;
    this.entities = [];         // 所有活跃的游戏实体
    this.entitiesToRemove = []; // 待移除的实体

    // UI 管理（后续由 UIManager 接管）
    this.uiManager = null;

    // 关卡系统（后续由 LevelManager 接管）
    this.levelManager = null;

    // 战斗系统（后续由 CombatSystem 接管）
    this.combatSystem = null;

    // 注册音效
    this.setupAudio();

    // 首次交互后初始化音频
    const initAudio = () => {
      this.audioManager.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
  }

  setupAudio() {
    this.audioManager.registerSynth('explosion', {
      frequency: 80, frequencyEnd: 20, duration: 0.5, type: 'sawtooth', volume: 0.6
    });
    this.audioManager.registerSynth('bomb_drop', {
      frequency: 400, frequencyEnd: 100, duration: 0.4, type: 'sine', volume: 0.3
    });
    this.audioManager.registerSynth('gun_fire', {
      frequency: 800, frequencyEnd: 400, duration: 0.05, type: 'square', volume: 0.2
    });
    this.audioManager.registerSynth('pickup', {
      frequency: 500, frequencyEnd: 800, duration: 0.2, type: 'sine', volume: 0.4
    });
    this.audioManager.registerSynth('hit', {
      frequency: 200, frequencyEnd: 80, duration: 0.15, type: 'sawtooth', volume: 0.5
    });
    this.audioManager.registerSynth('click', {
      frequency: 600, duration: 0.08, type: 'sine', volume: 0.3
    });
    this.audioManager.registerSynth('achievement', {
      frequency: 600, frequencyEnd: 1200, duration: 0.4, type: 'sine', volume: 0.5
    });
    // 硬核模式新增音效
    this.audioManager.registerSynth('missile_launch', {
      frequency: 300, frequencyEnd: 600, duration: 0.3, type: 'sawtooth', volume: 0.4
    });
    this.audioManager.registerSynth('napalm_drop', {
      frequency: 200, frequencyEnd: 80, duration: 0.6, type: 'sawtooth', volume: 0.35
    });
    this.audioManager.registerSynth('empty_clip', {
      frequency: 400, duration: 0.06, type: 'square', volume: 0.25
    });
    this.audioManager.registerSynth('fuel_low', {
      frequency: 300, frequencyEnd: 100, duration: 0.4, type: 'sine', volume: 0.5
    });
    this.audioManager.registerSynth('supply_drop', {
      frequency: 400, frequencyEnd: 700, duration: 0.3, type: 'sine', volume: 0.35
    });
    this.audioManager.registerSynth('radar_ping', {
      frequency: 1000, duration: 0.1, type: 'sine', volume: 0.2
    });
  }

  // 切换游戏状态
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    console.log(`游戏状态: ${oldState} -> ${newState}`);

    // 暂停/恢复物理
    if (newState === GAME_STATES.PAUSED) {
      this.isPaused = true;
    } else if (oldState === GAME_STATES.PAUSED) {
      this.isPaused = false;
    }
  }

  // 添加游戏实体
  addEntity(entity) {
    this.entities.push(entity);
  }

  // 标记实体为待移除
  removeEntity(entity) {
    if (!this.entitiesToRemove.includes(entity)) {
      this.entitiesToRemove.push(entity);
    }
  }

  // 清除所有实体
  clearEntities() {
    for (const entity of this.entities) {
      if (entity.destroy) {
        entity.destroy(this);
      }
    }
    this.entities = [];
    this.entitiesToRemove = [];
  }

  // 初始化（预加载全部资源）
  async init() {
    await this.assetLoader.preloadAll();
    console.log('🎮 游戏资源初始化完成');
  }

  // 启动游戏循环
  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.sceneManager.renderer.setAnimationLoop((time) => this.gameLoop(time));
  }

  // 游戏主循环
  gameLoop(time) {
    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;

    // 避免首帧或过大的 deltaTime
    if (deltaTime > 0.1 || deltaTime <= 0) return;

    // 根据状态更新
    if (this.state === GAME_STATES.PLAYING && !this.isPaused) {
      // 更新物理
      this.physicsWorld.update(deltaTime);

      // 更新玩家
      if (this.player) {
        this.player.update(this, deltaTime);
      }

      // 更新所有实体
      for (const entity of this.entities) {
        if (entity.update) {
          entity.update(this, deltaTime);
        }
      }

      // 更新战斗系统
      if (this.combatSystem) {
        this.combatSystem.update(this, deltaTime);
      }

      // 更新关卡管理器
      if (this.levelManager) {
        this.levelManager.update(this, deltaTime);
      }

      // 移除标记的实体
      this.processRemovals();

      // 相机跟随
      if (this.player) {
        this.sceneManager.followTarget(this.player.mesh.position);
      }
    }

    // 处理输入（暂停菜单等也需要）
    this.handleGlobalInput();

    // 清除单次按键
    this.inputManager.update();

    // 更新后处理效果
    this.sceneManager.updatePostProcessing(deltaTime);

    // 渲染
    this.sceneManager.render();
  }

  // 处理全局输入
  handleGlobalInput() {
    // ESC 暂停/恢复
    if (this.inputManager.isKeyJustPressed('Escape')) {
      if (this.state === GAME_STATES.PLAYING) {
        this.setState(GAME_STATES.PAUSED);
        if (this.uiManager) this.uiManager.showScreen('pause');
      } else if (this.state === GAME_STATES.PAUSED) {
        this.setState(GAME_STATES.PLAYING);
        if (this.uiManager) this.uiManager.showScreen('hud');
      }
    }
  }

  // 处理实体移除
  processRemovals() {
    for (const entity of this.entitiesToRemove) {
      const idx = this.entities.indexOf(entity);
      if (idx !== -1) {
        this.entities.splice(idx, 1);
      }
      if (entity.destroy) {
        entity.destroy(this);
      }
    }
    this.entitiesToRemove = [];
  }

  // 停止游戏循环
  stop() {
    this.isRunning = false;
    this.sceneManager.renderer.setAnimationLoop(null);
  }
}
