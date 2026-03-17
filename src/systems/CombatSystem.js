// ============================
// 战斗系统 — 碰撞检测、伤害计算、实体管理（性能优化：单次遍历 + 移除频繁 filter）
// ============================
import { distanceXZ } from '../utils/helpers.js';

export class CombatSystem {
  constructor() {
    this.buildings = [];
    this.antiAirs = [];
    this.missiles = [];
    this.pickups = [];
    this.fighters = [];   // 敌方战斗机
    this.radars = [];     // 雷达站
    this.samSites = [];   // SAM 阵地

    // 清理计数器 — 每 60 帧清理一次死亡引用，避免每帧 filter
    this._cleanupCounter = 0;
  }

  // 注册实体
  registerBuilding(building) { this.buildings.push(building); }
  registerAntiAir(antiAir) { this.antiAirs.push(antiAir); }
  registerMissile(missile) { this.missiles.push(missile); }
  registerPickup(pickup) { this.pickups.push(pickup); }
  registerFighter(fighter) { this.fighters.push(fighter); }
  registerRadar(radar) { this.radars.push(radar); }
  registerSAMSite(sam) { this.samSites.push(sam); }

  update(game, deltaTime) {
    if (!game.player || !game.player.isAlive) return;

    const playerPos = game.player.mesh.position;

    // === 单次遍历所有实体，按类型分桶处理 ===
    const entities = game.entities;
    for (let i = 0, len = entities.length; i < len; i++) {
      const entity = entities[i];

      // --- 玩家子弹碰撞 ---
      if (entity.constructor.name === 'Bullet' && entity.isActive) {
        this._checkBulletCollisions(entity, game);
        continue;
      }

      // --- 爆炸伤害检测 ---
      if (entity.constructor.name === 'Explosion' && entity.lifetime < 0.1) {
        this._checkExplosionDamage(entity, game);
        continue;
      }

      // --- 敌方子弹/导弹 vs 玩家 ---
      if ((entity.type === 'enemy_bullet' || entity.type === 'boss_missile') && game.player) {
        const dist = entity.mesh.position.distanceTo(playerPos);
        if (dist < 1.5) {
          game.player.takeDamage(game, entity.damage || 1);
          game.removeEntity(entity);
        }
      }
    }

    // === 延迟清理已摧毁的实体引用（每 60 帧一次，避免每帧 filter） ===
    this._cleanupCounter++;
    if (this._cleanupCounter >= 60) {
      this._cleanupCounter = 0;
      this._cleanupDeadRefs();
    }
  }

  // 子弹碰撞检测（内联方法，减少一层函数调用外的重复遍历）
  _checkBulletCollisions(entity, game) {
    // 子弹 vs 建筑
    for (let i = 0, len = this.buildings.length; i < len; i++) {
      const building = this.buildings[i];
      if (building.isDestroyed) continue;
      const dist = entity.mesh.position.distanceTo(building.mesh.position);
      if (dist < building.width) {
        building.takeDamage(game, entity.damage);
        entity.isActive = false;
        game.removeEntity(entity);
        return;
      }
    }

    // 子弹 vs 防空炮
    for (let i = 0, len = this.antiAirs.length; i < len; i++) {
      const aa = this.antiAirs[i];
      if (aa.isDestroyed) continue;
      const dist = entity.mesh.position.distanceTo(aa.mesh.position);
      if (dist < 1.5) {
        aa.takeDamage(game, entity.damage);
        entity.isActive = false;
        game.removeEntity(entity);
        return;
      }
    }

    // 子弹 vs SAM 阵地
    for (let i = 0, len = this.samSites.length; i < len; i++) {
      const sam = this.samSites[i];
      if (sam.isDestroyed) continue;
      const dist = entity.mesh.position.distanceTo(sam.mesh.position);
      if (dist < 2) {
        sam.takeDamage(game, entity.damage);
        entity.isActive = false;
        game.removeEntity(entity);
        return;
      }
    }

    // 子弹 vs 雷达站
    for (let i = 0, len = this.radars.length; i < len; i++) {
      const radar = this.radars[i];
      if (radar.isDestroyed) continue;
      const dist = entity.mesh.position.distanceTo(radar.mesh.position);
      if (dist < 1.5) {
        radar.takeDamage(game, entity.damage);
        entity.isActive = false;
        game.removeEntity(entity);
        return;
      }
    }

    // 子弹 vs 敌方战斗机
    for (let i = 0, len = this.fighters.length; i < len; i++) {
      const fighter = this.fighters[i];
      if (!fighter.isAlive) continue;
      const dist = entity.mesh.position.distanceTo(fighter.mesh.position);
      if (dist < 2) {
        fighter.takeDamage(game, entity.damage);
        entity.isActive = false;
        game.removeEntity(entity);
        return;
      }
    }

    // 子弹 vs BOSS
    const boss = game.levelManager?.boss;
    if (boss && boss.isAlive) {
      const dist = entity.mesh.position.distanceTo(boss.mesh.position);
      if (dist < 5) {
        boss.takeDamage(game, entity.damage);
        entity.isActive = false;
        game.removeEntity(entity);
      }
    }
  }

