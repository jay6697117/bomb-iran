// ============================
// 防空炮实体 - 自动向玩家射击
// ============================
import * as THREE from 'three';
import { createToonMaterial } from '../shaders/ToonShader.js';
import { COLORS } from '../utils/constants.js';
import { distanceXZ } from '../utils/helpers.js';

export class AntiAir {
  constructor(game, config) {
    const { x = 0, z = 0, fireRate = 2, range = 25 } = config;

    this.hp = 5;
    this.isDestroyed = false;
    this.fireRate = fireRate; // 每隔几秒射击
    this.range = range;
    this.fireTimer = 0;
    this.isTarget = true;
    this.type = 'antiair';

    // 模型 - 底座 + 炮管
    this.mesh = new THREE.Group();

    // 底座
    const basGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8);
    const baseMat = createToonMaterial(COLORS.antiAir);
    const base = new THREE.Mesh(basGeo, baseMat);
    base.castShadow = true;
    this.mesh.add(base);

    // 炮管
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
    const barrelMat = createToonMaterial(0x2d3436);
    this.barrel = new THREE.Mesh(barrelGeo, barrelMat);
    this.barrel.position.set(0, 0.5, 0);
    this.barrel.rotation.x = Math.PI / 4; // 向上 45 度
    this.mesh.add(this.barrel);

    // 指示灯
    const lightGeo = new THREE.SphereGeometry(0.1, 6, 4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.indicator = new THREE.Mesh(lightGeo, lightMat);
    this.indicator.position.set(0, 0.8, 0);
    this.mesh.add(this.indicator);

    this.mesh.position.set(x, 0.25, z);
    game.sceneManager.scene.add(this.mesh);

    this.mesh.userData.entity = this;
  }

  update(game, deltaTime) {
    if (this.isDestroyed || !game.player || !game.player.isAlive) return;

    const playerPos = game.player.mesh.position;
    const dist = distanceXZ(this.mesh.position, playerPos);

    // 炮管始终朝向玩家
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const angle = Math.atan2(dx, dz);
    this.mesh.rotation.y = angle;

    // 指示灯闪烁
    this.indicator.material.color.setHex(
      Math.floor(performance.now() / 500) % 2 === 0 ? 0xff0000 : 0x990000
    );

    // 射击逻辑
    if (dist < this.range) {
      this.fireTimer += deltaTime;
      if (this.fireTimer >= this.fireRate) {
        this.fireTimer = 0;
        this.fire(game, playerPos);
      }
    }
  }

  fire(game, targetPos) {
    // 创建炮弹
    const bulletGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(this.mesh.position);
    bullet.position.y += 1;
    game.sceneManager.scene.add(bullet);

    // 计算方向
    const direction = new THREE.Vector3()
      .subVectors(targetPos, bullet.position)
      .normalize();

    const speed = 15;
    let lifetime = 0;

    // 简单的更新函数
    const bulletEntity = {
      update(game, dt) {
        lifetime += dt;
        bullet.position.addScaledVector(direction, speed * dt);

        // 命中检测（简单的距离检测）
        if (game.player && game.player.isAlive) {
          const dist = bullet.position.distanceTo(game.player.mesh.position);
          if (dist < 1.0) {
            game.player.takeDamage(game, 1);
            game.removeEntity(bulletEntity);
            return;
          }
        }

        // 超时消失
        if (lifetime > 3) {
          game.removeEntity(bulletEntity);
        }
      },
      destroy(game) {
        game.sceneManager.scene.remove(bullet);
      }
    };

    game.addEntity(bulletEntity);
  }

  takeDamage(game, amount) {
    if (this.isDestroyed) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy(game);
    }
  }

  destroy(game) {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // 爆炸效果
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.mesh.position.clone(), 3, false);
      game.addEntity(expl);
    });

    game.sceneManager.scene.remove(this.mesh);
    game.audioManager.playExplosion();

    if (game.player) {
      game.player.stats.targetsDestroyed++;
    }

    game.removeEntity(this);
  }
}
