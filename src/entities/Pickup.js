// ============================
// 道具实体 - 漂浮旋转的拾取物
// ============================
import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';

// 道具配置
const PICKUP_CONFIG = {
  shield: { color: COLORS.pickupShield, emoji: '🛡️', geometry: 'diamond' },
  speed: { color: COLORS.pickupSpeed, emoji: '⚡', geometry: 'star' },
  mega_bomb: { color: COLORS.pickupMega, emoji: '💣', geometry: 'sphere' },
  health: { color: COLORS.pickupHealth, emoji: '❤️', geometry: 'cross' }
};

export class Pickup {
  constructor(game, config) {
    const { x = 0, z = 0, type = 'health' } = config;

    this.type = type;
    this.isCollected = false;
    this.floatOffset = Math.random() * Math.PI * 2;

    const pickupConf = PICKUP_CONFIG[type] || PICKUP_CONFIG.health;

    // 创建几何体
    this.mesh = new THREE.Group();

    let geo;
    switch (pickupConf.geometry) {
      case 'diamond':
        geo = new THREE.OctahedronGeometry(0.4);
        break;
      case 'star':
        geo = new THREE.DodecahedronGeometry(0.35);
        break;
      case 'sphere':
        geo = new THREE.SphereGeometry(0.35, 8, 6);
        break;
      case 'cross':
        geo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        break;
      default:
        geo = new THREE.SphereGeometry(0.35, 8, 6);
    }

    // 主体（发光效果，使用 AdditiveBlending 触发 Bloom）
    const mat = new THREE.MeshBasicMaterial({
      color: pickupConf.color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mainMesh = new THREE.Mesh(geo, mat);
    this.mesh.add(mainMesh);

    // 外圈光晕
    const glowGeo = new THREE.SphereGeometry(0.6, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: pickupConf.color,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.mesh.add(glow);
    this.glow = glow;

    this.mesh.position.set(x, 5, z); // 在飞行高度附近
    game.sceneManager.scene.add(this.mesh);
  }

  update(game, deltaTime) {
    if (this.isCollected) return;

    // 旋转
    this.mesh.rotation.y += 2 * deltaTime;

    // 上下漂浮
    this.floatOffset += deltaTime * 2;
    this.mesh.position.y = 5 + Math.sin(this.floatOffset) * 0.5;

    // 光晕脉动
    const pulse = 0.8 + Math.sin(this.floatOffset * 1.5) * 0.2;
    this.glow.scale.setScalar(pulse);

    // 拾取检测
    if (game.player && game.player.isAlive) {
      const dist = this.mesh.position.distanceTo(game.player.mesh.position);
      if (dist < 1.5) {
        this.collect(game);
      }
    }
  }

  collect(game) {
    if (this.isCollected) return;
    this.isCollected = true;

    // 应用道具效果
    game.player.collectPickup(this.type, game);

    // 拾取动画（缩小消失）
    const startScale = this.mesh.scale.clone();
    let animTime = 0;
    const animEntity = {
      update: (game, dt) => {
        animTime += dt;
        const t = animTime / 0.3;
        if (t >= 1) {
          game.sceneManager.scene.remove(this.mesh);
          game.removeEntity(animEntity);
          return;
        }
        this.mesh.scale.setScalar(1 - t);
        this.mesh.position.y += dt * 3;
      },
      destroy: () => {}
    };
    game.addEntity(animEntity);
    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
