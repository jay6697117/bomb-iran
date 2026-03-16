// ============================
// BOSS 实体 - 多阶段攻击的大型敌人
// ============================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createToonMaterial } from '../shaders/ToonShader.js';
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

    // BOSS 主体 - 大型堡垒结构
    this.mesh = new THREE.Group();

    // 主体底座
    const baseGeo = new THREE.BoxGeometry(8, 3, 6);
    const baseMat = createToonMaterial(0x2c3e50);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.y = 1.5;
    this.mesh.add(base);

    // 核心塔
    const towerGeo = new THREE.CylinderGeometry(1.5, 2, 5, 8);
    const towerMat = createToonMaterial(0xe74c3c);
    this.tower = new THREE.Mesh(towerGeo, towerMat);
    this.tower.castShadow = true;
    this.tower.position.y = 5.5;
    this.mesh.add(this.tower);

    // 侧翼炮台 × 2
    const turretGeo = new THREE.CylinderGeometry(0.8, 1, 2.5, 6);
    const turretMat = createToonMaterial(0x636e72);
    const leftTurret = new THREE.Mesh(turretGeo, turretMat);
    leftTurret.castShadow = true;
    leftTurret.position.set(-3.5, 4, 0);
    this.mesh.add(leftTurret);

    const rightTurret = new THREE.Mesh(turretGeo.clone(), turretMat.clone());
    rightTurret.castShadow = true;
    rightTurret.position.set(3.5, 4, 0);
    this.mesh.add(rightTurret);

    // 顶部天线（发光体，触发 Bloom）
    const antennaGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 4);
    const antennaMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.9
    });
    this.antenna = new THREE.Mesh(antennaGeo, antennaMat);
    this.antenna.position.y = 9.5;
    this.mesh.add(this.antenna);

    // 天线顶部发光球
    const glowGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    this.glowOrb = new THREE.Mesh(glowGeo, glowMat);
    this.glowOrb.position.y = 11;
    this.mesh.add(this.glowOrb);

    // BOSS 发光点光源
    this.bossLight = new THREE.PointLight(0xff4444, 2, 15);
    this.bossLight.position.y = 8;
    this.mesh.add(this.bossLight);

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
    this.glowOrb.material.opacity = 0.5 + pulse * 0.5;
    this.bossLight.intensity = 1 + pulse * 2;

    // 受伤闪烁
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      this.tower.material.emissive.setHex(
        Math.sin(this.flashTimer * 30) > 0 ? 0xff0000 : 0x000000
      );
    } else {
      this.tower.material.emissive.setHex(0x000000);
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
      const missileRate = this.phase === 3 ? 3 : 5;
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

      // 创建敌方子弹（简单方式：复用 AntiAir 的射击逻辑）
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

    game.audioManager.playSynth('gun_fire');
  }

  // 发射追踪导弹
  fireMissile(game, playerPos) {
    const origin = this.mesh.position.clone();
    origin.y += 8;

    const missileGeo = new THREE.ConeGeometry(0.2, 1, 6);
    const missileMat = createToonMaterial(0xff6600);
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

    const speed = 15;
    game.addEntity({
      type: 'boss_missile',
      mesh: missile,
      lifetime: 0,
      maxLifetime: 5,
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

    game.audioManager.playSynth('bomb_drop');
  }

  // 阶段切换视觉反馈
  onPhaseChange(game) {
    console.log(`BOSS 进入阶段 ${this.phase}！`);
    game.sceneManager.screenShake(0.015, 0.6);
    game.sceneManager.hitFlash(0.012, 0.2);

    // 阶段颜色变化
    const colors = [0xe74c3c, 0xff6600, 0xff0000];
    this.tower.material.color.setHex(colors[this.phase - 1]);
    this.bossLight.color.setHex(colors[this.phase - 1]);
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