  // 爆炸伤害检测
  _checkExplosionDamage(entity, game) {
    const pos = entity.position;
    const radius = entity.radius;

    // 爆炸 vs 建筑
    for (let i = 0, len = this.buildings.length; i < len; i++) {
      const building = this.buildings[i];
      if (building.isDestroyed) continue;
      const dist = distanceXZ(pos, building.mesh.position);
      if (dist < radius + building.width / 2) {
        building.takeDamage(game, 10);
      }
    }

    // 爆炸 vs 防空炮
    for (let i = 0, len = this.antiAirs.length; i < len; i++) {
      const aa = this.antiAirs[i];
      if (aa.isDestroyed) continue;
      const dist = distanceXZ(pos, aa.mesh.position);
      if (dist < radius + 1) {
        aa.takeDamage(game, 5);
      }
    }

    // 爆炸 vs SAM
    for (let i = 0, len = this.samSites.length; i < len; i++) {
      const sam = this.samSites[i];
      if (sam.isDestroyed) continue;
      const dist = distanceXZ(pos, sam.mesh.position);
      if (dist < radius + 1.5) {
        sam.takeDamage(game, 8);
      }
    }

    // 爆炸 vs 雷达
    for (let i = 0, len = this.radars.length; i < len; i++) {
      const radar = this.radars[i];
      if (radar.isDestroyed) continue;
      const dist = distanceXZ(pos, radar.mesh.position);
      if (dist < radius + 1.5) {
        radar.takeDamage(game, 6);
      }
    }

    // 爆炸 vs BOSS
    const boss = game.levelManager?.boss;
    if (boss && boss.isAlive) {
      const dist = distanceXZ(pos, boss.mesh.position);
      if (dist < radius + 5) {
        boss.takeDamage(game, 15);
      }
    }
  }

  // 延迟清理死亡引用（替代每帧 filter）
  _cleanupDeadRefs() {
    this.buildings = this.buildings.filter(b => !b.isDestroyed);
    this.antiAirs = this.antiAirs.filter(a => !a.isDestroyed);
    this.pickups = this.pickups.filter(p => !p.isCollected);
    this.fighters = this.fighters.filter(f => f.isAlive);
    this.radars = this.radars.filter(r => !r.isDestroyed);
    this.samSites = this.samSites.filter(s => !s.isDestroyed);
  }

  // 获取剩余目标数（用于关卡完成检测）
  getRemainingTargets() {
    return this.buildings.filter(b => b.isTarget && !b.isDestroyed).length
      + this.antiAirs.filter(a => !a.isDestroyed).length
      + this.samSites.filter(s => !s.isDestroyed).length
      + this.radars.filter(r => !r.isDestroyed).length;
  }

  // 获取总目标数
  getTotalTargets() {
    return this.buildings.length + this.antiAirs.length
      + this.samSites.length + this.radars.length;
  }

  // 获取存活战斗机数
  getAliveFighters() {
    return this.fighters.filter(f => f.isAlive).length;
  }

  // 重置
  clear() {
    this.buildings = [];
    this.antiAirs = [];
    this.missiles = [];
    this.pickups = [];
    this.fighters = [];
    this.radars = [];
    this.samSites = [];
    this._cleanupCounter = 0;
  }
}
