// ============================
// 地形生成器 - 不同关卡风格的地面
// ============================
import * as THREE from 'three';
import { createToonMaterial } from '../shaders/ToonShader.js';
import { COLORS } from '../utils/constants.js';
import { randomRange } from '../utils/helpers.js';

// 地形主题配置
const TERRAIN_THEMES = {
  desert: {
    groundColor: COLORS.desert,
    skyColor: 0xE8D5B7,
    fogColor: 0xE8D5B7,
    decorations: ['cactus', 'rock', 'dune']
  },
  city: {
    groundColor: COLORS.city,
    skyColor: 0x87CEEB,
    fogColor: 0x87CEEB,
    decorations: ['road', 'tree', 'lamppost']
  },
  coast: {
    groundColor: COLORS.coast,
    skyColor: 0x87CEEB,
    fogColor: 0xB0E0E6,
    decorations: ['palm', 'rock', 'water']
  },
  mountain: {
    groundColor: COLORS.mountain,
    skyColor: 0x9BB5D0,
    fogColor: 0xC0C8D0,
    decorations: ['pine', 'rock', 'snow']
  }
};

export class Terrain {
  constructor() {
    this.meshes = [];
  }

  // 生成地形
  generate(game, theme = 'desert', size = 100) {
    this.clear(game);

    const config = TERRAIN_THEMES[theme] || TERRAIN_THEMES.desert;

    // 设置天空颜色
    game.sceneManager.setSkyColor(config.skyColor);

    // 地面
    const groundGeo = new THREE.PlaneGeometry(size, size, 20, 20);
    const groundMat = createToonMaterial(config.groundColor);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.sceneManager.scene.add(ground);
    this.meshes.push(ground);

    // 地形起伏（顶点偏移）
    if (theme === 'mountain' || theme === 'desert') {
      const pos = groundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // 简单的噪音模拟
        const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;
        pos.setZ(i, noise);
      }
      pos.needsUpdate = true;
      groundGeo.computeVertexNormals();
    }

    // 物理地面
    game.physicsWorld.createGroundBody();

    // 装饰物
    this.addDecorations(game, config, size);

    return config;
  }

  addDecorations(game, config, size) {
    const halfSize = size / 2;

    for (const decType of config.decorations) {
      const count = decType === 'road' ? 2 : 8;

      for (let i = 0; i < count; i++) {
        let mesh;
        const x = randomRange(-halfSize * 0.8, halfSize * 0.8);
        const z = randomRange(-halfSize * 0.8, halfSize * 0.8);

        switch (decType) {
          case 'cactus':
            mesh = this.createCactus();
            break;
          case 'rock':
            mesh = this.createRock();
            break;
          case 'dune':
            mesh = this.createDune();
            break;
          case 'tree':
            mesh = this.createTree(0x27ae60);
            break;
          case 'palm':
            mesh = this.createTree(0x2ecc71);
            break;
          case 'pine':
            mesh = this.createPine();
            break;
          case 'road':
            mesh = this.createRoad(i, size);
            break;
          default:
            continue;
        }

        if (mesh && decType !== 'road') {
          mesh.position.set(x, 0, z);
          game.sceneManager.scene.add(mesh);
          this.meshes.push(mesh);
        } else if (mesh) {
          game.sceneManager.scene.add(mesh);
          this.meshes.push(mesh);
        }
      }
    }
  }

  createCactus() {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const trunkMat = createToonMaterial(0x2ecc71);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);

    // 侧臂
    const armGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 6);
    const arm = new THREE.Mesh(armGeo, trunkMat);
    arm.position.set(0.3, 1, 0);
    arm.rotation.z = Math.PI / 3;
    group.add(arm);

    return group;
  }

  createRock() {
    const size = randomRange(0.3, 0.8);
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = createToonMaterial(0x7f8c8d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = size * 0.5;
    mesh.rotation.set(randomRange(0, 1), randomRange(0, 1), 0);
    mesh.castShadow = true;
    return mesh;
  }

  createDune() {
    const geo = new THREE.SphereGeometry(randomRange(1.5, 3), 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = createToonMaterial(0xD4A76A);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.y = 0.4;
    return mesh;
  }

  createTree(color) {
    const group = new THREE.Group();
    // 树干
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1, 6);
    const trunkMat = createToonMaterial(0x8d6e63);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5;
    group.add(trunk);
    // 树冠
    const crownGeo = new THREE.SphereGeometry(0.6, 6, 4);
    const crownMat = createToonMaterial(color);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 1.3;
    crown.castShadow = true;
    group.add(crown);
    return group;
  }

  createPine() {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6);
    const trunkMat = createToonMaterial(0x5d4037);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.4;
    group.add(trunk);
    // 层叠锥体
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(0.5 - i * 0.12, 0.7, 6);
      const coneMat = createToonMaterial(0x1b5e20);
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 0.8 + i * 0.5;
      cone.castShadow = true;
      group.add(cone);
    }
    return group;
  }

  createRoad(index, size) {
    const geo = new THREE.PlaneGeometry(3, size);
    const mat = createToonMaterial(0x555555);
    const road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(index === 0 ? 0 : -15, 0.02, 0);
    if (index === 1) road.rotation.z = Math.PI / 2;
    return road;
  }

  clear(game) {
    for (const mesh of this.meshes) {
      game.sceneManager.scene.remove(mesh);
    }
    this.meshes = [];
  }
}
