// ============================
// 战斗系统 — 碰撞检测、伤害计算、实体管理（硬核版）
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

    // === 子弹命中检测 ===
    for (const entity of game.entities) {
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
        if (entity.isActive) {
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

        // 子弹 vs SAM 阵地
        if (entity.isActive) {
          for (const sam of this.samSites) {
            if (sam.isDestroyed) continue;
            const dist = entity.mesh.position.distanceTo(sam.mesh.position);
            if (dist < 2) {
              sam.takeDamage(game, entity.damage);
              entity.isActive = false;
              game.removeEntity(entity);
              break;
            }
          }
        }

        // 子弹 vs 雷达站
        if (entity.isActive) {
          for (const radar of this.radars) {
            if (radar.isDestroyed) continue;
            const dist = entity.mesh.position.distanceTo(radar.mesh.position);
            if (dist < 1.5) {
              radar.takeDamage(game, entity.damage);
              entity.isActive = false;
              game.removeEntity(entity);
              break;
            }
          }
        }

        // 子弹 vs 敌方战斗机
        if (entity.isActive) {
          for (const fighter of this.fighters) {
            if (!fighter.isAlive) continue;
            const dist = entity.mesh.position.distanceTo(fighter.mesh.position);
            if (dist < 2) {
              fighter.takeDamage(game, entity.damage);
              entity.isActive = false;
              game.removeEntity(entity);
              break;
            }
          }
        }

        // 子弹 vs BOSS
        if (entity.isActive) {
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
      }
    }

    // === 爆炸伤害检测 ===
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

        // 爆炸 vs SAM
        for (const sam of this.samSites) {
          if (sam.isDestroyed) continue;
          const dist = distanceXZ(pos, sam.mesh.position);
          if (dist < radius + 1.5) {
            sam.takeDamage(game, 8);
          }
        }

        // 爆炸 vs 雷达
        for (const radar of this.radars) {
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
    }

    // === 敌方子弹/导弹 vs 玩家 ===
    for (const entity of game.entities) {
      if ((entity.type === 'enemy_bullet' || entity.type === 'boss_missile') && game.player) {
        const dist = entity.mesh.position.distanceTo(playerPos);
        if (dist < 1.5) {
          game.player.takeDamage(game, entity.damage || 1);
          game.removeEntity(entity);
        }
      }
    }

    // === 清理已摧毁的实体引用 ===
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
  }
}
