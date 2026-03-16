// ============================
// 可摧毁建筑实体
// ============================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createToonMaterial } from '../shaders/ToonShader.js';
import { PHYSICS, COLORS } from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

export class Building {
  constructor(game, config) {
    const {
      x = 0, z = 0,
      width = 2, height = 3, depth = 2,
      color = COLORS.building1,
      hp = 10,
      isTarget = true,
      type = 'building'
    } = config;

    this.hp = hp;
    this.maxHP = hp;
    this.isTarget = isTarget;
    this.type = type;
    this.isDestroyed = false;
    this.width = width;
    this.height = height;
    this.depth = depth;

    // 主体网格
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = createToonMaterial(color);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, height / 2, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    game.sceneManager.scene.add(this.mesh);

    // 建筑装饰（窗户等）
    this.addDecorations(game, width, height, depth, x, z);

    // 物理体（静态）
    this.body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
      position: new CANNON.Vec3(x, height / 2, z),
      material: game.physicsWorld.defaultMaterial
    });
    game.physicsWorld.addBody(this.body, this.mesh);

    // 引用用于碰撞检测
    this.mesh.userData.entity = this;
    this.body.userData = { entity: this };
  }

  addDecorations(game, w, h, d, x, z) {
    this.decorations = [];
    // 在建筑正面加窗户
    const windowRows = Math.floor(h / 1.2);
    const windowCols = Math.floor(w / 1);

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const winGeo = new THREE.PlaneGeometry(0.35, 0.35);
        const winMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.3 ? 0x74b9ff : 0xffeaa7,
          side: THREE.DoubleSide
        });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          x - w / 2 + 0.5 + col * (w / windowCols),
          0.8 + row * 1.2,
          z - d / 2 - 0.01
        );
        game.sceneManager.scene.add(win);
        this.decorations.push(win);
      }
    }
  }

  // 受到伤害
  takeDamage(game, amount) {
    if (this.isDestroyed) return;

    this.hp -= amount;

    // 受伤变色
    const hpRatio = this.hp / this.maxHP;
    if (hpRatio < 0.5) {
      this.mesh.material.color.setHex(0x636e72);
    }

    if (this.hp <= 0) {
      this.destroy(game);
    }
  }

  // 摧毁 - 生成碎片物理体
  destroy(game) {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    const pos = this.mesh.position.clone();

    // 移除原始建筑
    game.sceneManager.scene.remove(this.mesh);
    game.physicsWorld.removeBody(this.body);

    // 移除装饰
    for (const dec of this.decorations) {
      game.sceneManager.scene.remove(dec);
    }

    // 生成碎片
    const debrisCount = PHYSICS.debrisCount;
    for (let i = 0; i < debrisCount; i++) {
      const size = randomRange(0.2, 0.6);
      const debrisGeo = new THREE.BoxGeometry(size, size, size);
      const debrisMat = createToonMaterial(
        Math.random() > 0.5 ? 0x95a5a6 : 0x636e72
      );
      const debrisMesh = new THREE.Mesh(debrisGeo, debrisMat);
      debrisMesh.castShadow = true;
      game.sceneManager.scene.add(debrisMesh);

      const debrisBody = new CANNON.Body({
        mass: PHYSICS.debrisMass,
        shape: new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)),
        position: new CANNON.Vec3(
          pos.x + randomRange(-this.width / 2, this.width / 2),
          pos.y + randomRange(0, this.height / 2),
          pos.z + randomRange(-this.depth / 2, this.depth / 2)
        ),
        material: game.physicsWorld.defaultMaterial
      });

      // 给碎片施加随机向外的力
      debrisBody.velocity.set(
        randomRange(-5, 5),
        randomRange(3, 8),
        randomRange(-5, 5)
      );
      debrisBody.angularVelocity.set(
        randomRange(-5, 5),
        randomRange(-5, 5),
        randomRange(-5, 5)
      );

      game.physicsWorld.addBody(debrisBody, debrisMesh);

      // 碎片自动消失（3秒后）
      setTimeout(() => {
        game.sceneManager.scene.remove(debrisMesh);
        game.physicsWorld.removeBody(debrisBody);
      }, 3000);
    }

    // 通知战斗系统
    if (game.player) {
      game.player.stats.targetsDestroyed++;
    }

    game.removeEntity(this);
  }
}
