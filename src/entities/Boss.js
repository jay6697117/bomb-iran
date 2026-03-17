// ============================
// BOSS 实体 - 多阶段攻击的大型敌人
// 使用 AssetLoader 预加载的 GLTF 模型
// ============================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { Explosion } from './Explosion.js';
import { randomRange, distanceXZ } from '../utils/helpers.js';

export class Boss {
  constructor(game, config = {}) {
    this.hp = config.hp || 100;
    this.maxHp = this.hp;
    this.position = new THREE.Vector3(config.x || 0, 0, config.z || -30);
    this.isAlive = true;
    this.phase = 1; // 3 个攻击阶段
    this.fireTimer = 0;
    this.missileTimer = 0;
    this.flashTimer = 0;
    this.type = 'boss';

    // 从 AssetLoader 获取 GLTF 模型
    this.mesh = game.assetLoader.getModel('boss');

    // 获取关键子部件引用
    this.tower = null;
    this.antenna = null;
    this.glowOrb = null;
    this.bossLight = null;

    // 从模型中查找关键部件
    this.findModelParts();

    this.mesh.position.copy(this.position);
    game.sceneManager.scene.add(this.mesh);

    // 物理体
    this.body = new CANNON.Body({
      mass: 0, // 静态
      shape: new CANNON.Box(new CANNON.Vec3(4, 4, 3)),
      position: new CANNON.Vec3(this.position.x, 2, this.position.z),
      material: game.physicsWorld.defaultMaterial
    });
    this.body.entity = this;
    this.body.collisionResponse = true;
    game.physicsWorld.addBody(this.body);
  }

  // 查找模型中的关键部件引用
  findModelParts() {
    // clone() 后 userData 引用仍指向原始模型的子对象，不能直接使用
    // 始终通过 traverse 在当前 mesh 树中查找部件
    this.mesh.traverse((child) => {
      // 查找塔（CylinderGeometry，红色涂装）
      if (!this.tower && child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry') {
        if (child.material && child.material.color && child.material.color.getHex() === 0xe74c3c) {
          this.tower = child;
        }
      }
      // 查找发光球（AdditiveBlending 的球体）
      if (!this.glowOrb && child.isMesh && child.geometry && child.geometry.type === 'SphereGeometry') {
        if (child.material && child.material.blending === THREE.AdditiveBlending) {
          this.glowOrb = child;
        }
      }
      // 查找点光源
      if (!this.bossLight && child.isPointLight) {
        this.bossLight = child;
      }
      // 查找天线
      if (!this.antenna && child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry') {
        if (child.material && child.material.transparent && child.material.opacity === 0.9) {
          this.antenna = child;
        }
      }
    });

    // 兜底：创建缺失的部件
    if (!this.tower) {
      const towerGeo = new THREE.CylinderGeometry(1.2, 1.8, 4, 8);
      const towerMat = createMaterial('paint', 0xe74c3c);
      this.tower = new THREE.Mesh(towerGeo, towerMat);
      this.tower.position.y = 5.5;
      this.mesh.add(this.tower);
    }
    if (!this.glowOrb) {
      const glowGeo = new THREE.SphereGeometry(0.35, 10, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff0000, blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.8, depthWrite: false
      });
      this.glowOrb = new THREE.Mesh(glowGeo, glowMat);
      this.glowOrb.position.y = 10.4;
      this.mesh.add(this.glowOrb);
    }
    if (!this.bossLight) {
      this.bossLight = new THREE.PointLight(0xff4444, 2, 15);
      this.bossLight.position.y = 8;
      this.mesh.add(this.bossLight);
    }
    
