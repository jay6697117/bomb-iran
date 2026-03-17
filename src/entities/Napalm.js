// ============================
// 凝固汽油弹 — 大面积持续燃烧区域伤害（性能优化：共享资源 + 降低粒子频率）
// ============================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { PHYSICS, WEAPON_CONFIG, COLORS } from '../utils/constants.js';

// 模块级共享资源 — 火焰粒子复用
const _sharedFlameGeo = new THREE.SphereGeometry(0.3, 4, 3);
const _sharedFlameMatTemplate1 = new THREE.MeshBasicMaterial({
  color: COLORS.explosion,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const _sharedFlameMatTemplate2 = new THREE.MeshBasicMaterial({
  color: COLORS.napalmFlame,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

export class Napalm {
  constructor(game, position) {
    const config = WEAPON_CONFIG.napalm;

    this.damage = config.damage;
    this.burnDuration = config.burnDuration;
    this.burnRadius = config.burnRadius;
    this.hasExploded = false;
    this.lifetime = 0;
    this.maxLifetime = 5;

    // 燃烧区域相关
    this.isBurning = false;
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.burnPosition = null;
    this.burnZone = null;
    this.flameParticles = [];

    // 弹体网格（红色椭球）
    const geo = new THREE.SphereGeometry(0.3, 8, 6);
    geo.scale(1, 0.6, 1);
    const mat = createMaterial('paint', COLORS.napalm);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    game.sceneManager.scene.add(this.mesh);

    // 物理体
    this.body = new CANNON.Body({
      mass: PHYSICS.napalmMass,
      shape: new CANNON.Sphere(0.3),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: game.physicsWorld.defaultMaterial
    });
    this.body.velocity.set(0, -2, -3);
    game.physicsWorld.addBody(this.body, this.mesh);

    // 碰撞检测
    game.physicsWorld.onCollision(this.body, () => {
      if (!this.hasExploded) {
        this.ignite(game);
      }
    });
  }

  update(game, deltaTime) {
    this.lifetime += deltaTime;

    // 未爆炸状态：等待着地
    if (!this.hasExploded && this.lifetime > this.maxLifetime) {
      this.ignite(game);
    }

    // 燃烧状态
    if (this.isBurning) {
      this.burnTimer += deltaTime;
      this.burnDamageTimer += deltaTime;

      // 每 0.5 秒造成一次区域伤害
      if (this.burnDamageTimer >= 0.5) {
        this.burnDamageTimer = 0;
        this.dealBurnDamage(game);
      }

      // 更新火焰粒子
      this.updateFlames(game, deltaTime);

      // 燃烧区域脉动
      if (this.burnZone) {
        const pulse = 1 + Math.sin(this.burnTimer * 3) * 0.1;
        this.burnZone.scale.set(pulse, 1, pulse);
        this.burnZone.material.opacity = Math.max(0.1, 0.4 * (1 - this.burnTimer / this.burnDuration));
      }

      // 燃烧结束
      if (this.burnTimer >= this.burnDuration) {
        this.extinguish(game);
      }
    }
  }

  // 着地引燃
  ignite(game) {
    if (this.hasExploded) return;
    this.hasExploded = true;

    this.burnPosition = this.mesh.position.clone();
    this.burnPosition.y = 0.1;
    this.isBurning = true;

    // 隐藏弹体
    this.mesh.visible = false;

    // 移除物理体
    game.physicsWorld.removeBody(this.body);

    // 创建地面燃烧区域（发光圆盘）
    const zoneGeo = new THREE.CircleGeometry(this.burnRadius, 16);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: COLORS.napalmFlame,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.burnZone = new THREE.Mesh(zoneGeo, zoneMat);
    this.burnZone.position.copy(this.burnPosition);
    this.burnZone.rotation.x = -Math.PI / 2;
    game.sceneManager.scene.add(this.burnZone);

    // 初始爆炸音效
    game.audioManager.play('explosion');

    // 初始的橙色小爆炸
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.burnPosition.clone(), 3, false);
      game.addEntity(expl);
    });
  }

  // 区域伤害
  dealBurnDamage(game) {
    if (!this.burnPosition || !game.combatSystem) return;

    const pos = this.burnPosition;
    const radius = this.burnRadius;

    // 伤害建筑
    for (const building of game.combatSystem.buildings) {
      if (building.isDestroyed) continue;
      const dx = pos.x - building.mesh.position.x;
      const dz = pos.z - building.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius + building.width / 2) {
        building.takeDamage(game, this.damage);
      }
    }

    // 伤害防空炮
    for (const aa of game.combatSystem.antiAirs) {
      if (aa.isDestroyed) continue;
      const dx = pos.x - aa.mesh.position.x;
      const dz = pos.z - aa.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius + 1) {
        aa.takeDamage(game, this.damage);
      }
    }

    // 伤害 SAM 阵地
    for (const sam of (game.combatSystem.samSites || [])) {
      if (sam.isDestroyed) continue;
      const dx = pos.x - sam.mesh.position.x;
      const dz = pos.z - sam.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius + 1.5) {
        sam.takeDamage(game, this.damage);
      }
    }

    // 伤害雷达站
    for (const radar of (game.combatSystem.radars || [])) {
      if (radar.isDestroyed) continue;
      const dx = pos.x - radar.mesh.position.x;
      const dz = pos.z - radar.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius + 1.5) {
        radar.takeDamage(game, this.damage);
      }
    }
  }

  // 更新火焰粒子（降低生成频率 + 共享 Geometry）
  updateFlames(game, deltaTime) {
    // 降低生成频率：15% 概率（原 30%）+ 限制最大粒子数
    if (this.flameParticles.length < 8 && Math.random() < 0.15 && this.burnTimer < this.burnDuration * 0.8) {
      const mat = (Math.random() > 0.5 ? _sharedFlameMatTemplate1 : _sharedFlameMatTemplate2).clone();
      const particle = new THREE.Mesh(_sharedFlameGeo, mat);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.burnRadius * 0.8;
      const scale = 0.6 + Math.random();
      particle.position.set(
        this.burnPosition.x + Math.cos(angle) * r,
        0.3 + Math.random() * 0.5,
        this.burnPosition.z + Math.sin(angle) * r
      );
      particle.scale.setScalar(scale);
      game.sceneManager.scene.add(particle);
      this.flameParticles.push({
        mesh: particle,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        vy: 1 + Math.random() * 2
      });
    }

    // 更新现有粒子
    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const p = this.flameParticles[i];
      p.life -= deltaTime;
      p.mesh.position.y += p.vy * deltaTime;
      p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.7);
      p.mesh.scale.addScalar(deltaTime * 0.5);
      if (p.life <= 0) {
        game.sceneManager.scene.remove(p.mesh);
        this.flameParticles.splice(i, 1);
      }
    }
  }

  // 火焰熄灭
  extinguish(game) {
    this.isBurning = false;
    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
    if (this.burnZone) {
      game.sceneManager.scene.remove(this.burnZone);
    }
    for (const p of this.flameParticles) {
      game.sceneManager.scene.remove(p.mesh);
    }
    this.flameParticles = [];
  }
}
