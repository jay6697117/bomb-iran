// ============================
// 爆炸效果 - 粒子 + 冲击波（性能优化：共享 Geometry/Material + 移除 PointLight）
// ============================
import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

// 模块级共享资源 — 所有爆炸复用
const _sharedRingGeo = new THREE.RingGeometry(0.1, 0.5, 16);
const _sharedSphereGeo = new THREE.SphereGeometry(0.5, 8, 6);
const _sharedDebrisGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const _sharedSmokeGeo = new THREE.SphereGeometry(0.5, 6, 4);

// 材质模板（需要独立 opacity 控制，所以使用 clone 策略）
const _ringMatTemplate = new THREE.MeshBasicMaterial({
  color: COLORS.explosion,
  transparent: true,
  opacity: 0.8,
  side: THREE.DoubleSide
});
const _sphereMatTemplate = new THREE.MeshBasicMaterial({
  color: COLORS.explosionInner,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const _debrisMat1 = new THREE.MeshBasicMaterial({ color: COLORS.explosion });
const _debrisMat2 = new THREE.MeshBasicMaterial({ color: COLORS.explosionInner });
const _smokeMatTemplate = new THREE.MeshBasicMaterial({
  color: 0x888888,
  transparent: true,
  opacity: 0.6
});

export class Explosion {
  constructor(game, position, radius = 5, isMega = false) {
    this.lifetime = 0;
    this.maxLifetime = 1.5;
    this.position = position.clone();
    this.particles = [];
    this.radius = radius;

    // 移除了 PointLight（性能优化：PointLight 是阴影计算的重大开销）
    // 爆炸球体的 AdditiveBlending 自发光已经足够表现闪光效果

    // 触发屏幕震动和色差闪烁
    const shakeIntensity = isMega ? 0.02 : 0.008;
    game.sceneManager.screenShake(shakeIntensity, 0.4);
    game.sceneManager.hitFlash(0.008, 0.12);

    // 冲击波环 — 共享 Geometry，clone Material（需要独立 opacity）
    const ringMat = _ringMatTemplate.clone();
    this.ring = new THREE.Mesh(_sharedRingGeo, ringMat);
    this.ring.position.copy(position);
    this.ring.position.y = 0.1;
    this.ring.rotation.x = -Math.PI / 2;
    game.sceneManager.scene.add(this.ring);

    // 爆炸球体 — 共享 Geometry，clone Material
    const sphereMat = _sphereMatTemplate.clone();
    this.sphere = new THREE.Mesh(_sharedSphereGeo, sphereMat);
    this.sphere.position.copy(position);
    game.sceneManager.scene.add(this.sphere);

    // 碎片粒子（优化数量 + 共享 Geometry）
    const particleCount = isMega ? 10 : 5;
    for (let i = 0; i < particleCount; i++) {
      const scale = randomRange(0.5, 1.5);
      const mat = Math.random() > 0.5 ? _debrisMat1 : _debrisMat2;
      const particle = new THREE.Mesh(_sharedDebrisGeo, mat);
      particle.position.copy(position);
      particle.scale.setScalar(scale);
      particle.userData = {
        velocity: new THREE.Vector3(
          randomRange(-1, 1),
          randomRange(0.5, 2),
          randomRange(-1, 1)
        ).normalize().multiplyScalar(randomRange(3, 8)),
        rotSpeed: new THREE.Vector3(
          randomRange(-5, 5),
          randomRange(-5, 5),
          randomRange(-5, 5)
        )
      };
      game.sceneManager.scene.add(particle);
      this.particles.push(particle);
    }

    // 烟雾粒子（减少到 3 个 + 共享 Geometry + clone Material）
    for (let i = 0; i < 3; i++) {
      const smokeMat = _smokeMatTemplate.clone();
      const smoke = new THREE.Mesh(_sharedSmokeGeo, smokeMat);
      smoke.position.copy(position);
      smoke.position.add(new THREE.Vector3(
        randomRange(-1, 1),
        randomRange(0, 1),
        randomRange(-1, 1)
      ));
      const smokeScale = randomRange(0.6, 1.6);
      smoke.scale.setScalar(smokeScale);
      smoke.userData = {
        velocity: new THREE.Vector3(
          randomRange(-0.5, 0.5),
          randomRange(1, 3),
          randomRange(-0.5, 0.5)
        ),
        isSmoke: true
      };
      game.sceneManager.scene.add(smoke);
      this.particles.push(smoke);
    }
  }

  update(game, deltaTime) {
    this.lifetime += deltaTime;
    const progress = this.lifetime / this.maxLifetime;

    // 爆炸球体膨胀后消失
    if (this.sphere) {
      const sphereScale = Math.min(progress * 8, this.radius * 0.5);
      this.sphere.scale.setScalar(sphereScale);
      this.sphere.material.opacity = Math.max(0, 1 - progress * 2);
    }

    // 冲击波扩展
    if (this.ring) {
      const ringScale = progress * this.radius * 2;
      this.ring.scale.setScalar(ringScale);
      this.ring.material.opacity = Math.max(0, 0.8 - progress);
    }

    // 更新粒子
    for (const particle of this.particles) {
      const vel = particle.userData.velocity;
      particle.position.addScaledVector(vel, deltaTime);

      if (particle.userData.isSmoke) {
        // 烟雾上升并扩大
        particle.scale.addScalar(deltaTime * 0.5);
        particle.material.opacity = Math.max(0, 0.6 * (1 - progress));
      } else {
        // 碎片受重力
        vel.y -= 10 * deltaTime;
        if (particle.userData.rotSpeed) {
          particle.rotation.x += particle.userData.rotSpeed.x * deltaTime;
          particle.rotation.y += particle.userData.rotSpeed.y * deltaTime;
        }
      }
    }

    // 结束
    if (this.lifetime > this.maxLifetime) {
      game.removeEntity(this);
    }
  }

  destroy(game) {
    if (this.sphere) game.sceneManager.scene.remove(this.sphere);
    if (this.ring) game.sceneManager.scene.remove(this.ring);
    for (const p of this.particles) {
      game.sceneManager.scene.remove(p);
    }
    this.particles = [];
  }
}
