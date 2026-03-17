// ============================
// 关卡管理器 — 硬核版（战斗机波次、补给空投、防空网）
// ============================
import { LEVEL_DATA } from './LevelData.js';
import { Terrain } from './Terrain.js';
import { Building } from '../entities/Building.js';
import { AntiAir } from '../entities/AntiAir.js';
import { Pickup } from '../entities/Pickup.js';
import { Missile } from '../entities/Missile.js';
import { Boss } from '../entities/Boss.js';
import { EnemyFighter } from '../entities/EnemyFighter.js';
import { RadarStation } from '../entities/RadarStation.js';
import { SAMSite } from '../entities/SAMSite.js';
import { SupplyDrop } from '../entities/SupplyDrop.js';
import { WEAPON_CONFIG, FUEL_CONFIG } from '../utils/constants.js';

export class LevelManager {
  constructor() {
    this.terrain = new Terrain();
    this.currentLevelId = null;
    this.currentLevelData = null;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.isComplete = false;
    this.missileTimer = 0;
    this.missileInterval = 5;  // 导弹发射更频繁
    this.boss = null;

    // 硬核系统
    this.fighterWaveTimer = 0;
    this.fighterWaveIndex = 0;
    this.supplyDropTimer = 0;
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
    this.fighterWaveTimer = 0;
    this.fighterWaveIndex = 0;
    this.supplyDropTimer = 0;
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

    // 放置 SAM 阵地
    if (data.samSites) {
      for (const config of data.samSites) {
        const sam = new SAMSite(game, config);
        game.addEntity(sam);
        if (game.combatSystem) game.combatSystem.registerSAMSite(sam);
      }
    }

    // 放置雷达站
    if (data.radars) {
      for (const config of data.radars) {
        const radar = new RadarStation(game, config);
        game.addEntity(radar);
        if (game.combatSystem) game.combatSystem.registerRadar(radar);
      }
    }

    // 放置道具
    for (const config of data.pickups) {
      const pickup = new Pickup(game, config);
      game.addEntity(pickup);
      if (game.combatSystem) game.combatSystem.registerPickup(pickup);
    }

    // 生成 BOSS
    this.boss = null;
    if (data.boss) {
      this.boss = new Boss(game, data.boss);
      game.addEntity(this.boss);
    }

    // 重置玩家
    if (game.player) {
      game.player.reset(game);

      // 关卡初始弹药和燃料
      if (data.playerStartAmmo) {
        for (const [weapon, amount] of Object.entries(data.playerStartAmmo)) {
          if (game.player.ammo[weapon] !== undefined) {
            game.player.ammo[weapon] = amount;
          }
        }
      }
      if (data.playerStartFuel !== undefined) {
        game.player.fuel = data.playerStartFuel;
      }

      game.sceneManager.scene.add(game.player.mesh);
    }

    console.log(`📍 关卡加载: ${data.name}`);
    return true;
  }

