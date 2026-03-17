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

    // 创建飞机模型（从 AssetLoader 获取）
    this.mesh = this.createPlaneModel(game);
    this.mesh.position.set(0, this.altitude, 0);
    game.sceneManager.scene.add(this.mesh);

    // === 飞行物理模型参数 ===
    // 速度向量（世界坐标系）
    this.velocity = { x: 0, z: 0 };
    // 飞行朝向角（弧度，0 = 朝 -Z，即屏幕上方）
    this.heading = 0;
    // 当前前进速度标量
    this.currentThrust = 0;
    // 飞行姿态参数（平滑过渡用）
    this.rollAngle = 0;    // 当前 roll
    this.pitchAngle = 0;   // 当前 pitch
    this.yawAngle = 0;     // 当前 yaw（模型偏航展示用）
    this.flyTimer = 0;     // 飞行计时器（自然浮动）
    // 飞行物理常量
    this.thrustAccel = 18;    // 推力加速度
    this.dragFactor = 3.0;    // 空气阻力系数
    this.turnRate = 2.8;      // 转向速率（弧度/秒）
    this.maxRoll = 0.7;       // 最大 roll 倾斜（弧度）
    this.maxPitch = 0.3;      // 最大 pitch 俯仰（弧度）
    this.rollSmooth = 5;      // roll 平滑速度
    this.pitchSmooth = 4;     // pitch 平滑速度
    this.headingSmooth = 4;   // 朝向平滑速度

    // 推进器火焰效果
    this.thrusterFlicker = 0;

    // 空弹匣冷却（避免连续播放音效）
    this.emptyClipTimer = 0;
  }

  createPlaneModel(game) {
    // 从 AssetLoader 获取预加载的 GLTF 模型
    const group = game.assetLoader.getModel('player');

    // 获取推进器引用（由 AssetLoader 存储在 userData 中）
    this.thruster = group.userData.thruster || null;

    // 如果推进器引用丢失（clone 后 userData 可能不包含 Mesh 引用）
    // 需要手动查找或重新创建
    if (!this.thruster) {
      // 在 clone 的 group 中查找推进器（最后一个 ConeGeometry Mesh）
      group.traverse((child) => {
        if (child.isMesh && child.geometry.type === 'ConeGeometry' && child.material.emissive) {
          this.thruster = child;
        }
      });
    }

    // 兜底：如果仍然没找到推进器，创建一个
    if (!this.thruster) {
      const thrusterGeo = new THREE.ConeGeometry(0.14, 0.6, 6);
      const thrusterMat = new THREE.MeshStandardMaterial({
        color: 0xff6b35,
        emissive: new THREE.Color(0xff6b35),
        emissiveIntensity: 2.0
      });
      this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
      this.thruster.position.set(0, 0, 1.75);
      this.thruster.rotation.x = -Math.PI / 2;
      group.add(this.thruster);
    }

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
    const maxSpeed = isBoosting ? this.speed * 1.5 : this.speed;

    // 如果燃料耗尽，飞机逐渐下坠
    if (this.isFuelEmpty) {
      this.mesh.position.y -= FUEL_CONFIG.descentRate * deltaTime;
      if (this.mesh.position.y <= 0) {
        this.die(game);
        return;
      }
    }

    // === 真实飞行物理 ===
    const hasInput = movement.x !== 0 || movement.z !== 0;

    if (hasInput) {
      // 计算输入方向的目标朝向角
      const targetHeading = Math.atan2(-movement.x, -movement.z);

      // 计算朝向差值（取最短路径）
      let headingDiff = targetHeading - this.heading;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

      // 平滑转向 — 飞机逐渐转向目标方向
      this.heading += headingDiff * this.headingSmooth * deltaTime;

      // 推力加速 — 模拟引擎推力
      this.currentThrust += this.thrustAccel * deltaTime;
      this.currentThrust = Math.min(this.currentThrust, maxSpeed);

      // 将推力转化为速度向量（沿飞机朝向）
      this.velocity.x = -Math.sin(this.heading) * this.currentThrust;
      this.velocity.z = -Math.cos(this.heading) * this.currentThrust;

      // === 飞行姿态 ===
      // Roll（bank turn）— 转弯时的倾斜，倾斜量与转向差成正比
      const targetRoll = clamp(-headingDiff * 2.5, -this.maxRoll, this.maxRoll);
      this.rollAngle += (targetRoll - this.rollAngle) * this.rollSmooth * deltaTime;

      // Pitch — 加速时抬头，减速时低头
      const speedRatio = this.currentThrust / maxSpeed;
      const targetPitch = -speedRatio * this.maxPitch * 0.6;
      this.pitchAngle += (targetPitch - this.pitchAngle) * this.pitchSmooth * deltaTime;

    } else {
      // 无输入时 — 空气阻力减速（指数衰减）
      this.currentThrust *= (1 - this.dragFactor * deltaTime);
      this.velocity.x *= (1 - this.dragFactor * deltaTime);
      this.velocity.z *= (1 - this.dragFactor * deltaTime);

      // 接近零时完全停止（避免无限滑行）
      if (Math.abs(this.currentThrust) < 0.1) {
        this.currentThrust = 0;
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      // 姿态回正
      this.rollAngle += (0 - this.rollAngle) * this.rollSmooth * deltaTime;
      this.pitchAngle += (0 - this.pitchAngle) * this.pitchSmooth * deltaTime;
    }

    // 应用速度到位置
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.z += this.velocity.z * deltaTime;

    // 限制移动范围（触边时反弹减速）
    if (this.mesh.position.x < -45 || this.mesh.position.x > 45) {
      this.mesh.position.x = clamp(this.mesh.position.x, -45, 45);
      this.velocity.x *= -0.3;
      this.currentThrust *= 0.5;
    }
    if (this.mesh.position.z < -45 || this.mesh.position.z > 45) {
      this.mesh.position.z = clamp(this.mesh.position.z, -45, 45);
      this.velocity.z *= -0.3;
      this.currentThrust *= 0.5;
    }

    // 飞行计时（用于自然浮动）
    this.flyTimer += deltaTime;

    // === 应用飞机姿态到模型 ===
    // 主朝向（yaw）
    this.mesh.rotation.y = this.heading;
    // 侧倾（roll）
    this.mesh.rotation.z = this.rollAngle;
    // 俯仰（pitch）+ 自然浮动
    const floatPitch = Math.sin(this.flyTimer * 1.5) * 0.02;
    this.mesh.rotation.x = this.pitchAngle + floatPitch;

    // 自然高度浮动
    if (!this.isFuelEmpty) {
      const floatY = Math.sin(this.flyTimer * 1.2) * 0.08
                   + Math.sin(this.flyTimer * 2.7) * 0.03;
      this.mesh.position.y = this.altitude + floatY;
    }

    // 推进器火焰 — 根据推力大小动态调整
    if (this.thruster && this.thruster.scale) {
      if (!this.isFuelEmpty) {
        this.thrusterFlicker += deltaTime * 15;
        const speedRatio = this.currentThrust / maxSpeed;
        // 火焰大小随推力变化
        const baseScale = 0.3 + speedRatio * 0.8;
        const flickerScale = baseScale + Math.sin(this.thrusterFlicker) * 0.2;
        this.thruster.scale.y = flickerScale;
        this.thruster.scale.x = 0.8 + speedRatio * 0.4;
        this.thruster.scale.z = 0.8 + speedRatio * 0.4;
        if (this.thruster.material && this.thruster.material.color) {
          // 低速时橙色，高速时偏黄白
          this.thruster.material.color.setHex(
            speedRatio > 0.7 ? 0xffd93d : 0xff6b35
          );
        }
        this.thruster.visible = true;
      } else {
        this.thruster.visible = false;
      }
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

    // 重置飞行物理参数
    this.velocity = { x: 0, z: 0 };
    this.heading = 0;
    this.currentThrust = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;
    this.yawAngle = 0;
    this.flyTimer = 0;

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
