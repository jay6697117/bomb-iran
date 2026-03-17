// ============================
// SAM 地对空导弹阵地 — 远程高威胁防空
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { ENEMY_CONFIG, COLORS } from '../utils/constants.js';
import { distanceXZ } from '../utils/helpers.js';
import { Missile } from './Missile.js';

export class SAMSite {
  constructor(game, config = {}) {
    const samConf = ENEMY_CONFIG.sam;
    const { x = 0, z = 0 } = config;

    this.hp = samConf.hp;
    this.maxHp = samConf.hp;
    this.fireRate = samConf.fireRate;
    this.range = samConf.range;
    this.missileSpeed = samConf.missileSpeed;
    this.missileTurnRate = samConf.missileTurnRate;
    this.missileLifetime = samConf.missileLifetime;
    this.salvoCount = samConf.salvoCount;
    this.reloadTime = samConf.reloadTime;
    this.scoreValue = samConf.scoreValue;

    this.isDestroyed = false;
    this.isTarget = true;
    this.type = 'sam';
    this.fireTimer = 0;
    this.salvoFired = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.alertLevel = 'low'; // 被雷达增强时为 'high'

    // 创建 SAM 阵地模型
    this.mesh = this.createSAMModel();
    this.mesh.position.set(x, 0, z);
    game.sceneManager.scene.add(this.mesh);
  }

  createSAMModel() {
    const group = new THREE.Group();

    // 加固基座（更有层次感的多边形底座）
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.6, 8);
    const baseMat = createMaterial('stone', 0x4a5559);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    base.castShadow = true;
    group.add(base);

    // 旋转发射架
    this.launcherGroup = new THREE.Group();
    this.launcherGroup.position.y = 0.5;

    // 发射管（4管，变粗增加威慑力）
    for (let i = 0; i < 4; i++) {
      const tubeGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8);
      const tubeMat = createMaterial('paint', COLORS.sam || 0x27ae60); // 用上车漆质感
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      const row = Math.floor(i / 2);
      const col = i % 2;
      tube.position.set(
        (col - 0.5) * 0.35,
        0.3 + row * 0.35,
        0
      );
      tube.rotation.x = Math.PI / 3; // 倾斜 60 度
      this.launcherGroup.add(tube);
    }

    group.add(this.launcherGroup);

    // 状态灯
    const lightGeo = new THREE.SphereGeometry(0.08, 6, 4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.indicator = new THREE.Mesh(lightGeo, lightMat);
    this.indicator.position.set(0, 1.2, 0);
    group.add(this.indicator);

    // 伪装网（视觉装饰）
    const camoGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const camoMat = new THREE.MeshBasicMaterial({
      color: 0x636e72,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const camo = new THREE.Mesh(camoGeo, camoMat);
    camo.position.y = 1.5;
    camo.rotation.x = -Math.PI / 2;
    group.add(camo);

    return group;
  }

  update(game, deltaTime) {
    if (this.isDestroyed || !game.player || !game.player.isAlive) return;

    const playerPos = game.player.mesh.position;
    const dist = distanceXZ(this.mesh.position, playerPos);

    // 发射架朝向玩家
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const angle = Math.atan2(dx, dz);
    this.launcherGroup.rotation.y = angle;

    // 装填冷却
    if (this.isReloading) {
      this.reloadTimer += deltaTime;
      // 装填中指示灯慢闪黄色
      this.indicator.material.color.setHex(
        Math.floor(performance.now() / 800) % 2 === 0 ? 0xffaa00 : 0x664400
      );
      if (this.reloadTimer >= this.reloadTime) {
        this.isReloading = false;
        this.salvoFired = 0;
        this.reloadTimer = 0;
      }
      return;
    }

    // 指示灯 — 射程内红色闪烁
    if (dist < this.range) {
      this.indicator.material.color.setHex(
        Math.floor(performance.now() / 300) % 2 === 0 ? 0xff0000 : 0xcc0000
      );
    } else {
      this.indicator.material.color.setHex(0x00ff00);
    }

    // 射击逻辑
    const effectiveRate = this.alertLevel === 'high'
      ? this.fireRate / ENEMY_CONFIG.radar.alertBonus
      : this.fireRate;

    if (dist < this.range) {
      this.fireTimer += deltaTime;
      if (this.fireTimer >= effectiveRate) {
        this.fireTimer = 0;
        this.launchMissile(game);
        this.salvoFired++;

        // 一波齐射完毕，进入装填
        if (this.salvoFired >= this.salvoCount) {
          this.isReloading = true;
          this.reloadTimer = 0;
        }
      }
    }
  }

  launchMissile(game) {
    if (!game.player || !game.player.isAlive) return;

    const launchPos = this.mesh.position.clone();
    launchPos.y += 1.5;

    // 创建 SAM 导弹（速度和追踪更强）
    const missile = new Missile(game, launchPos, game.player);
    missile.speed = this.missileSpeed;
    missile.turnRate = this.missileTurnRate;
    missile.maxLifetime = this.missileLifetime;
    missile.damage = 2; // SAM 导弹伤害更高

    game.addEntity(missile);
    game.audioManager.play('missile_launch');

    // 设置玩家导弹来袭警报
    if (game.player) {
      game.player.warnings.missileIncoming = true;
      setTimeout(() => {
        if (game.player) game.player.warnings.missileIncoming = false;
      }, 3000);
    }
  }

  setAlertLevel(level) {
    this.alertLevel = level;
  }

  takeDamage(game, amount) {
    if (this.isDestroyed) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die(game);
    }
  }

  die(game) {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // 大爆炸
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.mesh.position.clone(), 5, true);
      game.addEntity(expl);
    });

    game.sceneManager.scene.remove(this.mesh);
    game.audioManager.play('explosion');

    if (game.player) {
      game.player.stats.targetsDestroyed++;
    }

    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