    // [新增] 覆写材质表现为烤漆或光面涂装质感
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.material.emissive || child.material.emissiveIntensity < 1) {
          child.material.metalness = 0.3;
          child.material.roughness = 0.35;
          child.material.envMapIntensity = 1.0;
        }
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  update(game, deltaTime) {
    if (!this.isAlive) return;

    // 阶段判定
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.3 && this.phase < 3) {
      this.phase = 3;
      this.onPhaseChange(game);
    } else if (hpPercent <= 0.6 && this.phase < 2) {
      this.phase = 2;
      this.onPhaseChange(game);
    }

    // 天线发光脉冲
    const pulse = Math.sin(performance.now() * 0.005) * 0.5 + 0.5;
    if (this.glowOrb && this.glowOrb.material) {
      this.glowOrb.material.opacity = 0.5 + pulse * 0.5;
    }
    if (this.bossLight) {
      this.bossLight.intensity = 1 + pulse * 2;
    }

    // 受伤闪烁
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.tower && this.tower.material && this.tower.material.emissive) {
        this.tower.material.emissive.setHex(
          Math.sin(this.flashTimer * 30) > 0 ? 0xff0000 : 0x000000
        );
      }
    } else {
      if (this.tower && this.tower.material && this.tower.material.emissive) {
        this.tower.material.emissive.setHex(0x000000);
      }
    }

    if (!game.player) return;
    const playerPos = game.player.mesh.position;
    const dist = distanceXZ(this.mesh.position, playerPos);

    // 攻击逻辑（根据阶段）
    this.attack(game, deltaTime, dist, playerPos);
  }

  attack(game, deltaTime, dist, playerPos) {
    const fireRates = [2.5, 1.5, 0.8]; // 各阶段射速
    const fireRate = fireRates[this.phase - 1];

    // 防空炮射击
    this.fireTimer += deltaTime;
    if (this.fireTimer >= fireRate && dist < 40) {
      this.fireTimer = 0;
      this.fireAtPlayer(game, playerPos);
    }

    // 阶段 2+：发射导弹
    if (this.phase >= 2) {
      this.missileTimer += deltaTime;
      const missileRate = this.phase === 3 ? 4.5 : 7; // 发射间隔（已削弱）
      if (this.missileTimer >= missileRate && dist < 45) {
        this.missileTimer = 0;
        this.fireMissile(game, playerPos);
      }
    }
  }

  // 射击弹丸
  fireAtPlayer(game, playerPos) {
    // 从两个炮台射击
    const offsets = this.phase === 3
      ? [[-3.5, 0], [3.5, 0], [0, 0]] // 阶段3：三发齐射
      : [[-3.5, 0], [3.5, 0]];

    for (const [ox, oz] of offsets) {
      const origin = this.mesh.position.clone();
      origin.x += ox;
      origin.y += 4;
      origin.z += oz;
      const dir = playerPos.clone().sub(origin).normalize();

      // 创建敌方子弹
      const bulletGeo = new THREE.SphereGeometry(0.15, 6, 4);
      const bulletMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });
      const bullet = new THREE.Mesh(bulletGeo, bulletMat);
      bullet.position.copy(origin);
      game.sceneManager.scene.add(bullet);

      const speed = 25;
      game.addEntity({
        type: 'enemy_bullet',
        mesh: bullet,
        velocity: dir.multiplyScalar(speed),
        lifetime: 0,
        maxLifetime: 3,
        damage: 1,
        update(game, dt) {
          this.lifetime += dt;
          this.mesh.position.addScaledVector(this.velocity, dt);
          if (this.lifetime > this.maxLifetime) {
            game.removeEntity(this);
          }
        },
        destroy(game) {
          game.sceneManager.scene.remove(this.mesh);
        }
      });
    }

    game.audioManager.play('gun_fire');
  }

  // 发射追踪导弹
  fireMissile(game, playerPos) {
    const origin = this.mesh.position.clone();
    origin.y += 8;

    const missileGeo = new THREE.ConeGeometry(0.2, 1, 6);
    const missileMat = createMaterial('paint', 0xff6600);
    const missile = new THREE.Mesh(missileGeo, missileMat);
    missile.position.copy(origin);
    game.sceneManager.scene.add(missile);

    // 追踪导弹尾焰
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    const trail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 3), trailMat);
    missile.add(trail);
    trail.position.y = -0.6;

    const speed = 10; // Boss 导弹速度（已削弱）
    game.addEntity({
      type: 'boss_missile',
      mesh: missile,
      lifetime: 0,
      maxLifetime: 3.5, // 存活时间（已缩短）
      damage: 1,
      update(game, dt) {
        this.lifetime += dt;
        // 追踪玩家
        if (game.player) {
          const target = game.player.mesh.position;
          const dir = target.clone().sub(this.mesh.position).normalize();
          this.mesh.position.addScaledVector(dir, speed * dt);
          // 朝向旋转
          this.mesh.lookAt(target);
          this.mesh.rotateX(Math.PI / 2);
        }
        // 超时爆炸
        if (this.lifetime > this.maxLifetime) {
          game.removeEntity(this);
        }
      },
      destroy(game) {
        game.sceneManager.scene.remove(this.mesh);
      }
    });

    game.audioManager.play('bomb_drop');
  }

  // 阶段切换视觉反馈
  onPhaseChange(game) {
    console.log(`BOSS 进入阶段 ${this.phase}！`);
    game.sceneManager.screenShake(0.015, 0.6);
    game.sceneManager.hitFlash(0.012, 0.2);

    // 阶段颜色变化
    const colors = [0xe74c3c, 0xff6600, 0xff0000];
    if (this.tower && this.tower.material.color) {
      this.tower.material.color.setHex(colors[this.phase - 1]);
    }
    if (this.bossLight) {
      this.bossLight.color.setHex(colors[this.phase - 1]);
    }
  }

  // 受伤
  takeDamage(game, damage) {
    if (!this.isAlive) return;

    this.hp -= damage;
    this.flashTimer = 0.3;

    // 被击中震动
    game.sceneManager.screenShake(0.005, 0.15);

    if (this.hp <= 0) {
      this.die(game);
    }
  }

  // 死亡
  die(game) {
    this.isAlive = false;
    console.log('BOSS 被击败！');

    // 大爆炸
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const pos = this.mesh.position.clone();
        pos.x += randomRange(-4, 4);
        pos.y += randomRange(0, 6);
        pos.z += randomRange(-3, 3);
        new Explosion(game, pos, 8, true);
      }, i * 300);
    }

    // 强烈震动
    game.sceneManager.screenShake(0.025, 1.0);
    game.sceneManager.hitFlash(0.02, 0.3);

    // 移除
    setTimeout(() => {
      game.removeEntity(this);
    }, 2000);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
    game.physicsWorld.removeBody(this.body);
  }
}
