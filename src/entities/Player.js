// ============================
// 玩家飞机实体
// ============================
import * as THREE from 'three';
import { createToonMaterial } from '../shaders/ToonShader.js';
import { PLAYER_DEFAULTS, WEAPONS, COLORS } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';
import { Bomb } from './Bomb.js';
import { Bullet } from './Bullet.js';

export class Player {
  constructor(game) {
    // 属性
    this.speed = PLAYER_DEFAULTS.speed;
    this.maxHP = PLAYER_DEFAULTS.maxHP;
    this.hp = this.maxHP;
    this.altitude = PLAYER_DEFAULTS.altitude;
    this.currentWeapon = WEAPONS.BOMB;
    this.bombCooldown = PLAYER_DEFAULTS.bombCooldown;
    this.gunCooldown = PLAYER_DEFAULTS.gunCooldown;
    this.lastBombTime = 0;
    this.lastGunTime = 0;
    this.isAlive = true;
    this.isInvincible = false;
    this.invincibleTimer = 0;

    // 道具状态
    this.hasShield = false;
    this.speedBoostTimer = 0;
    this.hasMegaBomb = false;

    // 统计数据（用于评分和成就）
    this.stats = {
      bombsDropped: 0,
      bulletsShot: 0,
      targetsDestroyed: 0,
      consecutiveHits: 0,
      damageReceived: 0,
      pickupsCollected: 0,
      missilesEvaded: 0
    };

    // 创建飞机模型
    this.mesh = this.createPlaneModel();
    this.mesh.position.set(0, this.altitude, 0);
    game.sceneManager.scene.add(this.mesh);

    // 飞机倾斜动画参数
    this.targetTilt = 0;
    this.currentTilt = 0;

    // 推进器火焰效果
    this.thrusterFlicker = 0;
  }

