// ============================
// 玩家飞机实体 — 硬核模式 C
// 4种武器 + 燃料系统 + 弹药管理
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { PLAYER_DEFAULTS, WEAPONS, WEAPON_CONFIG, FUEL_CONFIG, COLORS } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';
import { Bomb } from './Bomb.js';
import { Bullet } from './Bullet.js';
import { PlayerMissile } from './PlayerMissile.js';
import { Napalm } from './Napalm.js';

export class Player {
  constructor(game) {
    // 基础属性
    this.speed = PLAYER_DEFAULTS.speed;
    this.maxHP = PLAYER_DEFAULTS.maxHP;
    this.hp = this.maxHP;
    this.altitude = PLAYER_DEFAULTS.altitude;
    this.isAlive = true;
    this.isInvincible = false;
    this.invincibleTimer = 0;

    // 武器系统 — 4种武器
    this.weapons = [WEAPONS.BOMB, WEAPONS.GUN, WEAPONS.MISSILE, WEAPONS.NAPALM];
    this.currentWeaponIndex = 0;
    this.currentWeapon = this.weapons[0];
    this.lastFireTime = {
      [WEAPONS.BOMB]: 0,
      [WEAPONS.GUN]: 0,
      [WEAPONS.MISSILE]: 0,
      [WEAPONS.NAPALM]: 0
    };

    // 弹药系统 — 每种武器独立弹药
    this.ammo = {
      [WEAPONS.BOMB]: WEAPON_CONFIG.bomb.startAmmo,
      [WEAPONS.GUN]: WEAPON_CONFIG.gun.startAmmo,
      [WEAPONS.MISSILE]: WEAPON_CONFIG.missile.startAmmo,
      [WEAPONS.NAPALM]: WEAPON_CONFIG.napalm.startAmmo
    };
    this.maxAmmo = {
      [WEAPONS.BOMB]: WEAPON_CONFIG.bomb.maxAmmo,
      [WEAPONS.GUN]: WEAPON_CONFIG.gun.maxAmmo,
      [WEAPONS.MISSILE]: WEAPON_CONFIG.missile.maxAmmo,
      [WEAPONS.NAPALM]: WEAPON_CONFIG.napalm.maxAmmo
    };

    // 燃料系统
    this.fuel = FUEL_CONFIG.maxFuel;
    this.maxFuel = FUEL_CONFIG.maxFuel;
    this.isFuelEmpty = false;

    // 道具状态
    this.hasShield = false;
    this.speedBoostTimer = 0;
    this.hasMegaBomb = false;

    // 警告状态（供 HUD 读取）
    this.warnings = {
      lowFuel: false,
      criticalFuel: false,
      radarLocked: false,
      missileIncoming: false,
      emptyAmmo: false
    };

    // 统计数据
    this.stats = {
      bombsDropped: 0,
      bulletsShot: 0,
      missilesLaunched: 0,
      napalmDropped: 0,
      targetsDestroyed: 0,
      consecutiveHits: 0,
      damageReceived: 0,
      pickupsCollected: 0,
      missilesEvaded: 0,
      fightersShot: 0,
      fuelUsed: 0
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

    // 空弹匣冷却（避免连续播放音效）
    this.emptyClipTimer = 0;
  }

  createPlaneModel() {
    const group = new THREE.Group();

    // 机身
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8);
    const bodyMat = createMaterial('paint', COLORS.player);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // 驾驶舱
    const cockpitGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = createMaterial('glass', 0x74b9ff);
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.25, -0.3);
    cockpit.rotation.x = -Math.PI / 6;
    group.add(cockpit);

