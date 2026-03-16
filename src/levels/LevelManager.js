// ============================
// 关卡管理器 - 加载/切换/完成关卡
// ============================
import { LEVEL_DATA } from './LevelData.js';
import { Terrain } from './Terrain.js';
import { Building } from '../entities/Building.js';
import { AntiAir } from '../entities/AntiAir.js';
import { Pickup } from '../entities/Pickup.js';
import { Missile } from '../entities/Missile.js';
import { Boss } from '../entities/Boss.js';

export class LevelManager {
  constructor() {
    this.terrain = new Terrain();
    this.currentLevelId = null;
    this.currentLevelData = null;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.isComplete = false;
    this.missileTimer = 0;
    this.missileInterval = 8;
    this.boss = null; // BOSS 实体引用
  }

  // 加载关卡
  loadLevel(game, levelId) {
    const data = LEVEL_DATA[levelId];
    if (!data) {
      console.error(`关卡 ${levelId} 不存在`);
      return false;
    }

    this.currentLevelId = levelId;
    this.currentLevelData = data;
    this.isComplete = false;
    this.missileTimer = 0;
    this.startTime = performance.now();

    // 清除旧内容
    game.clearEntities();
    game.physicsWorld.clear();
    if (game.combatSystem) game.combatSystem.clear();

    // 生成地形
    this.terrain.generate(game, data.theme);

    // 放置建筑
    for (const config of data.buildings) {
      const building = new Building(game, config);
      game.addEntity(building);
      if (game.combatSystem) game.combatSystem.registerBuilding(building);
    }

    // 放置防空炮
    for (const config of data.antiAirs) {
      const aa = new AntiAir(game, config);
      game.addEntity(aa);
      if (game.combatSystem) game.combatSystem.registerAntiAir(aa);
    }

    // 放置道具
    for (const config of data.pickups) {
      const pickup = new Pickup(game, config);
      game.addEntity(pickup);
      if (game.combatSystem) game.combatSystem.registerPickup(pickup);
    }

    // 生成 BOSS（如果关卡配置中有）
    this.boss = null;
    if (data.boss) {
      this.boss = new Boss(game, data.boss);
      game.addEntity(this.boss);
    }

    // 重置玩家
    if (game.player) {
      game.player.reset(game);
      game.sceneManager.scene.add(game.player.mesh);
    }

    console.log(`📍 关卡加载: ${data.name}`);
    return true;
  }

  // 每帧更新
  update(game, deltaTime) {
    if (this.isComplete || !this.currentLevelData) return;

    this.elapsedTime = (performance.now() - this.startTime) / 1000;

    // 导弹发射逻辑
    if (this.currentLevelData.missiles && game.player && game.player.isAlive) {
      this.missileTimer += deltaTime;
      if (this.missileTimer >= this.missileInterval) {
        this.missileTimer = 0;
        this.launchMissile(game);
      }
    }

    // 检查关卡完成条件
    if (game.combatSystem) {
      const remaining = game.combatSystem.getRemainingTargets();
      // 如果有 BOSS，需要同时击败 BOSS
      const bossAlive = this.boss && this.boss.isAlive;
      if (remaining === 0 && !bossAlive) {
        this.completeLevel(game);
      }
    }

    // 检查玩家死亡
    if (game.player && !game.player.isAlive) {
      this.failLevel(game);
    }
  }

  // 发射跟踪导弹
  launchMissile(game) {
    if (!game.player || !game.player.isAlive) return;

    // 从随机边缘发射
    const side = Math.random();
    let x, z;
    if (side < 0.25) { x = -40; z = Math.random() * -40; }
    else if (side < 0.5) { x = 40; z = Math.random() * -40; }
    else if (side < 0.75) { x = Math.random() * 80 - 40; z = 5; }
    else { x = Math.random() * 80 - 40; z = -45; }

    const missile = new Missile(
      game,
      { x, y: 10, z, clone: () => ({ x, y: 10, z }), copy: function(v) { this.x=v.x; this.y=v.y; this.z=v.z; return this; } },
      game.player
    );
    game.addEntity(missile);
  }

