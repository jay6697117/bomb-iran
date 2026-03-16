// ============================
// 雷达站 — 探测玩家、提升防空网精度
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { ENEMY_CONFIG, COLORS } from '../utils/constants.js';
import { distanceXZ } from '../utils/helpers.js';

export class RadarStation {
  constructor(game, config = {}) {
    const radarConf = ENEMY_CONFIG.radar;
    const { x = 0, z = 0 } = config;

    this.hp = radarConf.hp;
    this.maxHp = radarConf.hp;
    this.detectionRange = radarConf.detectionRange;
    this.rotationSpeed = radarConf.rotationSpeed;
    this.alertBonus = radarConf.alertBonus;
    this.scanInterval = radarConf.scanInterval;
    this.scoreValue = radarConf.scoreValue;

    this.isDestroyed = false;
    this.isTarget = true;
    this.type = 'radar';
    this.scanTimer = 0;
    this.isPlayerDetected = false;

    // 扫描波纹
    this.scanRipples = [];

    // 创建雷达站模型
    this.mesh = this.createRadarModel();
    this.mesh.position.set(x, 0, z);
    game.sceneManager.scene.add(this.mesh);
  }

  createRadarModel() {
    const group = new THREE.Group();

    // 基座（混凝土底座）
    const baseGeo = new THREE.CylinderGeometry(0.8, 1, 0.5, 8);
    const baseMat = createMaterial('metal', 0x636e72);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    // 支撑柱
    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.2, 2, 6);
    const pillarMat = createMaterial('metal', 0x2d3436);
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 1.5;
    group.add(pillar);

    // 旋转的碟形天线
    this.dishGroup = new THREE.Group();
    this.dishGroup.position.y = 2.5;

    const dishGeo = new THREE.CylinderGeometry(0, 1.2, 0.3, 8);
    const dishMat = createMaterial('metal', COLORS.radarDish);
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = Math.PI / 6;
    this.dishGroup.add(dish);

    // 天线反射面
    const reflectorGeo = new THREE.BoxGeometry(0.1, 0.8, 0.05);
    const reflectorMat = createMaterial('metal', COLORS.radar);
    const reflector = new THREE.Mesh(reflectorGeo, reflectorMat);
    reflector.position.y = 0.2;
    this.dishGroup.add(reflector);

    group.add(this.dishGroup);

    // 状态指示灯
    const lightGeo = new THREE.SphereGeometry(0.1, 6, 4);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.statusLight = new THREE.Mesh(lightGeo, lightMat);
    this.statusLight.position.y = 2.8;
    group.add(this.statusLight);

    return group;
  }

  update(game, deltaTime) {
    if (this.isDestroyed) return;

    // 天线旋转
    this.dishGroup.rotation.y += this.rotationSpeed * deltaTime;

    // 扫描逻辑
    this.scanTimer += deltaTime;
    if (this.scanTimer >= this.scanInterval) {
      this.scanTimer = 0;
      this.scan(game);
    }

    // 状态灯
    if (this.isPlayerDetected) {
      // 探测到玩家时红色快速闪烁
      this.statusLight.material.color.setHex(
        Math.floor(performance.now() / 200) % 2 === 0 ? 0xff0000 : 0x990000
      );
    } else {
      // 正常绿色慢闪
      this.statusLight.material.color.setHex(
        Math.floor(performance.now() / 1000) % 2 === 0 ? 0x00ff00 : 0x009900
      );
    }

    // 更新扫描波纹
    for (let i = this.scanRipples.length - 1; i >= 0; i--) {
      const ripple = this.scanRipples[i];
      ripple.life -= deltaTime;
      const progress = 1 - ripple.life / ripple.maxLife;
      ripple.mesh.scale.setScalar(1 + progress * this.detectionRange / 2);
      ripple.mesh.material.opacity = Math.max(0, 0.3 * (1 - progress));
      if (ripple.life <= 0) {
        game.sceneManager.scene.remove(ripple.mesh);
        this.scanRipples.splice(i, 1);
      }
    }
  }

  // 执行扫描
  scan(game) {
    const player = game.player;
    this.isPlayerDetected = false;

    if (player && player.isAlive) {
      const dist = distanceXZ(this.mesh.position, player.mesh.position);
      if (dist < this.detectionRange) {
        this.isPlayerDetected = true;
        // 标记玩家被雷达锁定
        player.warnings.radarLocked = true;
        // 提升附近防空火力
        this.boostNearbyDefenses(game, true);
      } else {
        player.warnings.radarLocked = false;
      }
    }

    // 扫描波纹视觉效果
    this.createScanRipple(game);
  }

  // 提升/降低附近防空火力
  boostNearbyDefenses(game, boost) {
    if (!game.combatSystem) return;

    const range = this.detectionRange;
    // 提升防空炮
    for (const aa of game.combatSystem.antiAirs) {
      if (aa.isDestroyed) continue;
      const dist = distanceXZ(this.mesh.position, aa.mesh.position);
      if (dist < range) {
        aa.setAlertLevel(boost ? 'high' : 'low');
      }
    }
    // 提升 SAM 阵地
    for (const sam of (game.combatSystem.samSites || [])) {
      if (sam.isDestroyed) continue;
      const dist = distanceXZ(this.mesh.position, sam.mesh.position);
      if (dist < range) {
        sam.setAlertLevel(boost ? 'high' : 'low');
      }
    }
  }

  // 创建扫描波纹
  createScanRipple(game) {
    const geo = new THREE.RingGeometry(0.5, 1, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: this.isPlayerDetected ? 0xff0000 : COLORS.radar,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ripple = new THREE.Mesh(geo, mat);
    ripple.position.copy(this.mesh.position);
    ripple.position.y = 3;
    ripple.rotation.x = -Math.PI / 2;
    game.sceneManager.scene.add(ripple);

    this.scanRipples.push({
      mesh: ripple,
      life: 1.5,
      maxLife: 1.5
    });
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

    // 雷达被摧毁，降低附近防空警戒
    this.boostNearbyDefenses(game, false);

    // 取消玩家的雷达锁定警告
    if (game.player) {
      game.player.warnings.radarLocked = false;
      game.player.stats.targetsDestroyed++;
    }

    // 爆炸
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.mesh.position.clone(), 4, false);
      game.addEntity(expl);
    });

    game.sceneManager.scene.remove(this.mesh);
    game.audioManager.play('explosion');
    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
    for (const r of this.scanRipples) {
      game.sceneManager.scene.remove(r.mesh);
    }
    this.scanRipples = [];
  }
}
