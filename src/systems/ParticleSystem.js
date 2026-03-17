// ============================
// 粒子系统 - 管理烟雾、火焰、碎片粒子（性能优化：共享 Geometry）
// ============================
import * as THREE from 'three';
import { randomRange } from '../utils/helpers.js';

// 模块级共享资源
const _sharedParticleGeo = new THREE.SphereGeometry(1, 4, 3); // 通过 scale 控制粒子大小

export class ParticleSystem {
  constructor(game) {
    this.emitters = [];
  }

  // 创建一次性粒子喷发
  burst(game, config) {
    const {
      position,
      count = 10,
      color = 0xffffff,
      size = 0.1,
      speed = 5,
      lifetime = 1,
      gravity = -10,
      spread = 1
    } = config;

    const particles = [];

    for (let i = 0; i < count; i++) {
      const pSize = size * randomRange(0.5, 1.5);
      // 共享 Geometry，clone Material（需要独立 opacity 控制）
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(_sharedParticleGeo, mat);
      mesh.scale.setScalar(pSize);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        randomRange(-spread, spread),
        randomRange(0.3, 1),
        randomRange(-spread, spread)
      ).normalize().multiplyScalar(speed * randomRange(0.5, 1));

      game.sceneManager.scene.add(mesh);
      particles.push({
        mesh,
        velocity: vel,
        life: lifetime * randomRange(0.7, 1.3),
        maxLife: lifetime
      });
    }

    // 创建更新实体
    const emitter = {
      particles,
      update(game, dt) {
        let allDead = true;
        for (const p of particles) {
          p.life -= dt;
          if (p.life <= 0) {
            p.mesh.visible = false;
            continue;
          }
          allDead = false;
          p.velocity.y += gravity * dt;
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        }
        if (allDead) {
          game.removeEntity(emitter);
        }
      },
      destroy(game) {
        for (const p of particles) {
          game.sceneManager.scene.remove(p.mesh);
        }
      }
    };

    game.addEntity(emitter);
    return emitter;
  }

  update(game, deltaTime) {
    // 粒子系统本身不需要更新，每个 emitter 会作为独立 entity 更新
  }
}
