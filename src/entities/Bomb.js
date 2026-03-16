// ============================
// 炸弹实体 - 物理抛物线 + 爆炸
// ============================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { PHYSICS, PLAYER_DEFAULTS, COLORS } from '../utils/constants.js';

export class Bomb {
  constructor(game, position, isMega = false) {
    this.isMega = isMega;
    this.hasExploded = false;
    this.lifetime = 0;
    this.maxLifetime = 5; // 最大存活时间

    const radius = isMega ? 0.4 : 0.25;
    this.blastRadius = isMega
      ? PLAYER_DEFAULTS.bombBlastRadius * 3
      : PLAYER_DEFAULTS.bombBlastRadius;
    this.damage = isMega
      ? PLAYER_DEFAULTS.bombDamage * 2
      : PLAYER_DEFAULTS.bombDamage;

    // 网格
    const geo = new THREE.SphereGeometry(radius, 8, 6);
    const mat = createMaterial('metal', COLORS.bomb);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    game.sceneManager.scene.add(this.mesh);

    // 物理体 - 受重力影响
    this.body = new CANNON.Body({
      mass: PHYSICS.bombMass,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: game.physicsWorld.defaultMaterial
    });

    // 继承玩家飞机的速度方向（向前下方投掷）
    this.body.velocity.set(0, -2, 0);

    game.physicsWorld.addBody(this.body, this.mesh);

    // 碰撞检测
    game.physicsWorld.onCollision(this.body, (e) => {
      if (!this.hasExploded) {
        this.explode(game);
      }
    });
  }

  update(game, deltaTime) {
    this.lifetime += deltaTime;

    // 超时自爆
    if (this.lifetime > this.maxLifetime && !this.hasExploded) {
      this.explode(game);
    }
  }

  explode(game) {
    if (this.hasExploded) return;
    this.hasExploded = true;

    const pos = this.mesh.position.clone();

    // 创建爆炸效果
    import('./Explosion.js').then(({ Explosion }) => {
      const explosion = new Explosion(game, pos, this.blastRadius, this.isMega);
      game.addEntity(explosion);
    });

    // 施加爆炸冲击力
    game.physicsWorld.applyExplosionForce(pos, this.blastRadius, PHYSICS.blastForce);

    // 爆炸音效
    game.audioManager.playExplosion();

    // 移除自身
    this.cleanup(game);
    game.removeEntity(this);
  }

  cleanup(game) {
    game.sceneManager.scene.remove(this.mesh);
    game.physicsWorld.removeBody(this.body);
  }

  destroy(game) {
    this.cleanup(game);
  }
}