  // 关卡完成
  completeLevel(game) {
    if (this.isComplete) return;
    this.isComplete = true;

    const result = this.calculateResult(game);
    console.log(`🎉 关卡完成！评级: ${result.grade} | 分数: ${result.score}`);

    // 保存进度
    this.saveProgress(result);

    // 通知 UI
    if (game.uiManager) {
      game.uiManager.showResult(result);
    }

    return result;
  }

  // 关卡失败
  failLevel(game) {
    if (this.isComplete) return;
    this.isComplete = true;
    console.log('💀 关卡失败！');

    if (game.uiManager) {
      game.uiManager.showResult({
        levelId: this.currentLevelId,
        grade: 'F', score: 0, coins: 0,
        destroyRate: 0, timeUsed: this.elapsedTime, survived: false
      });
    }
  }

  // 计算关卡结果
  calculateResult(game) {
    const stats = game.player ? game.player.stats : {};
    const data = this.currentLevelData;
    const totalTargets = (data.buildings?.length || 0) + (data.antiAirs?.length || 0);
    const destroyed = stats.targetsDestroyed || 0;
    const destroyRate = totalTargets > 0 ? destroyed / totalTargets : 0;
    const survived = game.player ? game.player.isAlive : false;
    const hpRatio = game.player ? game.player.hp / game.player.maxHP : 0;
    const timeUsed = this.elapsedTime;
    const parTime = data.par || 120;

    // 评分计算
    let score = 0;
    score += Math.round(destroyRate * 50);     // 摧毁率 50 分
    score += survived ? 20 : 0;                // 存活 20 分
    score += Math.round(hpRatio * 15);         // 血量比 15 分
    score += timeUsed < parTime ? 15 : Math.max(0, 15 - Math.floor((timeUsed - parTime) / 10)); // 时间 15 分

    // 评级
    let grade = 'C';
    if (score >= 90) grade = 'S';
    else if (score >= 75) grade = 'A';
    else if (score >= 50) grade = 'B';

    // 金币
    const coins = Math.round(score * 5) + (grade === 'S' ? 200 : grade === 'A' ? 100 : 50);

    return {
      levelId: this.currentLevelId,
      levelName: data.name,
      grade, score, coins,
      destroyRate: Math.round(destroyRate * 100),
      timeUsed: Math.round(timeUsed),
      survived, hpRatio: Math.round(hpRatio * 100),
      stats
    };
  }

  // 保存进度到 LocalStorage
  saveProgress(result) {
    try {
      const save = JSON.parse(localStorage.getItem('bomb_iran_save') || '{}');
      if (!save.levels) save.levels = {};
      if (!save.coins) save.coins = 0;
      if (!save.totalPlays) save.totalPlays = 0;

      // 更新最佳记录
      const prev = save.levels[result.levelId];
      if (!prev || result.score > prev.score) {
        save.levels[result.levelId] = {
          grade: result.grade,
          score: result.score,
          coins: result.coins,
          time: result.timeUsed
        };
      }

      save.coins += result.coins;
      save.totalPlays++;

      localStorage.setItem('bomb_iran_save', JSON.stringify(save));
    } catch (e) {
      console.warn('保存进度失败', e);
    }
  }

  // 读取保存数据
  static loadSave() {
    try {
      return JSON.parse(localStorage.getItem('bomb_iran_save') || '{}');
    } catch {
      return {};
    }
  }

  // 获取下一关 ID
  getNextLevelId() {
    const ids = Object.keys(LEVEL_DATA);
    const idx = ids.indexOf(this.currentLevelId);
    return idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;
  }

  // 是否解锁某关卡（前一关通过即解锁）
  static isLevelUnlocked(levelId) {
    const ids = Object.keys(LEVEL_DATA);
    const idx = ids.indexOf(levelId);
    if (idx === 0) return true; // 第一关总是解锁

    const prevId = ids[idx - 1];
    const save = LevelManager.loadSave();
    return save.levels && save.levels[prevId];
  }
}
