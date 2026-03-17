// ============================
// 地形生成器 — InstancedMesh 植被 + 水面 Shader
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { COLORS } from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';
import { applyWindShader, updateWindMaterial, updateWind } from '../shaders/WindShader.js';
import { createWaterSurface, updateWater } from '../shaders/WaterSurface.js';

// 地形主题配置
// 地形主题配置 - 色彩更鲜明、明亮
const TERRAIN_THEMES = {
  desert: {
    groundColor: 0xEDC9AF, // 更明媚的暖沙色
    skyColor: 0xFDECB5,
    fogColor: 0xFDECB5,
    edgeColor: 0xDBB894,   
    decorations: ['cactus', 'rock', 'dune', 'bush']
  },
  city: {
    groundColor: 0x8DAAA1, // 轻度灰绿色基调，避免死灰
    skyColor: 0x8FD6FF,
    fogColor: 0x8FD6FF,
    edgeColor: 0x76948D,   
    decorations: ['road', 'tree', 'lamppost', 'bush']
  },
  coast: {
    groundColor: 0xF5DEB3, // 更加金黄的米阳光沙滩
    skyColor: 0xA5EFFF,
    fogColor: 0xC5F4FF,
    edgeColor: 0x00A8CC,   // 海岸边缘：明亮的深青蓝色
    decorations: ['palm', 'rock', 'water', 'grass']
  },
  mountain: {
    groundColor: 0x6E857E, // 青翠的山林底色
    skyColor: 0xAFD6F5,
    fogColor: 0xCDE4F5,
    edgeColor: 0x516B64,   
    decorations: ['pine', 'rock', 'snow', 'grass']
  }
};

export class Terrain {
  constructor() {
    this.meshes = [];
    this.instancedMeshes = [];      // InstancedMesh 列表
    this.windMaterials = [];        // 需要更新风动画的材质
    this.waterMesh = null;          // 水面 Mesh
  }

