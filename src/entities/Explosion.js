// ============================
// 爆炸效果 - 粒子 + 冲击波
// ============================
import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

export class Explosion {
  constructor(game, position, radius = 5, isMega = false) {
    this.lifetime = 0;
    this.maxLifetime = 1.5;
    this.position = position.clone();
    this.particles = [];
    this.radius = radius;

    // 爆炸光源（短暂闪光）
    this.light = new THREE.PointLight(0xff6b35, 5, radius * 4);
    this.light.position.copy(position);
    game.sceneManager.scene.add(this.light);

    // 触发屏幕震动和色差闪烁
    const shakeIntensity = isMega ? 0.02 : 0.008;
    game.sceneManager.screenShake(shakeIntensity, 0.4);
    game.sceneManager.hitFlash(0.008, 0.12);

    // 冲击波环
    const ringGeo = new THREE.RingGeometry(0.1, 0.5, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.explosion,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.position.copy(position);
    this.ring.position.y = 0.1;
    this.ring.rotation.x = -Math.PI / 2;
    game.sceneManager.scene.add(this.ring);

    // 爆炸球体（快速膨胀后消失，使用 AdditiveBlending 触发 Bloom）
    const sphereGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: COLORS.explosionInner,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.sphere.position.copy(position);
    game.sceneManager.scene.add(this.sphere);

    // 碎片粒子（优化数量）
    const particleCount = isMega ? 15 : 8;
    for (let i = 0; i < particleCount; i++) {
      const size = randomRange(0.1, 0.3);
      const geo = new THREE.BoxGeometry(size, size, size);
      const color = Math.random() > 0.5 ? COLORS.explosion : COLORS.explosionInner;
      const mat = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(position);
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

    // 烟雾粒子（优化数量）
    for (let i = 0; i < 4; i++) {
      const size = randomRange(0.3, 0.8);
      const geo = new THREE.SphereGeometry(size, 6, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.6
      });
      const smoke = new THREE.Mesh(geo, mat);
      smoke.position.copy(position);
      smoke.position.add(new THREE.Vector3(
        randomRange(-1, 1),
        randomRange(0, 1),
        randomRange(-1, 1)
      ));
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

    // 闪光衰减
    if (this.light) {
      this.light.intensity = Math.max(0, 3 * (1 - progress * 3));
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
        particle.material.opacity = Math.max(0, 1 - progress);
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
    if (this.light) game.sceneManager.scene.remove(this.light);
    for (const p of this.particles) {
      game.sceneManager.scene.remove(p);
    }
    this.particles = [];
  }
}
