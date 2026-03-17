// ============================
// 子弹实体 - 直线射击（性能优化：共享 Geometry/Material）
// ============================
import * as THREE from 'three';
import { COLORS, PLAYER_DEFAULTS } from '../utils/constants.js';

// 模块级共享资源 — 所有子弹复用同一份 Geometry 和 Material
const _sharedBulletGeo = new THREE.SphereGeometry(0.08, 6, 4);
const _sharedBulletMat = new THREE.MeshBasicMaterial({ color: COLORS.bullet });
const _sharedTrailGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
const _sharedTrailMat = new THREE.MeshBasicMaterial({ color: COLORS.bullet, transparent: true, opacity: 0.5 });

export class Bullet {
  constructor(game, position) {
    this.speed = 40;
    this.damage = PLAYER_DEFAULTS.gunDamage;
    this.lifetime = 0;
    this.maxLifetime = 2;
    this.isActive = true;

    // 网格 - 复用共享 Geometry/Material
    this.mesh = new THREE.Mesh(_sharedBulletGeo, _sharedBulletMat);
    this.mesh.position.copy(position);
    this.mesh.position.y -= 0.5; // 从飞机下方射出
    game.sceneManager.scene.add(this.mesh);

    // 射击方向（向下前方）
    this.direction = new THREE.Vector3(0, -0.3, -1).normalize();

    // 发光尾迹 - 复用共享 Geometry/Material
    this.trail = new THREE.Mesh(_sharedTrailGeo, _sharedTrailMat);
    this.trail.rotation.x = Math.PI / 2;
    this.mesh.add(this.trail);
  }

  update(game, deltaTime) {
    if (!this.isActive) return;

    this.lifetime += deltaTime;

    // 移动
    this.mesh.position.addScaledVector(this.direction, this.speed * deltaTime);

    // 超时或到达地面
    if (this.lifetime > this.maxLifetime || this.mesh.position.y < 0) {
      this.isActive = false;
      game.removeEntity(this);
    }
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