  // 每帧更新
  update(game, deltaTime) {
    // 更新地形（风动画 + 水面 Shader）
    this.terrain.update(deltaTime);

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

    // 战斗机波次生成
    this.updateFighterWaves(game, deltaTime);

    // 补给空投
    this.updateSupplyDrops(game, deltaTime);

    // 检查关卡完成条件
    if (game.combatSystem) {
      const remaining = game.combatSystem.getRemainingTargets();
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

  // === 战斗机波次 ===
  updateFighterWaves(game, deltaTime) {
    const data = this.currentLevelData;
    if (!data.fighterWaves || this.fighterWaveIndex >= data.fighterWaves.length) return;
    if (!game.player || !game.player.isAlive) return;

    this.fighterWaveTimer += deltaTime;
    const wave = data.fighterWaves[this.fighterWaveIndex];

    if (this.fighterWaveTimer >= wave.spawnTime) {
      // 生成这一波战斗机
      for (let i = 0; i < wave.count; i++) {
        const side = Math.random();
        let x, z;
        if (side < 0.5) {
          x = Math.random() > 0.5 ? -45 : 45;
          z = -10 - Math.random() * 30;
        } else {
          x = Math.random() * 80 - 40;
          z = Math.random() > 0.5 ? 5 : -50;
        }

        const fighter = new EnemyFighter(game, { x, z, y: 10 });
        game.addEntity(fighter);
        if (game.combatSystem) game.combatSystem.registerFighter(fighter);
      }

      console.log(`✈️ 战斗机波次 ${this.fighterWaveIndex + 1}: ${wave.count} 架`);
      this.fighterWaveIndex++;
    }
  }

  // === 补给空投 ===
  updateSupplyDrops(game, deltaTime) {
    const data = this.currentLevelData;
    const interval = data.supplyDropInterval || 30;
    if (!game.player || !game.player.isAlive) return;

    this.supplyDropTimer += deltaTime;
    if (this.supplyDropTimer >= interval) {
      this.supplyDropTimer = 0;

      // 在玩家附近随机位置空投
      const px = game.player.mesh.position.x;
      const pz = game.player.mesh.position.z;
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetZ = (Math.random() - 0.5) * 20;

      // 随机补给类型
      const types = ['ammo_crate', 'fuel_tank', 'weapon_kit'];
      const type = types[Math.floor(Math.random() * types.length)];

      const supply = new SupplyDrop(game, {
        x: px + offsetX,
        z: pz + offsetZ,
        type
      });
      game.addEntity(supply);
      game.audioManager.play('supply_drop');

      console.log(`📦 空投补给: ${type}`);
    }
  }

  // 发射跟踪导弹
  launchMissile(game) {
    if (!game.player || !game.player.isAlive) return;

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

    this.saveProgress(result);

    // 检查成就
    if (game.achievementManager) {
      const save = LevelManager.loadSave();
      game.achievementManager.checkAchievements(result, save);
    }

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

    // 计算真实的摧毁率
    const stats = game.player ? game.player.stats : {};
    const data = this.currentLevelData;
    const totalTargets = (data.buildings?.length || 0)
      + (data.antiAirs?.length || 0)
      + (data.samSites?.length || 0)
      + (data.radars?.length || 0);
    const destroyed = stats.targetsDestroyed || 0;
    const destroyRate = totalTargets > 0 ? Math.round((destroyed / totalTargets) * 100) : 0;

    if (game.uiManager) {
      game.uiManager.showResult({
        levelId: this.currentLevelId,
        levelName: data.name,
        grade: 'F', score: 0, coins: 0,
        destroyRate,
        timeUsed: Math.round(this.elapsedTime),
        survived: false,
        isFail: true
      });
    }
  }

  // 计算关卡结果
  calculateResult(game) {
    const stats = game.player ? game.player.stats : {};
    const data = this.currentLevelData;
    const totalTargets = (data.buildings?.length || 0)
      + (data.antiAirs?.length || 0)
      + (data.samSites?.length || 0)
      + (data.radars?.length || 0);
    const destroyed = stats.targetsDestroyed || 0;
    const destroyRate = totalTargets > 0 ? destroyed / totalTargets : 0;
    const survived = game.player ? game.player.isAlive : false;
    const hpRatio = game.player ? game.player.hp / game.player.maxHP : 0;
    const fuelRatio = game.player ? game.player.fuel / game.player.maxFuel : 0;
    const timeUsed = this.elapsedTime;
    const parTime = data.par || 120;

    // 评分计算
    let score = 0;
    score += Math.round(destroyRate * 40);     // 摧毁率 40 分
    score += survived ? 15 : 0;                // 存活 15 分
    score += Math.round(hpRatio * 10);         // 血量比 10 分
    score += Math.round(fuelRatio * 10);       // 燃料比 10 分（硬核加分）
    score += timeUsed < parTime ? 15 : Math.max(0, 15 - Math.floor((timeUsed - parTime) / 10));
    score += Math.min(10, (stats.fightersShot || 0) * 3); // 击落战斗机加分

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
      fuelRemaining: Math.round(fuelRatio * 100),
      stats
    };
  }

  // 保存进度
  saveProgress(result) {
    try {
      const save = JSON.parse(localStorage.getItem('bomb_iran_save') || '{}');
      if (!save.levels) save.levels = {};
      if (!save.coins) save.coins = 0;
      if (!save.totalPlays) save.totalPlays = 0;

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

  // 获取下一关
  getNextLevelId() {
    const ids = Object.keys(LEVEL_DATA);
    const idx = ids.indexOf(this.currentLevelId);
    return idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;
  }

  // 是否解锁（临时解锁所有关卡，调试用）
  static isLevelUnlocked(levelId) {
    // return true; // 临时：解锁所有关卡
    // --- 原逻辑（恢复时取消注释下面的代码，删掉上面的 return true）---
    const ids = Object.keys(LEVEL_DATA);
    const idx = ids.indexOf(levelId);
    if (idx === 0) return true;
    const prevId = ids[idx - 1];
    const save = LevelManager.loadSave();
    return save.levels && save.levels[prevId];
  }
}
