// ============================
// 战斗系统 - 碰撞检测、伤害计算、实体管理
// ============================
import { distanceXZ } from '../utils/helpers.js';

export class CombatSystem {
  constructor() {
    this.buildings = [];
    this.antiAirs = [];
    this.missiles = [];
    this.pickups = [];
  }

  // 注册实体
  registerBuilding(building) { this.buildings.push(building); }
  registerAntiAir(antiAir) { this.antiAirs.push(antiAir); }
  registerMissile(missile) { this.missiles.push(missile); }
  registerPickup(pickup) { this.pickups.push(pickup); }

  update(game, deltaTime) {
    if (!game.player || !game.player.isAlive) return;

    const playerPos = game.player.mesh.position;

    // 炸弹与建筑碰撞检测
    for (const entity of game.entities) {
      if (entity.constructor.name === 'Bomb' && entity.hasExploded) {
        // 炸弹已爆炸，检测爆炸范围内的建筑
        // （由爆炸冲击力处理）
      }

      // 子弹命中检测
      if (entity.constructor.name === 'Bullet' && entity.isActive) {
        // 子弹 vs 建筑
        for (const building of this.buildings) {
          if (building.isDestroyed) continue;
          const dist = entity.mesh.position.distanceTo(building.mesh.position);
          if (dist < building.width) {
            building.takeDamage(game, entity.damage);
            entity.isActive = false;
            game.removeEntity(entity);
            break;
          }
        }

        // 子弹 vs 防空炮
        for (const aa of this.antiAirs) {
          if (aa.isDestroyed) continue;
          const dist = entity.mesh.position.distanceTo(aa.mesh.position);
          if (dist < 1.5) {
            aa.takeDamage(game, entity.damage);
            entity.isActive = false;
            game.removeEntity(entity);
            break;
          }
        }
      }
    }

    // 爆炸伤害检测（基于爆炸实体的范围）
    for (const entity of game.entities) {
      if (entity.constructor.name === 'Explosion' && entity.lifetime < 0.1) {
        const pos = entity.position;
        const radius = entity.radius;

        // 爆炸 vs 建筑
        for (const building of this.buildings) {
          if (building.isDestroyed) continue;
          const dist = distanceXZ(pos, building.mesh.position);
          if (dist < radius + building.width / 2) {
            building.takeDamage(game, 10);
          }
        }

        // 爆炸 vs 防空炮
        for (const aa of this.antiAirs) {
          if (aa.isDestroyed) continue;
          const dist = distanceXZ(pos, aa.mesh.position);
          if (dist < radius + 1) {
            aa.takeDamage(game, 5);
          }
        }
      }
    }

    // 清理已摧毁的实体引用
    this.buildings = this.buildings.filter(b => !b.isDestroyed);
    this.antiAirs = this.antiAirs.filter(a => !a.isDestroyed);
    this.pickups = this.pickups.filter(p => !p.isCollected);
  }

  // 获取剩余目标数
  getRemainingTargets() {
    return this.buildings.filter(b => b.isTarget && !b.isDestroyed).length
      + this.antiAirs.filter(a => !a.isDestroyed).length;
  }

  // 获取总目标数
  getTotalTargets() {
    return this.buildings.length + this.antiAirs.length;
  }

  // 重置
  clear() {
    this.buildings = [];
    this.antiAirs = [];
    this.missiles = [];
    this.pickups = [];
  }
}
