// ============================
// 跟踪导弹实体 - 锁定玩家追踪（性能优化：共享资源 + Vector3 复用）
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { COLORS } from '../utils/constants.js';

// 模块级共享资源
const _sharedBodyGeo = new THREE.ConeGeometry(0.1, 0.6, 6);
const _sharedFlameGeo = new THREE.ConeGeometry(0.06, 0.3, 4);
const _sharedFlameMat = new THREE.MeshBasicMaterial({ color: 0xfeca57 });
const _sharedTrailGeo = new THREE.SphereGeometry(0.08, 4, 3);
const _sharedTrailMat = new THREE.MeshBasicMaterial({
  color: 0xaaaaaa,
  transparent: true,
  opacity: 0.4
});

// 预分配临时向量
const _tmpToTarget = new THREE.Vector3();
const _tmpLookAt = new THREE.Vector3();

export class Missile {
  constructor(game, position, target) {
    this.speed = 16;      // 速度增强
    this.turnRate = 4;    // 追踪能力增强
    this.damage = 1;
    this.lifetime = 0;
    this.maxLifetime = 6;
    this.isActive = true;
    this.target = target;

    // 模型 - 小圆锥（共享 Geometry）
    this.mesh = new THREE.Group();

    const bodyMat = createMaterial('metal', COLORS.missile);
    const body = new THREE.Mesh(_sharedBodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    this.mesh.add(body);

    // 尾焰（共享 Geometry/Material，clone Material 用于颜色变化）
    this.flame = new THREE.Mesh(_sharedFlameGeo, _sharedFlameMat.clone());
    this.flame.rotation.x = -Math.PI / 2;
    this.flame.position.z = 0.35;
    this.mesh.add(this.flame);

    this.mesh.position.copy(position);
    game.sceneManager.scene.add(this.mesh);

    // 烟迹粒子
    this.trailParticles = [];

    // 初始方向（向上）
    this.direction = new THREE.Vector3(0, 1, 0);
  }

  update(game, deltaTime) {
    if (!this.isActive) return;

    this.lifetime += deltaTime;

    // 跟踪目标（复用临时向量）
    if (this.target && this.target.isAlive) {
      _tmpToTarget.subVectors(this.target.mesh.position, this.mesh.position).normalize();
      this.direction.lerp(_tmpToTarget, this.turnRate * deltaTime);
      this.direction.normalize();
    }

    // 移动
    this.mesh.position.addScaledVector(this.direction, this.speed * deltaTime);

    // 朝向运动方向（复用临时向量）
    _tmpLookAt.copy(this.mesh.position).add(this.direction);
    this.mesh.lookAt(_tmpLookAt);

    // 尾焰闪烁
    this.flame.material.color.setHex(
      Math.random() > 0.5 ? 0xfeca57 : 0xff6b35
    );
    this.flame.scale.y = 0.8 + Math.random() * 0.4;

    // 烟迹效果（降低频率优化性能 + 限制数量）
    if (this.trailParticles.length < 6 && Math.floor(this.lifetime * 5) !== Math.floor((this.lifetime - deltaTime) * 5)) {
      this.addTrailParticle(game);
    }

    // 更新烟迹
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= deltaTime;
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.addScalar(deltaTime * 0.5);
      if (p.life <= 0) {
        game.sceneManager.scene.remove(p.mesh);
        this.trailParticles.splice(i, 1);
      }
    }

    // 命中检测
    if (this.target && this.target.isAlive) {
      const dist = this.mesh.position.distanceTo(this.target.mesh.position);
      if (dist < 1.2) {
        this.target.takeDamage(game, this.damage);
        this.detonate(game);
        return;
      }
    }

    // 撞地面
    if (this.mesh.position.y < 0.5) {
      this.detonate(game);
      return;
    }

    // 超时
    if (this.lifetime > this.maxLifetime) {
      this.detonate(game);
      // 玩家闪避统计
      if (game.player) {
        game.player.stats.missilesEvaded++;
      }
    }
  }

  // 烟迹粒子 — 使用共享 Geometry，clone Material（需独立 opacity）
  addTrailParticle(game) {
    const mat = _sharedTrailMat.clone();
    const mesh = new THREE.Mesh(_sharedTrailGeo, mat);
    mesh.position.copy(this.mesh.position);
    game.sceneManager.scene.add(mesh);
    this.trailParticles.push({ mesh, life: 0.3, maxLife: 0.3 });
  }

  detonate(game) {
    if (!this.isActive) return;
    this.isActive = false;

    // 小型爆炸
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.mesh.position.clone(), 2, false);
      game.addEntity(expl);
    });

    game.audioManager.playExplosion();
    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
    for (const p of this.trailParticles) {
      game.sceneManager.scene.remove(p.mesh);
    }
    this.trailParticles = [];
  }
}
