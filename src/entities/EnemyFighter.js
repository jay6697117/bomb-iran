// ============================
// 敌方战斗机 — AI 巡逻、拦截、攻击、脱离（性能优化：共享资源 + Vector3 复用）
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { ENEMY_CONFIG, COLORS } from '../utils/constants.js';

// AI 状态
const FIGHTER_STATE = {
  PATROL: 'patrol',
  INTERCEPT: 'intercept',
  ATTACK: 'attack',
  DISENGAGE: 'disengage'
};

// 模块级共享资源 — 所有敌方子弹复用
const _sharedEnemyBulletGeo = new THREE.SphereGeometry(0.1, 4, 3);
const _sharedEnemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

// 预分配临时向量 — 避免每帧 GC
const _tmpVec3A = new THREE.Vector3();
const _tmpVec3B = new THREE.Vector3();

export class EnemyFighter {
  constructor(game, config = {}) {
    const enemyConf = ENEMY_CONFIG.fighter;
    const { x = -40, z = -20, y = 10 } = config;

    this.hp = enemyConf.hp;
    this.maxHp = enemyConf.hp;
    this.speed = enemyConf.speed;
    this.turnRate = enemyConf.turnRate;
    this.fireRate = enemyConf.fireRate;
    this.damage = enemyConf.damage;
    this.attackRange = enemyConf.attackRange;
    this.detectionRange = enemyConf.detectionRange;
    this.bulletSpeed = enemyConf.bulletSpeed;
    this.scoreValue = enemyConf.scoreValue;

    this.isAlive = true;
    this.state = FIGHTER_STATE.PATROL;
    this.fireTimer = 0;
    this.stateTimer = 0;
    this.type = 'enemy_fighter';

    // 巡逻参数
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.patrolRadius = 35 + Math.random() * 10;
    this.patrolCenter = new THREE.Vector3(0, 0, -20);

    // 脱离参数
    this.disengageDirection = new THREE.Vector3();

    // 创建战斗机模型（从 AssetLoader 获取）
    this.mesh = this.createFighterModel(game);
    this.mesh.position.set(x, y, z);
    game.sceneManager.scene.add(this.mesh);

    // 当前飞行方向
    this.direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
  }

  createFighterModel(game) {
    // 从 AssetLoader 获取预加载的 GLTF 模型
    const group = game.assetLoader.getModel('enemy_fighter');

    // clone 后 userData 引用指向原始对象，需要重新查找
    this.engine = null;
    this.engine2 = null;

    // 尝试查找 ConeGeometry 作为引擎火焰
    const cones = [];
    group.traverse((child) => {
      if (child.isMesh && child.geometry && child.geometry.type === 'ConeGeometry') {
        cones.push(child);
      }
    });

    if (cones.length >= 2) {
      this.engine = cones[cones.length - 2];
      this.engine2 = cones[cones.length - 1];
    } else if (cones.length === 1) {
      this.engine = cones[0];
    }

    // 兜底：无论如何都保证 engine 存在且有可操作的 material
    if (!this.engine) {
      const engineGeo = new THREE.ConeGeometry(0.08, 0.35, 5);
      const engineMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
      this.engine = new THREE.Mesh(engineGeo, engineMat);
      this.engine.rotation.x = -Math.PI / 2;
      this.engine.position.set(0, 0, 1.1);
      group.add(this.engine);
    }

    // 确保 engine 的 material 有 color 属性（GLTF 材质可能不兼容）
    this._ensureEngineMaterial(this.engine);
    if (this.engine2) {
      this._ensureEngineMaterial(this.engine2);
    }

    // [新增] 为普通战机模型也叠加烤漆或金属漆质感
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        // 如果是玻璃或黑色涂装部件，分别处理
        if (child.material.name && child.material.name.toLowerCase().includes('glass')) {
           child.material.metalness = 0.5;
           child.material.roughness = 0.1;
           child.material.transmission = 0.8;
           child.material.transparent = true;
        } else {
           child.material.metalness = 0.4;
           child.material.roughness = 0.3;
           child.material.envMapIntensity = 1.0;
        }
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  // 确保引擎 mesh 的 material 具有可操作的 color 属性
  _ensureEngineMaterial(engineMesh) {
    if (!engineMesh || !engineMesh.material || !engineMesh.material.color) {
      engineMesh.material = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
    }
  }

  update(game, deltaTime) {
    if (!this.isAlive) return;

    this.stateTimer += deltaTime;
    this.fireTimer += deltaTime;

    const player = game.player;
    const playerAlive = player && player.isAlive;
    const playerPos = playerAlive ? player.mesh.position : null;
    const distToPlayer = playerPos
      ? this.mesh.position.distanceTo(playerPos)
      : Infinity;

    // AI 状态机
    switch (this.state) {
      case FIGHTER_STATE.PATROL:
        this.updatePatrol(deltaTime);
        // 发现玩家 → 拦截
        if (playerAlive && distToPlayer < this.detectionRange) {
          this.changeState(FIGHTER_STATE.INTERCEPT);
        }
        break;

      case FIGHTER_STATE.INTERCEPT:
        this.updateIntercept(playerPos, deltaTime);
        // 进入攻击范围 → 攻击
        if (distToPlayer < this.attackRange) {
          this.changeState(FIGHTER_STATE.ATTACK);
        }
        // 玩家死亡 → 巡逻
        if (!playerAlive) {
          this.changeState(FIGHTER_STATE.PATROL);
        }
        break;

      case FIGHTER_STATE.ATTACK:
        this.updateAttack(game, playerPos, distToPlayer, deltaTime);
        // 攻击 2 秒后脱离
        if (this.stateTimer > 2) {
          this.changeState(FIGHTER_STATE.DISENGAGE);
        }
        if (!playerAlive) {
          this.changeState(FIGHTER_STATE.PATROL);
        }
        break;

      case FIGHTER_STATE.DISENGAGE:
        this.updateDisengage(deltaTime);
        // 脱离 3 秒后重新拦截
        if (this.stateTimer > 3) {
          this.changeState(playerAlive ? FIGHTER_STATE.INTERCEPT : FIGHTER_STATE.PATROL);
        }
        break;
    }

    // 移动
    this.mesh.position.addScaledVector(this.direction, this.speed * deltaTime);

    // 保持飞行高度
    this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 10, deltaTime);

    // 边界限制（复用临时向量替代 new Vector3）
    if (Math.abs(this.mesh.position.x) > 55 || Math.abs(this.mesh.position.z) > 55) {
      _tmpVec3A.set(-this.mesh.position.x, 0, -this.mesh.position.z).normalize();
      this.direction.lerp(_tmpVec3A, 3 * deltaTime);
      this.direction.normalize();
    }

    // 朝向运动方向（复用临时向量）
    _tmpVec3A.copy(this.mesh.position).add(this.direction);
    this.mesh.lookAt(_tmpVec3A);

    // 机翼倾斜（简化计算，避免创建新 Vector3）
    this.mesh.rotation.z = 0;

    // 引擎喷口闪烁（安全检查）
    if (this.engine && this.engine.material && this.engine.material.color) {
      this.engine.material.color.setHex(
        Math.random() > 0.5 ? 0xff6b35 : 0xff4500
      );
      this.engine.scale.y = 0.8 + Math.random() * 0.4;
    }
  }

