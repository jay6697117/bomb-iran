// ============================
// 可摧毁建筑实体（性能优化：共享碎片资源 + 减少碎片数量）
// ============================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { PHYSICS, COLORS } from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

// 模块级共享碎片资源
const _sharedDebrisGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const _sharedDebrisMat1 = createMaterial('stone', 0x95a5a6);
const _sharedDebrisMat2 = createMaterial('stone', 0x636e72);

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

    // 建筑主楼体（不包括房顶）
    const mainHeight = height * 0.8;
    const bodyGeo = new THREE.BoxGeometry(width, mainHeight, depth);
    const bodyMat = createMaterial('stone', color);
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.position.set(x, mainHeight / 2, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    game.sceneManager.scene.add(this.mesh);

    // 建筑屋顶（卡通斜顶/倒角感）
    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, height * 0.3, 4);
    // 旋转让 Cone 切面对齐四边形
    roofGeo.rotateY(Math.PI / 4); 
    const roofMat = createMaterial('paint', COLORS.building3 || 0xd63031); // 显眼的屋顶颜色
    this.roof = new THREE.Mesh(roofGeo, roofMat);
    this.roof.position.set(x, mainHeight + (height * 0.3) / 2, z);
    this.roof.castShadow = true;
    this.roof.receiveShadow = true;
    game.sceneManager.scene.add(this.roof);

    // 建筑底座基石
    const baseGeo = new THREE.BoxGeometry(width * 1.05, 0.2, depth * 1.05);
    const baseMat = createMaterial('stone', 0x2d3436);
    this.base = new THREE.Mesh(baseGeo, baseMat);
    this.base.position.set(x, 0.1, z);
    game.sceneManager.scene.add(this.base);

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
    this.roof.userData.entity = this;
    this.body.userData = { entity: this };
  }

  addDecorations(game, w, h, d, x, z) {
    this.decorations = [];
    // 在建筑正面加窗户
    const windowRows = Math.floor(h / 1.2);
    const windowCols = Math.floor(w / 1);

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        // 卡通窗户，增加一点厚度，不要纯贴片
        const winGeo = new THREE.BoxGeometry(0.35, 0.35, 0.05);
        const winMat = createMaterial('glass', Math.random() > 0.3 ? 0x74b9ff : 0xffeaa7);
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          x - w / 2 + 0.5 + col * (w / windowCols),
          0.8 + row * 1.2,
          z - d / 2 // 立体窗台略微突出
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

    // 移除原始建筑部件
    game.sceneManager.scene.remove(this.mesh);
    if (this.roof) game.sceneManager.scene.remove(this.roof);
    if (this.base) game.sceneManager.scene.remove(this.base);

    game.physicsWorld.removeBody(this.body);

    // 移除装饰
    for (const dec of this.decorations) {
      game.sceneManager.scene.remove(dec);
    }

    // 生成碎片（减少数量 + 共享 Geometry/Material）
    const debrisCount = 4;
    const debrisShape = new CANNON.Box(new CANNON.Vec3(0.2, 0.2, 0.2));
    for (let i = 0; i < debrisCount; i++) {
      const scale = randomRange(0.5, 1.5);
      const debrisMat = Math.random() > 0.5 ? _sharedDebrisMat1 : _sharedDebrisMat2;
      const debrisMesh = new THREE.Mesh(_sharedDebrisGeo, debrisMat);
      debrisMesh.scale.setScalar(scale);
      debrisMesh.castShadow = true;
      game.sceneManager.scene.add(debrisMesh);

      const debrisBody = new CANNON.Body({
        mass: PHYSICS.debrisMass,
        shape: debrisShape,
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

      // 碎片自动消失（2秒后，缩短 1 秒）
      setTimeout(() => {
        game.sceneManager.scene.remove(debrisMesh);
        game.physicsWorld.removeBody(debrisBody);
      }, 2000);
    }

    // 通知战斗系统
    if (game.player) {
      game.player.stats.targetsDestroyed++;
    }

    game.removeEntity(this);
  }
}