  createPlaneModel() {
    const group = new THREE.Group();

    // 机身 - 圆润的椭球体
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8);
    const bodyMat = createToonMaterial(COLORS.player);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // 驾驶舱 - 半球
    const cockpitGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = createToonMaterial(0x74b9ff);
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.25, -0.3);
    cockpit.rotation.x = -Math.PI / 6;
    group.add(cockpit);

    // 左翼
    const wingGeo = new THREE.BoxGeometry(3.5, 0.08, 0.8);
    const wingMat = createToonMaterial(COLORS.playerWing);
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, -0.05, 0.2);
    leftWing.castShadow = true;
    group.add(leftWing);

    // 尾翼（水平）
    const tailWingGeo = new THREE.BoxGeometry(1.2, 0.06, 0.4);
    const tailWing = new THREE.Mesh(tailWingGeo, createToonMaterial(COLORS.playerWing));
    tailWing.position.set(0, 0, 1.2);
    group.add(tailWing);

    // 尾翼（垂直）
    const vTailGeo = new THREE.BoxGeometry(0.06, 0.6, 0.4);
    const vTail = new THREE.Mesh(vTailGeo, createToonMaterial(COLORS.playerWing));
    vTail.position.set(0, 0.3, 1.2);
    group.add(vTail);

    // 推进器火焰（简单的小锥体）
    const thrusterGeo = new THREE.ConeGeometry(0.15, 0.5, 6);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
    this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    this.thruster.position.set(0, 0, 1.5);
    this.thruster.rotation.x = -Math.PI / 2;
    group.add(this.thruster);

    // 整体缩放和旋转（飞机朝 -Z 方向飞行）
    group.scale.set(0.8, 0.8, 0.8);

    return group;
  }

  update(game, deltaTime) {
    if (!this.isAlive) return;

    const input = game.inputManager;

    // 移动
    const movement = input.getMovement();
    const currentSpeed = this.speedBoostTimer > 0
      ? this.speed * 1.5
      : this.speed;

    this.mesh.position.x += movement.x * currentSpeed * deltaTime;
    this.mesh.position.z += movement.z * currentSpeed * deltaTime;

    // 限制移动范围
    this.mesh.position.x = clamp(this.mesh.position.x, -45, 45);
    this.mesh.position.z = clamp(this.mesh.position.z, -45, 45);

    // 飞机倾斜动画
    this.targetTilt = -movement.x * 0.4;
    this.currentTilt += (this.targetTilt - this.currentTilt) * 5 * deltaTime;
    this.mesh.rotation.z = this.currentTilt;

    // 飞机俯仰
    const pitchTarget = -movement.z * 0.15;
    this.mesh.rotation.x += (pitchTarget - this.mesh.rotation.x) * 3 * deltaTime;

    // 推进器火焰闪烁
    this.thrusterFlicker += deltaTime * 15;
    const flickerScale = 0.8 + Math.sin(this.thrusterFlicker) * 0.3;
    this.thruster.scale.y = flickerScale;
    this.thruster.material.color.setHex(
      Math.random() > 0.5 ? 0xff6b35 : 0xffd93d
    );

    // 武器切换
    if (input.isKeyJustPressed('KeyQ')) {
      this.currentWeapon = this.currentWeapon === WEAPONS.BOMB
        ? WEAPONS.GUN
        : WEAPONS.BOMB;
      game.audioManager.play('click');
    }

    // 射击/投弹
    const now = performance.now();
    if (input.isKeyDown('Space')) {
      if (this.currentWeapon === WEAPONS.BOMB) {
        if (now - this.lastBombTime > this.bombCooldown) {
          this.dropBomb(game);
          this.lastBombTime = now;
        }
      } else {
        if (now - this.lastGunTime > this.gunCooldown) {
          this.shootGun(game);
          this.lastGunTime = now;
        }
      }
    }

    // 道具计时器
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= deltaTime;
    }

    // 受伤无敌计时
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= deltaTime;
      // 闪烁效果
      this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.mesh.visible = true;
      }
    }
  }

  // 投弹
  dropBomb(game) {
    const bomb = new Bomb(game, this.mesh.position.clone(), this.hasMegaBomb);
    game.addEntity(bomb);
    game.audioManager.play('bomb_drop');
    this.stats.bombsDropped++;
    if (this.hasMegaBomb) {
      this.hasMegaBomb = false;
    }
  }

  // 机枪射击
  shootGun(game) {
    const bullet = new Bullet(game, this.mesh.position.clone());
    game.addEntity(bullet);
    game.audioManager.play('gun_fire');
    this.stats.bulletsShot++;
  }

  // 受到伤害
  takeDamage(game, amount = 1) {
    if (this.isInvincible || !this.isAlive) return;

    // 护盾抵挡
    if (this.hasShield) {
      this.hasShield = false;
      game.audioManager.play('hit');
      return;
    }

    this.hp -= amount;
    this.stats.damageReceived += amount;
    game.audioManager.play('hit');

    if (this.hp <= 0) {
      this.hp = 0;
      this.die(game);
    } else {
      // 受伤无敌时间
      this.isInvincible = true;
      this.invincibleTimer = 1.5;
    }
  }

  // 死亡
  die(game) {
    this.isAlive = false;
    this.mesh.visible = false;
    // 触发游戏结束（后续由关卡系统处理）
    console.log('💀 玩家阵亡！');
  }

  // 拾取道具
  collectPickup(type, game) {
    this.stats.pickupsCollected++;
    game.audioManager.play('pickup');

    switch (type) {
      case 'shield':
        this.hasShield = true;
        break;
      case 'speed':
        this.speedBoostTimer = 5;
        break;
      case 'mega_bomb':
        this.hasMegaBomb = true;
        break;
      case 'health':
        this.hp = Math.min(this.hp + 1, this.maxHP);
        break;
    }
  }

  // 应用升级
  applyUpgrades(upgrades) {
    if (upgrades.bombPower) {
      // 后续由升级系统传入倍率
    }
    if (upgrades.speed) {
      this.speed = PLAYER_DEFAULTS.speed * (upgrades.speed || 1);
    }
    if (upgrades.maxHP) {
      this.maxHP = upgrades.maxHP;
      this.hp = this.maxHP;
    }
  }

  // 重置
  reset(game) {
    this.hp = this.maxHP;
    this.isAlive = true;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.hasShield = false;
    this.speedBoostTimer = 0;
    this.hasMegaBomb = false;
    this.mesh.visible = true;
    this.mesh.position.set(0, this.altitude, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.stats = {
      bombsDropped: 0, bulletsShot: 0, targetsDestroyed: 0,
      consecutiveHits: 0, damageReceived: 0, pickupsCollected: 0,
      missilesEvaded: 0
    };
  }

  // 销毁
  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