  changeState(newState) {
    this.state = newState;
    this.stateTimer = 0;

    if (newState === FIGHTER_STATE.DISENGAGE) {
      // 选择一个远离玩家的随机方向
      this.disengageDirection.set(
        Math.random() - 0.5,
        0.2,
        Math.random() > 0.5 ? 1 : -1
      ).normalize();
    }
  }

  // 巡逻：绕圈飞行（复用临时向量）
  updatePatrol(deltaTime) {
    this.patrolAngle += deltaTime * 0.5;
    const targetX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
    const targetZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
    _tmpVec3A.set(targetX, 10, targetZ).sub(this.mesh.position).normalize();
    this.direction.lerp(_tmpVec3A, this.turnRate * deltaTime);
    this.direction.y = 0;
    this.direction.normalize();
  }

  // 拦截：全速冲向玩家（复用临时向量）
  updateIntercept(playerPos, deltaTime) {
    if (!playerPos) return;
    _tmpVec3A.subVectors(playerPos, this.mesh.position).normalize();
    _tmpVec3A.y = 0; // 保持水平追踪
    this.direction.lerp(_tmpVec3A, this.turnRate * 1.5 * deltaTime);
    this.direction.normalize();
  }

  // 攻击：朝向玩家并射击（复用临时向量）
  updateAttack(game, playerPos, distToPlayer, deltaTime) {
    if (!playerPos) return;

    _tmpVec3A.subVectors(playerPos, this.mesh.position).normalize();
    _tmpVec3A.y = 0;
    this.direction.lerp(_tmpVec3A, this.turnRate * deltaTime);
    this.direction.normalize();

    // 射击
    if (this.fireTimer >= this.fireRate && distToPlayer < this.attackRange) {
      this.fireTimer = 0;
      this.fire(game, playerPos);
    }
  }

  // 脱离：飞离
  updateDisengage(deltaTime) {
    this.direction.lerp(this.disengageDirection, this.turnRate * deltaTime);
    this.direction.normalize();
  }

  // 射击 — 共享 Geometry/Material
  fire(game, targetPos) {
    const bullet = new THREE.Mesh(_sharedEnemyBulletGeo, _sharedEnemyBulletMat);
    bullet.position.copy(this.mesh.position);
    game.sceneManager.scene.add(bullet);

    const direction = _tmpVec3B.subVectors(targetPos, bullet.position).normalize().clone();

    const speed = this.bulletSpeed;
    let lifetime = 0;
    const damage = this.damage;

    const bulletEntity = {
      type: 'enemy_bullet',
      damage,
      mesh: bullet,
      update(game, dt) {
        lifetime += dt;
        bullet.position.addScaledVector(direction, speed * dt);

        // 命中玩家
        if (game.player && game.player.isAlive) {
          const dist = bullet.position.distanceTo(game.player.mesh.position);
          if (dist < 1.2) {
            game.player.takeDamage(game, damage);
            game.removeEntity(bulletEntity);
            return;
          }
        }

        if (lifetime > 3 || bullet.position.y < 0) {
          game.removeEntity(bulletEntity);
        }
      },
      destroy(game) {
        game.sceneManager.scene.remove(bullet);
      }
    };

    game.addEntity(bulletEntity);
    game.audioManager.play('gun_fire');
  }

  takeDamage(game, amount) {
    if (!this.isAlive) return;
    this.hp -= amount;

    if (this.hp <= 0) {
      this.die(game);
    }
  }

  die(game) {
    if (!this.isAlive) return;
    this.isAlive = false;

    // 爆炸效果
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.mesh.position.clone(), 3, false);
      game.addEntity(expl);
    });

    game.sceneManager.scene.remove(this.mesh);
    game.audioManager.play('explosion');

    if (game.player) {
      game.player.stats.targetsDestroyed++;
      game.player.stats.fightersShot++;
    }

    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