  // 生成地形
  generate(game, theme = 'desert', size = 100) {
    this.clear(game);

    const config = TERRAIN_THEMES[theme] || TERRAIN_THEMES.desert;

    // 设置大气氛围（天空+雾效+光照色调）
    game.sceneManager.setAtmosphere(theme);

    // 地面
    const groundGeo = new THREE.PlaneGeometry(size, size, 32, 32);
    const groundMat = createMaterial('earth', config.groundColor);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.sceneManager.scene.add(ground);
    this.meshes.push(ground);

    // 边界外延伸平面 — 超大面积覆盖地形边界外的区域，避免白色露底
    const edgeSize = size * 8; // 足够大，覆盖视野范围
    const edgeGeo = new THREE.PlaneGeometry(edgeSize, edgeSize);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: config.edgeColor,
      roughness: 1.0,
      metalness: 0.0,
    });
    const edgePlane = new THREE.Mesh(edgeGeo, edgeMat);
    edgePlane.rotation.x = -Math.PI / 2;
    edgePlane.position.y = -0.05; // 略低于主地面，避免 z-fighting
    edgePlane.receiveShadow = true;
    game.sceneManager.scene.add(edgePlane);
    this.meshes.push(edgePlane);

    // 地形起伏（顶点偏移）- 让起伏更加圆润，有厚度的粘土感
    if (theme === 'mountain' || theme === 'desert' || theme === 'coast') {
      const pos = groundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // 多层低频噪音，创造平滑沙丘/山丘
        let noise = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 1.2
          + Math.sin(x * 0.2 + 1.1) * Math.cos(y * 0.15) * 0.6;
        
        // 增加“阶地”卡通感（Terraced effect）
        if (theme === 'mountain' || theme === 'desert') {
          noise = Math.round(noise * 1.5) / 1.5; // 故意制造阶梯感
        }

        pos.setZ(i, noise);
      }
      pos.needsUpdate = true;
      groundGeo.computeVertexNormals();
    }

    // 物理地面
    game.physicsWorld.createGroundBody();

    // 使用 InstancedMesh 的装饰物
    this.addInstancedDecorations(game, config, size, theme);

    return config;
  }

  // 使用 InstancedMesh 渲染植被
  addInstancedDecorations(game, config, size, theme) {
    const halfSize = size / 2;

    for (const decType of config.decorations) {
      switch (decType) {
        case 'cactus':
          this.addInstancedCactus(game, halfSize, 30);
          break;
        case 'rock':
          this.addInstancedRocks(game, halfSize, 20);
          break;
        case 'dune':
          this.addInstancedDunes(game, halfSize, 12);
          break;
        case 'tree':
          this.addInstancedTrees(game, halfSize, 40, 0x27ae60);
          break;
        case 'palm':
          this.addInstancedPalms(game, halfSize, 25);
          break;
        case 'pine':
          this.addInstancedPines(game, halfSize, 50);
          break;
        case 'bush':
          this.addInstancedBushes(game, halfSize, 35);
          break;
        case 'grass':
          this.addInstancedGrass(game, halfSize, 80);
          break;
        case 'road':
          this.addRoad(game, size);
          break;
        case 'water':
          this.addWater(game, size);
          break;
      }
    }
  }

  // === InstancedMesh 仙人掌 ===
  addInstancedCactus(game, halfSize, count) {
    // 主干几何体
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6);
    const trunkMat = createMaterial('foliage', 0x27ae60);
    applyWindShader(trunkMat, { strength: 0.05 }); // 仙人掌少摆动
    this.windMaterials.push(trunkMat);

    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkInstanced.castShadow = true;
    trunkInstanced.receiveShadow = true;

    // 侧臂几何体
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 5);
    const armMat = createMaterial('foliage', 0x2ecc71);
    applyWindShader(armMat, { strength: 0.08 });
    this.windMaterials.push(armMat);

    const armInstanced = new THREE.InstancedMesh(armGeo, armMat, count);
    armInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.75, halfSize * 0.75);
      const z = randomRange(-halfSize * 0.75, halfSize * 0.75);
      const scale = randomRange(0.7, 1.4);

      // 主干
      dummy.position.set(x, 0.9 * scale, z);
      dummy.rotation.set(0, randomRange(0, Math.PI * 2), 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      // 侧臂（偏移）
      dummy.position.set(x + 0.25 * scale, 1.1 * scale, z);
      dummy.rotation.set(0, randomRange(0, Math.PI * 2), Math.PI / 3);
      dummy.scale.setScalar(scale * 0.8);
      dummy.updateMatrix();
      armInstanced.setMatrixAt(i, dummy.matrix);

      // 微妙色差
      color.setHSL(0.35 + randomRange(-0.03, 0.03), 0.6, 0.35 + randomRange(-0.05, 0.05));
      trunkInstanced.setColorAt(i, color);
      armInstanced.setColorAt(i, color);
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    armInstanced.instanceMatrix.needsUpdate = true;
    if (trunkInstanced.instanceColor) trunkInstanced.instanceColor.needsUpdate = true;
    if (armInstanced.instanceColor) armInstanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(trunkInstanced);
    game.sceneManager.scene.add(armInstanced);
    this.instancedMeshes.push(trunkInstanced, armInstanced);
  }

  // === InstancedMesh 岩石 ===
  addInstancedRocks(game, halfSize, count) {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = createMaterial('stone', 0x7f8c8d);
    const instanced = new THREE.InstancedMesh(geo, mat, count);
    instanced.castShadow = true;
    instanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const z = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const scale = randomRange(0.25, 0.9);

      dummy.position.set(x, scale * 0.4, z);
      dummy.rotation.set(randomRange(0, 1), randomRange(0, 1), 0);
      dummy.scale.set(scale, scale * randomRange(0.5, 1.0), scale);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      // 灰色系变化
      const lightness = 0.4 + randomRange(-0.1, 0.1);
      color.setHSL(0.0, 0.05, lightness);
      instanced.setColorAt(i, color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(instanced);
    this.instancedMeshes.push(instanced);
  }

  // === InstancedMesh 沙丘 ===
  addInstancedDunes(game, halfSize, count) {
    const geo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = createMaterial('earth', 0xD4A76A);
    const instanced = new THREE.InstancedMesh(geo, mat, count);
    instanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const z = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const scaleXZ = randomRange(1.5, 4);
      const scaleY = randomRange(0.3, 0.6);

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, randomRange(0, Math.PI * 2), 0);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.1, 0.4 + randomRange(-0.1, 0.1), 0.6 + randomRange(-0.08, 0.08));
      instanced.setColorAt(i, color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(instanced);
    this.instancedMeshes.push(instanced);
  }

  // === InstancedMesh 树木 ===
  addInstancedTrees(game, halfSize, count, baseColor) {
    // 树干
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.12, 1.2, 6);
    const trunkMat = createMaterial('wood', 0x8d6e63);
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkInstanced.castShadow = true;

    // 树冠（球形，更大更茂密）
    const crownGeo = new THREE.IcosahedronGeometry(0.65, 1);
    const crownMat = createMaterial('foliage', baseColor);
    applyWindShader(crownMat, { strength: 0.12 });
    this.windMaterials.push(crownMat);
    const crownInstanced = new THREE.InstancedMesh(crownGeo, crownMat, count);
    crownInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.7, halfSize * 0.7);
      const z = randomRange(-halfSize * 0.7, halfSize * 0.7);
      const scale = randomRange(0.6, 1.5);

      // 树干
      dummy.position.set(x, 0.6 * scale, z);
      dummy.rotation.set(randomRange(-0.05, 0.05), randomRange(0, Math.PI * 2), randomRange(-0.05, 0.05));
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      // 树冠（位于树干上方）
      dummy.position.set(x, 1.4 * scale, z);
      dummy.scale.set(scale, scale * randomRange(0.8, 1.2), scale);
      dummy.updateMatrix();
      crownInstanced.setMatrixAt(i, dummy.matrix);

      // 绿色系变化
      color.setHSL(0.33 + randomRange(-0.04, 0.04), 0.5 + randomRange(-0.1, 0.1), 0.3 + randomRange(-0.08, 0.08));
      crownInstanced.setColorAt(i, color);
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    crownInstanced.instanceMatrix.needsUpdate = true;
    if (crownInstanced.instanceColor) crownInstanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(trunkInstanced);
    game.sceneManager.scene.add(crownInstanced);
    this.instancedMeshes.push(trunkInstanced, crownInstanced);
  }

  // === InstancedMesh 棕榈树 ===
  addInstancedPalms(game, halfSize, count) {
    // 树干（细长弯曲）
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.12, 2.5, 6);
    const trunkMat = createMaterial('wood', 0xa0826d);
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkInstanced.castShadow = true;

    // 叶冠（扁平椭球）
    const crownGeo = new THREE.SphereGeometry(0.8, 8, 6);
    const crownMat = createMaterial('foliage', 0x2ecc71);
    applyWindShader(crownMat, { strength: 0.2 }); // 棕榈叶大幅摇摆
    this.windMaterials.push(crownMat);
    const crownInstanced = new THREE.InstancedMesh(crownGeo, crownMat, count);
    crownInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.7, halfSize * 0.7);
      const z = randomRange(-halfSize * 0.7, halfSize * 0.7);
      const scale = randomRange(0.7, 1.3);
      const lean = randomRange(-0.15, 0.15);

      // 树干
      dummy.position.set(x, 1.25 * scale, z);
      dummy.rotation.set(lean, randomRange(0, Math.PI * 2), lean * 0.5);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      // 叶冠
      dummy.position.set(x + lean * 2, 2.6 * scale, z);
      dummy.rotation.set(0, randomRange(0, Math.PI * 2), 0);
      dummy.scale.set(scale * 1.2, scale * 0.5, scale * 1.2);
      dummy.updateMatrix();
      crownInstanced.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.35 + randomRange(-0.03, 0.03), 0.55, 0.38 + randomRange(-0.05, 0.05));
      crownInstanced.setColorAt(i, color);
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    crownInstanced.instanceMatrix.needsUpdate = true;
    if (crownInstanced.instanceColor) crownInstanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(trunkInstanced);
    game.sceneManager.scene.add(crownInstanced);
    this.instancedMeshes.push(trunkInstanced, crownInstanced);
  }

  // === InstancedMesh 松树 ===
  addInstancedPines(game, halfSize, count) {
    // 树干
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.0, 6);
    const trunkMat = createMaterial('wood', 0x5d4037);
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkInstanced.castShadow = true;

    // 松树层叠锥体（用一个合并的锥体几何体）
    const coneGeo = new THREE.ConeGeometry(0.45, 1.8, 6);
    const coneMat = createMaterial('foliage', 0x1b5e20);
    applyWindShader(coneMat, { strength: 0.08 });
    this.windMaterials.push(coneMat);
    const coneInstanced = new THREE.InstancedMesh(coneGeo, coneMat, count);
    coneInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.75, halfSize * 0.75);
      const z = randomRange(-halfSize * 0.75, halfSize * 0.75);
      const scale = randomRange(0.5, 1.6);

      // 树干
      dummy.position.set(x, 0.5 * scale, z);
      dummy.rotation.set(0, randomRange(0, Math.PI * 2), 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      // 锥体树冠
      dummy.position.set(x, 1.6 * scale, z);
      dummy.scale.set(scale, scale * randomRange(0.8, 1.3), scale);
      dummy.updateMatrix();
      coneInstanced.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.3 + randomRange(-0.04, 0.04), 0.5, 0.2 + randomRange(-0.05, 0.05));
      coneInstanced.setColorAt(i, color);
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    coneInstanced.instanceMatrix.needsUpdate = true;
    if (coneInstanced.instanceColor) coneInstanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(trunkInstanced);
    game.sceneManager.scene.add(coneInstanced);
    this.instancedMeshes.push(trunkInstanced, coneInstanced);
  }

  // === InstancedMesh 灌木 ===
  addInstancedBushes(game, halfSize, count) {
    const geo = new THREE.IcosahedronGeometry(0.35, 1);
    const mat = createMaterial('foliage', 0x228B22);
    applyWindShader(mat, { strength: 0.1 });
    this.windMaterials.push(mat);

    const instanced = new THREE.InstancedMesh(geo, mat, count);
    instanced.castShadow = true;
    instanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const z = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const scale = randomRange(0.4, 1.2);

      dummy.position.set(x, 0.2 * scale, z);
      dummy.rotation.set(randomRange(0, 0.3), randomRange(0, Math.PI * 2), 0);
      dummy.scale.set(scale * randomRange(0.8, 1.3), scale * randomRange(0.6, 1.0), scale * randomRange(0.8, 1.3));
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.32 + randomRange(-0.05, 0.05), 0.45 + randomRange(-0.1, 0.1), 0.25 + randomRange(-0.06, 0.06));
      instanced.setColorAt(i, color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(instanced);
    this.instancedMeshes.push(instanced);
  }

  // === InstancedMesh 草丛 ===
  addInstancedGrass(game, halfSize, count) {
    // 草叶（薄长方体模拟）
    const grassGeo = new THREE.PlaneGeometry(0.1, 0.5);
    const grassMat = createMaterial('foliage', 0x4CAF50);
    grassMat.side = THREE.DoubleSide;
    applyWindShader(grassMat, { strength: 0.2 }); // 草丛大幅摇摆
    this.windMaterials.push(grassMat);

    const instanced = new THREE.InstancedMesh(grassGeo, grassMat, count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = randomRange(-halfSize * 0.8, halfSize * 0.8);
      const z = randomRange(-halfSize * 0.8, halfSize * 0.8);

      dummy.position.set(x, 0.25, z);
      dummy.rotation.set(0, randomRange(0, Math.PI * 2), randomRange(-0.1, 0.1));
      dummy.scale.set(randomRange(0.5, 1.5), randomRange(0.5, 1.5), 1);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.3 + randomRange(-0.05, 0.05), 0.5 + randomRange(-0.15, 0.15), 0.35 + randomRange(-0.1, 0.1));
      instanced.setColorAt(i, color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

    game.sceneManager.scene.add(instanced);
    this.instancedMeshes.push(instanced);
  }

  // === 道路（非 InstancedMesh） ===
  addRoad(game, size) {
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.PlaneGeometry(3, size);
      const mat = createMaterial('asphalt', 0x555555);
      const road = new THREE.Mesh(geo, mat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(i === 0 ? 0 : -15, 0.02, 0);
      if (i === 1) road.rotation.z = Math.PI / 2;
      road.receiveShadow = true;
      game.sceneManager.scene.add(road);
      this.meshes.push(road);
    }
  }

  // === 水面 ===
  addWater(game, size) {
    const water = createWaterSurface({
      width: size,
      height: size * 0.5,
      segments: 96
    });
    // 放置在场景半侧（陆海分界）
    water.position.set(0, -0.2, size * 0.3);
    game.sceneManager.scene.add(water);
    this.waterMesh = water;
    this.meshes.push(water);

    // 注册水面到场景管理器（用于每帧更新）
    if (game.sceneManager) {
      game.sceneManager.waterMesh = water;
    }
  }

  // 每帧更新（风动画 + 水面）
  update(deltaTime) {
    // 更新全局风时间
    updateWind(deltaTime);

    // 更新所有带风 Shader 的材质
    for (const mat of this.windMaterials) {
      updateWindMaterial(mat);
    }

    // 更新水面
    if (this.waterMesh) {
      updateWater(this.waterMesh, deltaTime);
    }
  }

  clear(game) {
    // 清除普通 Mesh
    for (const mesh of this.meshes) {
      game.sceneManager.scene.remove(mesh);
    }
    // 清除 InstancedMesh
    for (const instanced of this.instancedMeshes) {
      game.sceneManager.scene.remove(instanced);
      instanced.dispose();
    }
    this.meshes = [];
    this.instancedMeshes = [];
    this.windMaterials = [];
    this.waterMesh = null;

    // 清除场景管理器中的水面引用
    if (game.sceneManager) {
      game.sceneManager.waterMesh = null;
    }
  }
}
