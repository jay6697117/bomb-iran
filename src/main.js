// ============================
// 游戏入口 - 初始化并启动
// ============================
import { Game } from './core/Game.js';
import { Player } from './entities/Player.js';
import { Building } from './entities/Building.js';
import { AntiAir } from './entities/AntiAir.js';
import { Pickup } from './entities/Pickup.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { createToonMaterial } from './shaders/ToonShader.js';
import * as THREE from 'three';

// 获取 canvas
const canvas = document.getElementById('game-canvas');

// 创建游戏实例
const game = new Game(canvas);

// =============================
// 构建测试战斗场景
// =============================

// 地面
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = createToonMaterial(0xDEB887);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
game.sceneManager.scene.add(ground);
game.physicsWorld.createGroundBody();

// 格子辅助线
const gridHelper = new THREE.GridHelper(100, 50, 0x888866, 0x666644);
gridHelper.position.y = 0.01;
game.sceneManager.scene.add(gridHelper);

// 战斗系统
const combatSystem = new CombatSystem();
game.combatSystem = combatSystem;

// 创建玩家
const player = new Player(game);
game.player = player;

// 创建建筑群
const buildingConfigs = [
  { x: 5, z: -8, width: 2, height: 3, depth: 2, color: 0xe9c46a },
  { x: -3, z: -12, width: 2.5, height: 4, depth: 2.5, color: 0xf4a261 },
  { x: 8, z: -15, width: 2, height: 2.5, depth: 2, color: 0x2a9d8f },
  { x: -7, z: -6, width: 3, height: 5, depth: 2, color: 0x264653 },
  { x: 0, z: -20, width: 2, height: 3.5, depth: 2, color: 0x636e72 },
  { x: 12, z: -10, width: 2, height: 2, depth: 2, color: 0xe76f51 },
  { x: -10, z: -18, width: 2.5, height: 4.5, depth: 2.5, color: 0xe9c46a },
  { x: 6, z: -25, width: 2, height: 3, depth: 2, color: 0xf4a261 },
];

for (const config of buildingConfigs) {
  const building = new Building(game, config);
  game.addEntity(building);
  combatSystem.registerBuilding(building);
}

// 创建防空炮
const antiAirConfigs = [
  { x: -5, z: -15, fireRate: 2.5, range: 20 },
  { x: 10, z: -20, fireRate: 3, range: 25 },
];

for (const config of antiAirConfigs) {
  const aa = new AntiAir(game, config);
  game.addEntity(aa);
  combatSystem.registerAntiAir(aa);
}

// 创建道具
const pickupConfigs = [
  { x: 3, z: -5, type: 'health' },
  { x: -8, z: -10, type: 'shield' },
  { x: 10, z: -5, type: 'speed' },
  { x: -3, z: -22, type: 'mega_bomb' },
];

for (const config of pickupConfigs) {
  const pickup = new Pickup(game, config);
  game.addEntity(pickup);
  combatSystem.registerPickup(pickup);
}

// =============================
// 简易 HUD 显示
// =============================
const uiContainer = document.getElementById('ui-container');
const hudHTML = `
<div class="hud" id="game-hud">
  <div class="hud-top-left" id="hp-display"></div>
  <div class="hud-top-center" id="mission-display">
    🎯 摧毁所有目标 | Q 切换武器 | 空格 射击/投弹 | WASD 移动
  </div>
  <div class="hud-top-right" id="score-display">0</div>
  <div class="hud-bottom-left">
    <div class="weapon-slot active" id="weapon-bomb">💣 炸弹</div>
    <div class="weapon-slot" id="weapon-gun">🔫 机枪</div>
  </div>
  <div class="hud-bottom-right" id="targets-display">目标: 0/0</div>
</div>
`;
uiContainer.innerHTML = hudHTML;

// HUD 更新循环
function updateHUD() {
  // 生命值
  const hpEl = document.getElementById('hp-display');
  if (hpEl && player) {
    let hearts = '';
    for (let i = 0; i < player.maxHP; i++) {
      hearts += `<span class="hud-heart ${i < player.hp ? '' : 'lost'}">❤️</span>`;
    }
    if (player.hasShield) hearts += '<span class="hud-heart">🛡️</span>';
    hpEl.innerHTML = hearts;
  }

  // 武器
  const bombSlot = document.getElementById('weapon-bomb');
  const gunSlot = document.getElementById('weapon-gun');
  if (bombSlot && gunSlot && player) {
    bombSlot.className = `weapon-slot ${player.currentWeapon === 'bomb' ? 'active' : ''}`;
    gunSlot.className = `weapon-slot ${player.currentWeapon === 'gun' ? 'active' : ''}`;
  }

  // 分数
  const scoreEl = document.getElementById('score-display');
  if (scoreEl && player) {
    scoreEl.textContent = `💰 ${player.stats.targetsDestroyed * 100}`;
  }

  // 目标
  const targetsEl = document.getElementById('targets-display');
  if (targetsEl) {
    const remaining = combatSystem.getRemainingTargets();
    const total = combatSystem.buildings.length + combatSystem.antiAirs.length + 
                  combatSystem.buildings.filter(b => b.isDestroyed).length +
                  combatSystem.antiAirs.filter(a => a.isDestroyed).length;
    targetsEl.textContent = `🎯 目标: ${remaining}`;
  }

  requestAnimationFrame(updateHUD);
}
updateHUD();

// =============================
// 启动游戏
// =============================
game.setState('playing');
game.start();

// 全局暴露便于调试
window.game = game;

console.log('🎮 Bomb Iran - 战斗测试场景！');
console.log('🕹️ WASD 移动 | 空格 射击/投弹 | Q 切换武器');
console.log(`📊 目标: ${combatSystem.getRemainingTargets()} 个建筑/防空`);
