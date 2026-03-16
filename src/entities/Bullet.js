// ============================
// 子弹实体 - 直线射击
// ============================
import * as THREE from 'three';
import { COLORS, PLAYER_DEFAULTS } from '../utils/constants.js';

export class Bullet {
  constructor(game, position) {
    this.speed = 40;
    this.damage = PLAYER_DEFAULTS.gunDamage;
    this.lifetime = 0;
    this.maxLifetime = 2;
    this.isActive = true;

    // 网格 - 小发光球
    const geo = new THREE.SphereGeometry(0.08, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.bullet });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.mesh.position.y -= 0.5; // 从飞机下方射出
    game.sceneManager.scene.add(this.mesh);

    // 射击方向（向下前方）
    this.direction = new THREE.Vector3(0, -0.3, -1).normalize();

    // 发光尾迹
    const trailGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
    const trailMat = new THREE.MeshBasicMaterial({ color: COLORS.bullet, transparent: true, opacity: 0.5 });
    this.trail = new THREE.Mesh(trailGeo, trailMat);
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