    // 左翼
    const wingGeo = new THREE.BoxGeometry(3.5, 0.08, 0.8);
    const wingMat = createMaterial('paint', COLORS.playerWing);
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, -0.05, 0.2);
    leftWing.castShadow = true;
    group.add(leftWing);

    // 尾翼（水平）
    const tailWingGeo = new THREE.BoxGeometry(1.2, 0.06, 0.4);
    const tailWing = new THREE.Mesh(tailWingGeo, createMaterial('paint', COLORS.playerWing));
    tailWing.position.set(0, 0, 1.2);
    group.add(tailWing);

    // 尾翼（垂直）
    const vTailGeo = new THREE.BoxGeometry(0.06, 0.6, 0.4);
    const vTail = new THREE.Mesh(vTailGeo, createMaterial('paint', COLORS.playerWing));
    vTail.position.set(0, 0.3, 1.2);
    group.add(vTail);

    // 推进器火焰
    const thrusterGeo = new THREE.ConeGeometry(0.15, 0.5, 6);
    const thrusterMat = createMaterial('emissive', 0xff6b35);
    this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    this.thruster.position.set(0, 0, 1.5);
    this.thruster.rotation.x = -Math.PI / 2;
    group.add(this.thruster);

    // 翼下挂架（视觉上显示导弹和副油箱的挂载点）
    const pylonGeo = new THREE.BoxGeometry(0.06, 0.2, 0.3);
    const pylonMat = createMaterial('metal', 0x636e72);
    const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
    leftPylon.position.set(-1.2, -0.2, 0.2);
    group.add(leftPylon);
    const rightPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rightPylon.position.set(1.2, -0.2, 0.2);
    group.add(rightPylon);

    group.scale.set(0.8, 0.8, 0.8);
    return group;
  }

  update(game, deltaTime) {
    if (!this.isAlive) return;

    const input = game.inputManager;

    // === 燃料消耗 ===
    this.updateFuel(game, deltaTime);

    // === 移动 ===
    const movement = input.getMovement();
    const isBoosting = this.speedBoostTimer > 0;
    const currentSpeed = isBoosting ? this.speed * 1.5 : this.speed;

    // 如果燃料耗尽，飞机逐渐下坠
    if (this.isFuelEmpty) {
      this.mesh.position.y -= FUEL_CONFIG.descentRate * deltaTime;
      if (this.mesh.position.y <= 0) {
        this.die(game);
        return;
      }
    }

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

    // 推进器火焰闪烁（无燃料时火焰熄灭）
    if (!this.isFuelEmpty) {
      this.thrusterFlicker += deltaTime * 15;
      const flickerScale = 0.8 + Math.sin(this.thrusterFlicker) * 0.3;
      this.thruster.scale.y = flickerScale;
      this.thruster.material.color.setHex(
        Math.random() > 0.5 ? 0xff6b35 : 0xffd93d
      );
      this.thruster.visible = true;
    } else {
      this.thruster.visible = false;
    }

    // === 武器切换 ===
    // Q / E 切换
    if (input.isKeyJustPressed('KeyQ')) {
      this.switchWeapon(-1, game);
    }
    if (input.isKeyJustPressed('KeyE')) {
      this.switchWeapon(1, game);
    }
    // 数字键 1-4 直接切换
    if (input.isKeyJustPressed('Digit1')) this.setWeapon(0, game);
    if (input.isKeyJustPressed('Digit2')) this.setWeapon(1, game);
    if (input.isKeyJustPressed('Digit3')) this.setWeapon(2, game);
    if (input.isKeyJustPressed('Digit4')) this.setWeapon(3, game);

    // === 射击/投弹 ===
    this.emptyClipTimer = Math.max(0, this.emptyClipTimer - deltaTime);
    const now = performance.now();
    if (input.isKeyDown('Space')) {
      this.fireCurrentWeapon(game, now);
    }

    // 道具计时器
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= deltaTime;
    }

    // 受伤无敌计时
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= deltaTime;
      this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.mesh.visible = true;
      }
    }
  }

  // === 燃料管理 ===
  updateFuel(game, deltaTime) {
    if (this.isFuelEmpty) return;

    const isBoosting = this.speedBoostTimer > 0;
    const consumeRate = isBoosting
      ? FUEL_CONFIG.consumeRate * FUEL_CONFIG.boostMultiplier
      : FUEL_CONFIG.consumeRate;

    this.fuel -= consumeRate * deltaTime;
    this.stats.fuelUsed += consumeRate * deltaTime;

    // 更新警告状态
    const fuelPercent = (this.fuel / this.maxFuel) * 100;
    this.warnings.lowFuel = fuelPercent <= FUEL_CONFIG.lowFuelThreshold;
    this.warnings.criticalFuel = fuelPercent <= FUEL_CONFIG.criticalFuelThreshold;

    if (this.fuel <= 0) {
      this.fuel = 0;
      this.isFuelEmpty = true;
      game.audioManager.play('fuel_low');
    }
  }

  // === 武器切换 ===
  switchWeapon(direction, game) {
    this.currentWeaponIndex = (this.currentWeaponIndex + direction + this.weapons.length) % this.weapons.length;
    this.currentWeapon = this.weapons[this.currentWeaponIndex];
    game.audioManager.play('click');
  }

  setWeapon(index, game) {
    if (index >= 0 && index < this.weapons.length && index !== this.currentWeaponIndex) {
      this.currentWeaponIndex = index;
      this.currentWeapon = this.weapons[index];
      game.audioManager.play('click');
    }
  }

  // === 开火 ===
  fireCurrentWeapon(game, now) {
    const weaponType = this.currentWeapon;
    const config = WEAPON_CONFIG[weaponType];
    if (!config) return;

    // 冷却检测
    if (now - this.lastFireTime[weaponType] < config.cooldown) return;

    // 弹药检测
    if (this.ammo[weaponType] <= 0) {
      // 空弹匣音效（有冷却避免连续播放）
      if (this.emptyClipTimer <= 0) {
        game.audioManager.play('empty_clip');
        this.emptyClipTimer = 0.5;
        this.warnings.emptyAmmo = true;
        setTimeout(() => { this.warnings.emptyAmmo = false; }, 1000);
      }
      return;
    }

    // 消耗弹药
    this.ammo[weaponType]--;
    this.lastFireTime[weaponType] = now;

    // 按武器类型执行
    switch (weaponType) {
      case WEAPONS.BOMB:
        this.dropBomb(game);
        break;
      case WEAPONS.GUN:
        this.shootGun(game);
        break;
      case WEAPONS.MISSILE:
        this.shootMissile(game);
        break;
      case WEAPONS.NAPALM:
        this.dropNapalm(game);
        break;
    }
  }

  // 投炸弹
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

  // 发射空对地导弹
  shootMissile(game) {
    const missile = new PlayerMissile(game, this.mesh.position.clone());
    game.addEntity(missile);
    game.audioManager.play('missile_launch');
    this.stats.missilesLaunched++;
  }

  // 投掷凝固汽油弹
  dropNapalm(game) {
    const napalm = new Napalm(game, this.mesh.position.clone());
    game.addEntity(napalm);
    game.audioManager.play('napalm_drop');
    this.stats.napalmDropped++;
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

    // 屏幕震动反馈
    if (game.sceneManager.triggerScreenShake) {
      game.sceneManager.triggerScreenShake(0.3, 0.5);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die(game);
    } else {
      this.isInvincible = true;
      this.invincibleTimer = 1.5;
    }
  }

  // 死亡
  die(game) {
    this.isAlive = false;
    this.mesh.visible = false;
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
      case 'fuel':
        this.refuel(FUEL_CONFIG.maxFuel * 0.4);
        break;
      case 'ammo':
        this.reloadAllAmmo(0.5);
        break;
      case 'weapon_crate':
        // 补满当前武器弹药 + 临时增加伤害
        this.reloadAmmo(this.currentWeapon, 1.0);
        break;
    }
  }

  // 补充燃料
  refuel(amount) {
    this.fuel = Math.min(this.fuel + amount, this.maxFuel);
    if (this.fuel > 0) {
      this.isFuelEmpty = false;
      // 恢复飞行高度
      if (this.mesh.position.y < this.altitude) {
        this.mesh.position.y = this.altitude;
      }
    }
  }

  // 补充指定武器弹药
  reloadAmmo(weaponType, percent = 0.5) {
    const max = this.maxAmmo[weaponType];
    if (max) {
      this.ammo[weaponType] = Math.min(
        this.ammo[weaponType] + Math.ceil(max * percent),
        max
      );
    }
  }

  // 补充所有武器弹药
  reloadAllAmmo(percent = 0.5) {
    for (const weapon of this.weapons) {
      this.reloadAmmo(weapon, percent);
    }
  }

  // 应用升级
  applyUpgrades(upgrades) {
    if (upgrades.speed) {
      this.speed = PLAYER_DEFAULTS.speed * (upgrades.speed || 1);
    }
    if (upgrades.maxHP) {
      this.maxHP = upgrades.maxHP;
      this.hp = this.maxHP;
    }
    if (upgrades.fuelCapacity) {
      this.maxFuel = upgrades.fuelCapacity;
      this.fuel = this.maxFuel;
    }
    if (upgrades.ammoCapacity) {
      const mult = upgrades.ammoCapacity;
      for (const weapon of this.weapons) {
        this.maxAmmo[weapon] = Math.ceil(WEAPON_CONFIG[weapon].maxAmmo * mult);
      }
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

    // 重置燃料
    this.fuel = this.maxFuel;
    this.isFuelEmpty = false;

    // 重置弹药
    this.ammo = {
      [WEAPONS.BOMB]: WEAPON_CONFIG.bomb.startAmmo,
      [WEAPONS.GUN]: WEAPON_CONFIG.gun.startAmmo,
      [WEAPONS.MISSILE]: WEAPON_CONFIG.missile.startAmmo,
      [WEAPONS.NAPALM]: WEAPON_CONFIG.napalm.startAmmo
    };

    // 重置武器
    this.currentWeaponIndex = 0;
    this.currentWeapon = this.weapons[0];

    // 重置警告
    this.warnings = {
      lowFuel: false,
      criticalFuel: false,
      radarLocked: false,
      missileIncoming: false,
      emptyAmmo: false
    };

    // 重置统计
    this.stats = {
      bombsDropped: 0, bulletsShot: 0, missilesLaunched: 0,
      napalmDropped: 0, targetsDestroyed: 0, consecutiveHits: 0,
      damageReceived: 0, pickupsCollected: 0, missilesEvaded: 0,
      fightersShot: 0, fuelUsed: 0
    };
  }

  // 销毁
  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
