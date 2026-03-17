// ============================
// 跟踪导弹实体 - 锁定玩家追踪
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { COLORS } from '../utils/constants.js';

export class Missile {
  constructor(game, position, target) {
    this.speed = 16;      // 速度增强
    this.turnRate = 4;    // 追踪能力增强
    this.damage = 1;
    this.lifetime = 0;
    this.maxLifetime = 6;
    this.isActive = true;
    this.target = target;

    // 模型 - 小圆锥
    this.mesh = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(0.1, 0.6, 6);
    const bodyMat = createMaterial('metal', COLORS.missile);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    this.mesh.add(body);

    // 尾焰
    const flameGeo = new THREE.ConeGeometry(0.06, 0.3, 4);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xfeca57 });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
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

    // 跟踪目标
    if (this.target && this.target.isAlive) {
      const toTarget = new THREE.Vector3()
        .subVectors(this.target.mesh.position, this.mesh.position)
        .normalize();

      // 平滑转向
      this.direction.lerp(toTarget, this.turnRate * deltaTime);
      this.direction.normalize();
    }

    // 移动
    this.mesh.position.addScaledVector(this.direction, this.speed * deltaTime);

    // 朝向运动方向
    const lookTarget = this.mesh.position.clone().add(this.direction);
    this.mesh.lookAt(lookTarget);

    // 尾焰闪烁
    this.flame.material.color.setHex(
      Math.random() > 0.5 ? 0xfeca57 : 0xff6b35
    );
    this.flame.scale.y = 0.8 + Math.random() * 0.4;

    // 烟迹效果（降低频率优化性能）
    if (this.trailParticles.length < 8 && Math.floor(this.lifetime * 7) !== Math.floor((this.lifetime - deltaTime) * 7)) {
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

  addTrailParticle(game) {
    const geo = new THREE.SphereGeometry(0.08, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
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
