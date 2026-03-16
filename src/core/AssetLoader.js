// ============================
// 统一资源加载器
// 支持 GLTFLoader 加载 .glb 模型
// 若无 .glb 文件则使用程序化模型作为回退
// ============================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { COLORS } from '../utils/constants.js';

export class AssetLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.models = new Map();        // 模型缓存
    this.isLoaded = false;
  }

  /**
   * 预加载所有模型
   * 先尝试加载 .glb 文件，失败则用程序化模型
   */
  async preloadAll() {
    const modelNames = ['player', 'enemy_fighter', 'boss'];

    const tasks = modelNames.map(async (name) => {
      try {
        // 尝试加载 .glb 文件
        const gltf = await this.loadGLTF(`/models/${name}.glb`);
        const model = gltf.scene;
        // 开启阴影
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.models.set(name, model);
        console.log(`✅ 模型加载成功: ${name}.glb`);
      } catch {
        // 加载失败，使用程序化模型
        const model = this.buildProceduralModel(name);
        this.models.set(name, model);
        console.log(`🔧 使用程序化模型: ${name}`);
      }
    });

    await Promise.all(tasks);
    this.isLoaded = true;
    console.log('📦 全部模型加载完成');
  }

  /**
   * GLTFLoader Promise 封装
   */
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });
  }

  /**
   * 获取模型克隆（每个实体使用独立副本）
   */
  getModel(name) {
    const model = this.models.get(name);
    if (!model) {
      console.warn(`[AssetLoader] 模型不存在: ${name}`);
      return new THREE.Group();
    }
    return model.clone();
  }

  /**
   * 程序化模型生成（回退方案）
   */
  buildProceduralModel(name) {
    switch (name) {
      case 'player':
        return this.buildPlayerModel();
      case 'enemy_fighter':
        return this.buildEnemyFighterModel();
      case 'boss':
        return this.buildBossModel();
      default:
        return new THREE.Group();
    }
  }

  // ============================
  // 玩家飞机 — F-16 风格高精度模型
  // ============================
  buildPlayerModel() {
    const group = new THREE.Group();

    // === 机身 — 流线型 ===
    // 前机身（尖锐机头）
    const noseGeo = new THREE.ConeGeometry(0.25, 1.2, 8);
    const noseMat = createMaterial('paint', COLORS.player);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -1.8;
    nose.castShadow = true;
    group.add(nose);

    // 中机身（稍粗的圆柱+球体混合）
    const bodyGeo = new THREE.CylinderGeometry(0.28, 0.35, 2.2, 12);
    const bodyMat = createMaterial('paint', COLORS.player);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.2;
    body.castShadow = true;
    group.add(body);

    // 后机身（收窄）
    const rearGeo = new THREE.CylinderGeometry(0.3, 0.22, 1.2, 10);
    const rearMat = createMaterial('paint', COLORS.player);
    const rear = new THREE.Mesh(rearGeo, rearMat);
    rear.rotation.x = Math.PI / 2;
    rear.position.z = 1.0;
    rear.castShadow = true;
    group.add(rear);

    // === 驾驶舱 — 气泡式座舱罩 ===
    const canopyGeo = new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const canopyMat = createMaterial('glass', 0x5dade2);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.26, -0.7);
    canopy.scale.set(1, 0.8, 1.6);
    group.add(canopy);

    // 座舱框架条
    const frameGeo = new THREE.BoxGeometry(0.02, 0.22, 0.6);
    const frameMat = createMaterial('metal', 0x555555);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 0.3, -0.7);
    group.add(frame);

    // === 主翼 — 后掠翼设计 ===
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.8, -0.3);
    wingShape.lineTo(1.6, -0.5);
    wingShape.lineTo(0.3, -0.9);
    wingShape.lineTo(0, -0.8);
    wingShape.closePath();

    const wingExtrudeSettings = { depth: 0.06, bevelEnabled: false };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
    const wingMat = createMaterial('paint', COLORS.playerWing || 0x1a5276);

    // 左翼
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, -0.05, 0.1);
    leftWing.castShadow = true;
    group.add(leftWing);

    // 右翼（镜像）
    const rightWingGeo = wingGeo.clone();
    rightWingGeo.scale(-1, 1, 1);
    const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
    rightWing.position.set(0, -0.05, 0.1);
    rightWing.castShadow = true;
    group.add(rightWing);

    // === 进气口 ===
    const intakeGeo = new THREE.BoxGeometry(0.24, 0.18, 0.5);
    const intakeMat = createMaterial('metal', 0x2c3e50);
    const leftIntake = new THREE.Mesh(intakeGeo, intakeMat);
    leftIntake.position.set(-0.35, -0.1, -0.3);
    group.add(leftIntake);
    const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
    rightIntake.position.set(0.35, -0.1, -0.3);
    group.add(rightIntake);

    // === 水平尾翼 ===
    const hTailShape = new THREE.Shape();
    hTailShape.moveTo(0, 0);
    hTailShape.lineTo(0.6, -0.1);
    hTailShape.lineTo(0.4, -0.35);
    hTailShape.lineTo(0, -0.3);
    hTailShape.closePath();

    const hTailGeo = new THREE.ExtrudeGeometry(hTailShape, { depth: 0.04, bevelEnabled: false });

    const leftHTail = new THREE.Mesh(hTailGeo, wingMat);
    leftHTail.position.set(0, 0.05, 1.3);
    group.add(leftHTail);

    const rightHTailGeo = hTailGeo.clone();
    rightHTailGeo.scale(-1, 1, 1);
    const rightHTail = new THREE.Mesh(rightHTailGeo, wingMat);
    rightHTail.position.set(0, 0.05, 1.3);
    group.add(rightHTail);

    // === 垂直尾翼 ===
    const vTailShape = new THREE.Shape();
    vTailShape.moveTo(0, 0);
    vTailShape.lineTo(0.15, 0.7);
    vTailShape.lineTo(0.04, 0.75);
    vTailShape.lineTo(-0.04, 0.2);
    vTailShape.closePath();

    const vTailGeo = new THREE.ExtrudeGeometry(vTailShape, { depth: 0.04, bevelEnabled: false });
    const vTailMat = createMaterial('paint', COLORS.playerWing || 0x1a5276);
    const vTail = new THREE.Mesh(vTailGeo, vTailMat);
    vTail.position.set(-0.02, 0.1, 1.2);
    group.add(vTail);

    // === 发动机喷口 ===
    const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.3, 10);
    const nozzleMat = createMaterial('metal', 0x444444);
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 1.55;
    group.add(nozzle);

    // === 推进器火焰（动态效果用） ===
    const thrusterGeo = new THREE.ConeGeometry(0.14, 0.6, 6);
    const thrusterMat = createMaterial('emissive', 0xff6b35);
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.position.set(0, 0, 1.75);
    thruster.rotation.x = -Math.PI / 2;
    group.add(thruster);
    // 存储引用以便动画
    group.userData.thruster = thruster;

    // === 翼下挂架 + 导弹/副油箱 ===
    const pylonGeo = new THREE.BoxGeometry(0.04, 0.18, 0.2);
    const pylonMat = createMaterial('metal', 0x636e72);

    // 左内侧挂架 + 导弹
    const lInnerPylon = new THREE.Mesh(pylonGeo, pylonMat);
    lInnerPylon.position.set(-0.6, -0.22, 0.05);
    group.add(lInnerPylon);
    const missileGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6);
    const missileMat = createMaterial('paint', 0xcccccc);
    const lMissile = new THREE.Mesh(missileGeo, missileMat);
    lMissile.rotation.x = Math.PI / 2;
    lMissile.position.set(-0.6, -0.35, 0.05);
    group.add(lMissile);

    // 右内侧挂架 + 导弹
    const rInnerPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rInnerPylon.position.set(0.6, -0.22, 0.05);
    group.add(rInnerPylon);
    const rMissile = new THREE.Mesh(missileGeo, missileMat);
    rMissile.rotation.x = Math.PI / 2;
    rMissile.position.set(0.6, -0.35, 0.05);
    group.add(rMissile);

    // 左外侧挂架 + 副油箱
    const lOuterPylon = new THREE.Mesh(pylonGeo, pylonMat);
    lOuterPylon.position.set(-1.2, -0.18, -0.05);
    group.add(lOuterPylon);
    const tankGeo = new THREE.CapsuleGeometry(0.06, 0.4, 4, 8);
    const tankMat = createMaterial('paint', 0x888888);
    const lTank = new THREE.Mesh(tankGeo, tankMat);
    lTank.rotation.x = Math.PI / 2;
    lTank.position.set(-1.2, -0.3, -0.05);
    group.add(lTank);

    // 右外侧挂架 + 副油箱
    const rOuterPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rOuterPylon.position.set(1.2, -0.18, -0.05);
    group.add(rOuterPylon);
    const rTank = new THREE.Mesh(tankGeo, tankMat);
    rTank.rotation.x = Math.PI / 2;
    rTank.position.set(1.2, -0.3, -0.05);
    group.add(rTank);

    // === 翼尖天线 ===
    const tipGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.2, 4);
    const tipMat = createMaterial('emissive', 0x00ff44);
    const lTip = new THREE.Mesh(tipGeo, tipMat);
    lTip.position.set(-1.7, 0, -0.15);
    group.add(lTip);
    const rTip = new THREE.Mesh(tipGeo, tipMat);
    rTip.position.set(1.7, 0, -0.15);
    group.add(rTip);

    group.scale.set(0.75, 0.75, 0.75);
    return group;
  }

  // ============================
  // 敌方战斗机 — MiG-29 风格
  // ============================
  buildEnemyFighterModel() {
    const group = new THREE.Group();

    // 机头（尖锥）
    const noseGeo = new THREE.ConeGeometry(0.18, 1.0, 8);
    const noseMat = createMaterial('paint', COLORS.enemyFighter || 0xc0392b);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -1.5;
    nose.castShadow = true;
    group.add(nose);

    // 中机身
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.8, 10);
    const bodyMat = createMaterial('paint', COLORS.enemyFighter || 0xc0392b);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.1;
    body.castShadow = true;
    group.add(body);

    // 后机身
    const rearGeo = new THREE.CylinderGeometry(0.25, 0.18, 1.0, 8);
    const rearMat = createMaterial('paint', COLORS.enemyFighter || 0xc0392b);
    const rear = new THREE.Mesh(rearGeo, rearMat);
    rear.rotation.x = Math.PI / 2;
    rear.position.z = 0.8;
    rear.castShadow = true;
    group.add(rear);

    // 驾驶舱
    const canopyGeo = new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const canopyMat = createMaterial('glass', 0x2d3436);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.2, -0.5);
    canopy.scale.set(1, 0.7, 1.3);
    group.add(canopy);

    // 三角翼
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.4, -0.2);
    wingShape.lineTo(1.2, -0.45);
    wingShape.lineTo(0.15, -0.7);
    wingShape.lineTo(0, -0.6);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: false });
    const wingMat = createMaterial('paint', COLORS.enemyFighterWing || 0xa93226);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, -0.03, 0.05);
    leftWing.castShadow = true;
    group.add(leftWing);

    const rightWingGeo = wingGeo.clone();
    rightWingGeo.scale(-1, 1, 1);
    const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
    rightWing.position.set(0, -0.03, 0.05);
    rightWing.castShadow = true;
    group.add(rightWing);

    // 水平尾翼
    const hTailGeo = new THREE.BoxGeometry(0.9, 0.035, 0.25);
    const hTail = new THREE.Mesh(hTailGeo, wingMat);
    hTail.position.set(0, 0, 1.1);
    group.add(hTail);

    // 双垂尾（MiG-29 标志性特征）
    const vTailGeo = new THREE.BoxGeometry(0.04, 0.45, 0.3);
    const vTailMat = createMaterial('paint', COLORS.enemyFighterWing || 0xa93226);
    const lVTail = new THREE.Mesh(vTailGeo, vTailMat);
    lVTail.position.set(-0.2, 0.25, 1.0);
    lVTail.rotation.z = 0.15; // 微微外倾
    group.add(lVTail);
    const rVTail = new THREE.Mesh(vTailGeo, vTailMat);
    rVTail.position.set(0.2, 0.25, 1.0);
    rVTail.rotation.z = -0.15;
    group.add(rVTail);

    // 双发动机喷口
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.25, 8);
    const nozzleMat = createMaterial('metal', 0x444444);
    const lNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    lNozzle.rotation.x = Math.PI / 2;
    lNozzle.position.set(-0.15, 0, 1.3);
    group.add(lNozzle);
    const rNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    rNozzle.rotation.x = Math.PI / 2;
    rNozzle.position.set(0.15, 0, 1.3);
    group.add(rNozzle);

    // 发动机火焰
    const flameGeo = new THREE.ConeGeometry(0.08, 0.35, 5);
    const flameMat = createMaterial('emissive', 0xff6b35);
    const lFlame = new THREE.Mesh(flameGeo, flameMat);
    lFlame.rotation.x = -Math.PI / 2;
    lFlame.position.set(-0.15, 0, 1.45);
    group.add(lFlame);
    const rFlame = new THREE.Mesh(flameGeo, flameMat);
    rFlame.rotation.x = -Math.PI / 2;
    rFlame.position.set(0.15, 0, 1.45);
    group.add(rFlame);
    group.userData.engine = lFlame; // 引擎引用（动画用）
    group.userData.engine2 = rFlame;

    // 进气口
    const intakeGeo = new THREE.BoxGeometry(0.16, 0.14, 0.35);
    const intakeMat = createMaterial('metal', 0x333333);
    const lIntake = new THREE.Mesh(intakeGeo, intakeMat);
    lIntake.position.set(-0.25, -0.08, -0.2);
    group.add(lIntake);
    const rIntake = new THREE.Mesh(intakeGeo, intakeMat);
    rIntake.position.set(0.25, -0.08, -0.2);
    group.add(rIntake);

    // 翼尖导弹
    const tipMissileGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.35, 5);
    const tipMissileMat = createMaterial('paint', 0xdddddd);
    const lTipMissile = new THREE.Mesh(tipMissileGeo, tipMissileMat);
    lTipMissile.rotation.x = Math.PI / 2;
    lTipMissile.position.set(-1.35, -0.08, -0.1);
    group.add(lTipMissile);
    const rTipMissile = new THREE.Mesh(tipMissileGeo, tipMissileMat);
    rTipMissile.rotation.x = Math.PI / 2;
    rTipMissile.position.set(1.35, -0.08, -0.1);
    group.add(rTipMissile);

    group.scale.set(0.65, 0.65, 0.65);
    return group;
  }

  // ============================
  // BOSS 堡垒 — 大型军事设施
  // ============================
  buildBossModel() {
    const group = new THREE.Group();

    // === 装甲基座 — 多层结构 ===
    // 底座（八角形）
    const baseGeo = new THREE.CylinderGeometry(4.5, 5, 2, 8);
    const baseMat = createMaterial('metal', 0x2c3e50);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 中层平台
    const midGeo = new THREE.CylinderGeometry(3.5, 4, 1.5, 8);
    const midMat = createMaterial('metal', 0x34495e);
    const mid = new THREE.Mesh(midGeo, midMat);
    mid.position.y = 2.75;
    mid.castShadow = true;
    group.add(mid);

    // 装甲板条（基座侧面装甲细节）
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const panelGeo = new THREE.BoxGeometry(2, 1.5, 0.15);
      const panelMat = createMaterial('metal', 0x3d5c71);
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(Math.sin(angle) * 4.3, 1, Math.cos(angle) * 4.3);
      panel.rotation.y = angle;
      panel.castShadow = true;
      group.add(panel);
    }

    // === 核心塔 — 红色指挥塔 ===
    const towerGeo = new THREE.CylinderGeometry(1.2, 1.8, 4, 8);
    const towerMat = createMaterial('paint', 0xe74c3c);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 5.5;
    tower.castShadow = true;
    group.add(tower);
    group.userData.tower = tower;

    // 塔顶平台
    const topPlatGeo = new THREE.CylinderGeometry(1.5, 1.2, 0.3, 8);
    const topPlatMat = createMaterial('metal', 0x555555);
    const topPlat = new THREE.Mesh(topPlatGeo, topPlatMat);
    topPlat.position.y = 7.65;
    group.add(topPlat);

    // === 雷达天线 ===
    // 天线杆
    const antennaGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 4);
    const antennaMat = new THREE.MeshBasicMaterial({
      color: 0xff4444, transparent: true, opacity: 0.9
    });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 9;
    group.add(antenna);
    group.userData.antenna = antenna;

    // 雷达碟
    const dishGeo = new THREE.SphereGeometry(0.6, 8, 6, 0, Math.PI);
    const dishMat = createMaterial('metal', 0xcccccc);
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = 8.2;
    dish.rotation.x = Math.PI / 6;
    group.add(dish);

    // 天线顶部发光球
    const glowGeo = new THREE.SphereGeometry(0.35, 10, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    const glowOrb = new THREE.Mesh(glowGeo, glowMat);
    glowOrb.position.y = 10.4;
    group.add(glowOrb);
    group.userData.glowOrb = glowOrb;

    // === 侧翼炮台 ×4 ===
    const turretPositions = [
      [-3.5, 3.5, 0],
      [3.5, 3.5, 0],
      [0, 3.5, -3],
      [0, 3.5, 3]
    ];

    for (const [tx, ty, tz] of turretPositions) {
      const turretGroup = new THREE.Group();

      // 炮塔底座
      const turretBaseGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.0, 6);
      const turretBaseMat = createMaterial('metal', 0x636e72);
      const turretBase = new THREE.Mesh(turretBaseGeo, turretBaseMat);
      turretBase.castShadow = true;
      turretGroup.add(turretBase);

      // 炮塔头
      const turretHeadGeo = new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const turretHeadMat = createMaterial('metal', 0x555555);
      const turretHead = new THREE.Mesh(turretHeadGeo, turretHeadMat);
      turretHead.position.y = 0.5;
      turretGroup.add(turretHead);

      // 炮管
      const barrelGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6);
      const barrelMat = createMaterial('metal', 0x333333);
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.5, -0.8);
      turretGroup.add(barrel);

      turretGroup.position.set(tx, ty, tz);
      group.add(turretGroup);
    }

    // === 导弹发射架 ×2 ===
    for (const side of [-1, 1]) {
      const rackGroup = new THREE.Group();

      // 发射架底座
      const rackBaseGeo = new THREE.BoxGeometry(1, 0.3, 2);
      const rackBaseMat = createMaterial('metal', 0x555555);
      const rackBase = new THREE.Mesh(rackBaseGeo, rackBaseMat);
      rackGroup.add(rackBase);

      // 导弹 ×3
      for (let i = 0; i < 3; i++) {
        const missileGeo = new THREE.CapsuleGeometry(0.1, 0.8, 4, 8);
        const missileMat = createMaterial('paint', 0x888888);
        const missile = new THREE.Mesh(missileGeo, missileMat);
        missile.rotation.x = Math.PI / 2;
        missile.position.set(0, 0.2, -0.6 + i * 0.6);
        rackGroup.add(missile);
      }

      rackGroup.position.set(side * 2.5, 4, 0);
      group.add(rackGroup);
    }

    // === 沙袋/掩体（基座周围） ===
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const sandbagGeo = new THREE.CapsuleGeometry(0.3, 0.6, 4, 6);
      const sandbagMat = createMaterial('earth', 0xB8A07A);
      const sandbag = new THREE.Mesh(sandbagGeo, sandbagMat);
      sandbag.rotation.z = Math.PI / 2;
      sandbag.position.set(Math.sin(angle) * 5.5, 0.3, Math.cos(angle) * 5.5);
      sandbag.rotation.y = angle;
      group.add(sandbag);
    }

    // BOSS 发光点光源
    const bossLight = new THREE.PointLight(0xff4444, 2, 15);
    bossLight.position.y = 8;
    group.add(bossLight);
    group.userData.bossLight = bossLight;

    return group;
  }
}
