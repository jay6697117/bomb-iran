// ============================
// 空投补给箱 — 降落伞下降、限时拾取
// ============================
import * as THREE from 'three';
import { SUPPLY_CONFIG, COLORS } from '../utils/constants.js';

export class SupplyDrop {
  constructor(game, config = {}) {
    const { x = 0, z = 0, type = 'ammo_crate' } = config;

    this.type = type; // 'ammo_crate' | 'fuel_tank' | 'weapon_kit'
    this.isCollected = false;
    this.hasLanded = false;
    this.despawnTimer = 0;
    this.lifetime = 0;
    this.fallSpeed = SUPPLY_CONFIG.fallSpeed;
    this.despawnTime = SUPPLY_CONFIG.despawnTime;
    this.floatOffset = Math.random() * Math.PI * 2;

    // 补给箱模型
    this.mesh = new THREE.Group();

    // 箱子主体
    const crateGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const crateColor = type === 'fuel_tank' ? COLORS.pickupFuel
      : type === 'weapon_kit' ? COLORS.pickupWeaponCrate
      : COLORS.pickupAmmo;
    const crateMat = new THREE.MeshBasicMaterial({
      color: crateColor,
      transparent: true,
      opacity: 0.9
    });
    this.crate = new THREE.Mesh(crateGeo, crateMat);
    this.mesh.add(this.crate);

    // 十字标志（补给标识）
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    crossH.position.z = 0.41;
    this.mesh.add(crossH);
    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.08, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    crossV.position.z = 0.41;
    crossV.rotation.y = Math.PI / 2;
    this.mesh.add(crossV);

    // 降落伞
    this.parachute = new THREE.Group();
    const canopyGeo = new THREE.SphereGeometry(1.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyMat = new THREE.MeshBasicMaterial({
      color: COLORS.supplyParachute,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 2;
    this.parachute.add(canopy);

    // 绳索（简单的线条）
    for (let i = 0; i < 4; i++) {
      const ropeGeo = new THREE.CylinderGeometry(0.01, 0.01, 2, 3);
      const ropeMat = new THREE.MeshBasicMaterial({ color: 0x95a5a6 });
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      const angle = (i / 4) * Math.PI * 2;
      rope.position.set(Math.cos(angle) * 0.3, 1, Math.sin(angle) * 0.3);
      rope.rotation.z = Math.cos(angle) * 0.15;
      rope.rotation.x = Math.sin(angle) * 0.15;
      this.parachute.add(rope);
    }

    this.mesh.add(this.parachute);

    // 外圈光晕
    const glowGeo = new THREE.SphereGeometry(1.2, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: crateColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.mesh.add(this.glow);

    // 初始位置（高空）
    this.mesh.position.set(x, 25, z);
    game.sceneManager.scene.add(this.mesh);
  }

  update(game, deltaTime) {
    if (this.isCollected) return;

    this.lifetime += deltaTime;

    if (!this.hasLanded) {
      // 下降阶段
      this.mesh.position.y -= this.fallSpeed * deltaTime;

      // 降落伞缓慢摆动
      this.parachute.rotation.y += deltaTime * 0.5;
      this.parachute.rotation.z = Math.sin(this.lifetime * 2) * 0.1;

      // 箱子轻微旋转
      this.crate.rotation.y += deltaTime * 0.3;

      // 着地
      if (this.mesh.position.y <= 5) { // 着陆在飞行高度附近
        this.mesh.position.y = 5;
        this.hasLanded = true;
        // 降落伞消失
        this.parachute.visible = false;
      }
    } else {
      // 着地后漂浮等待拾取
      this.despawnTimer += deltaTime;
      this.floatOffset += deltaTime * 2;
      this.mesh.position.y = 5 + Math.sin(this.floatOffset) * 0.3;

      // 光晕脉动
      const pulse = 0.8 + Math.sin(this.floatOffset * 1.5) * 0.2;
      this.glow.scale.setScalar(pulse);

      // 即将消失时闪烁
      if (this.despawnTimer > this.despawnTime - 5) {
        this.mesh.visible = Math.floor(this.despawnTimer * 4) % 2 === 0;
      }

      // 超时消失
      if (this.despawnTimer >= this.despawnTime) {
        game.removeEntity(this);
        return;
      }

      // 拾取检测
      if (game.player && game.player.isAlive) {
        const dist = this.mesh.position.distanceTo(game.player.mesh.position);
        if (dist < 2) {
          this.collect(game);
        }
      }
    }
  }

  collect(game) {
    if (this.isCollected) return;
    this.isCollected = true;

    const player = game.player;
    if (!player) return;

    // 根据类型补给
    switch (this.type) {
      case 'ammo_crate':
        player.reloadAllAmmo(SUPPLY_CONFIG.ammoRefillPercent);
        break;
      case 'fuel_tank':
        player.refuel(SUPPLY_CONFIG.fuelAmount);
        break;
      case 'weapon_kit':
        player.reloadAmmo(player.currentWeapon, 1.0);
        player.refuel(20);
        break;
    }

    player.stats.pickupsCollected++;
    game.audioManager.play('supply_drop');

    // 拾取动画
    let animTime = 0;
    const animEntity = {
      update: (game, dt) => {
        animTime += dt;
        if (animTime >= 0.3) {
          game.sceneManager.scene.remove(this.mesh);
          game.removeEntity(animEntity);
          return;
        }
        this.mesh.scale.setScalar(1 - animTime / 0.3);
        this.mesh.position.y += dt * 3;
      },
      destroy: () => {}
    };
    game.addEntity(animEntity);
    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
  }
}
