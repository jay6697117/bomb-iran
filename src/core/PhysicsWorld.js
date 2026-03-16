// ============================
// 物理世界管理器 - 封装 Cannon-es
// ============================
import * as CANNON from 'cannon-es';
import { PHYSICS } from '../utils/constants.js';

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, PHYSICS.gravity, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    // 碰撞材质
    this.defaultMaterial = new CANNON.Material('default');
    this.groundMaterial = new CANNON.Material('ground');

    // 默认接触材质
    const defaultContact = new CANNON.ContactMaterial(
      this.defaultMaterial, this.defaultMaterial,
      { friction: 0.3, restitution: 0.3 }
    );
    this.world.addContactMaterial(defaultContact);

    // 地面接触材质（碎片弹跳效果）
    const groundContact = new CANNON.ContactMaterial(
      this.groundMaterial, this.defaultMaterial,
      { friction: 0.5, restitution: 0.4 }
    );
    this.world.addContactMaterial(groundContact);

    this.world.defaultContactMaterial = defaultContact;

    // 物理体与 Mesh 的关联
    this.bodyMeshPairs = [];

    // 碰撞回调映射
    this.collisionCallbacks = new Map();
  }

  // 添加物理体并关联 Mesh
  addBody(body, mesh = null) {
    this.world.addBody(body);
    if (mesh) {
      this.bodyMeshPairs.push({ body, mesh });
    }
    return body;
  }

  // 移除物理体
  removeBody(body) {
    this.world.removeBody(body);
    this.bodyMeshPairs = this.bodyMeshPairs.filter(p => p.body !== body);
    this.collisionCallbacks.delete(body.id);
  }

  // 注册碰撞回调
  onCollision(body, callback) {
    this.collisionCallbacks.set(body.id, callback);
    body.addEventListener('collide', (e) => {
      const cb = this.collisionCallbacks.get(body.id);
      if (cb) cb(e);
    });
  }

  // 在指定位置施加爆炸力
  applyExplosionForce(position, radius, force) {
    const cannonPos = new CANNON.Vec3(position.x, position.y, position.z);
    this.world.bodies.forEach(body => {
      if (body.mass === 0) return;
      const dist = body.position.distanceTo(cannonPos);
      if (dist < radius && dist > 0.1) {
        const direction = new CANNON.Vec3();
        body.position.vsub(cannonPos, direction);
        direction.normalize();
        const strength = (1 - dist / radius) * force;
        direction.scale(strength, direction);
        body.applyImpulse(direction);
      }
    });
  }

  // 每帧更新物理并同步到 Mesh
  update(deltaTime) {
    this.world.step(1 / 60, deltaTime, 3);

    // 同步物理体位置到 Three.js Mesh
    for (const { body, mesh } of this.bodyMeshPairs) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }

  // 创建地面物理体
  createGroundBody() {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.groundMaterial
    });
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(body);
    return body;
  }

  // 清除所有物理体（切换关卡时用）
  clear() {
    // 保留地面，移除其他所有
    const bodiesToRemove = this.world.bodies.filter(b => b.mass > 0);
    bodiesToRemove.forEach(b => this.removeBody(b));
    this.bodyMeshPairs = [];
    this.collisionCallbacks.clear();
  }
}
