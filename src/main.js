// ============================
// 游戏入口 - 初始化并启动
// ============================
import { Game } from './core/Game.js';
import { createToonMaterial } from './shaders/ToonShader.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// 获取 canvas
const canvas = document.getElementById('game-canvas');

// 创建游戏实例
const game = new Game(canvas);

// =============================
// 临时测试场景（后续会被关卡系统替代）
// =============================

// 地面
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = createToonMaterial(0xDEB887);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
game.sceneManager.scene.add(ground);
game.physicsWorld.createGroundBody();

// 格子辅助线（调试用）
const gridHelper = new THREE.GridHelper(100, 50, 0x888866, 0x666644);
gridHelper.position.y = 0.01;
game.sceneManager.scene.add(gridHelper);

// 测试建筑 - 卡通方块
function createTestBuilding(x, z, height, color) {
  const geo = new THREE.BoxGeometry(2, height, 2);
  const mat = createToonMaterial(color);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  game.sceneManager.scene.add(mesh);

  // 物理体
  const body = new CANNON.Body({
    mass: 0, // 静态
    shape: new CANNON.Box(new CANNON.Vec3(1, height / 2, 1)),
    position: new CANNON.Vec3(x, height / 2, z)
  });
  game.physicsWorld.addBody(body, mesh);
}

// 放置一些测试建筑
createTestBuilding(5, -8, 3, 0xe9c46a);
createTestBuilding(-3, -12, 4, 0xf4a261);
createTestBuilding(8, -15, 2.5, 0x2a9d8f);
createTestBuilding(-7, -6, 5, 0x264653);
createTestBuilding(0, -20, 3.5, 0x636e72);
createTestBuilding(12, -10, 2, 0xe76f51);

// 测试掉落物理方块
const fallingGeo = new THREE.BoxGeometry(1, 1, 1);
const fallingMat = createToonMaterial(0xff6b35);
const fallingMesh = new THREE.Mesh(fallingGeo, fallingMat);
fallingMesh.castShadow = true;
game.sceneManager.scene.add(fallingMesh);

const fallingBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  position: new CANNON.Vec3(0, 15, -10)
});
game.physicsWorld.addBody(fallingBody, fallingMesh);

// 设置相机看向建筑区域
game.sceneManager.camera.position.set(0, 25, 25);
game.sceneManager.camera.lookAt(0, 0, -10);

// 启动游戏
game.setState('playing');
game.start();

// 全局暴露便于调试
window.game = game;

console.log('🎮 Bomb Iran - 游戏启动！');
console.log('📐 45度等角视角 | 🎨 卡通着色 | ⚙️ Cannon-es 物理');
