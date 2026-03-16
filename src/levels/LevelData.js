// ============================
// 关卡数据配置 — 硬核版 4 章 12+1 关
// 渐进式难度：雷达→SAM→战斗机→全要素
// ============================

export const LEVEL_DATA = {
  // === 第一章：沙漠风暴 ===
  '1-1': {
    name: '🏜️ 前哨基地', chapter: 1, theme: 'desert',
    description: '摧毁沙漠中的敌方前哨基地',
    objectives: [{ type: 'destroy_all', desc: '摧毁所有建筑' }],
    buildings: [
      { x: 0, z: -15, width: 2, height: 3, depth: 2, color: 0xe9c46a },
      { x: 5, z: -20, width: 2, height: 2.5, depth: 2, color: 0xf4a261 },
      { x: -5, z: -18, width: 2.5, height: 3.5, depth: 2, color: 0xe76f51 },
    ],
    antiAirs: [],
    samSites: [],
    radars: [],
    pickups: [
      { x: 3, z: -5, type: 'health' },
      { x: -8, z: -10, type: 'fuel' },
    ],
    missiles: false,
    fighterWaves: [],
    supplyDropInterval: 40,
    playerStartFuel: 100,
    par: 60
  },
  '1-2': {
    name: '🏜️ 弹药库', chapter: 1, theme: 'desert',
    description: '摧毁敌方弹药库，注意防空火力',
    objectives: [{ type: 'destroy_all', desc: '摧毁所有目标' }],
    buildings: [
      { x: 3, z: -10, width: 3, height: 2, depth: 3, color: 0x636e72, hp: 15 },
      { x: -4, z: -18, width: 2, height: 3, depth: 2, color: 0xe9c46a },
      { x: 8, z: -22, width: 2, height: 4, depth: 2, color: 0xf4a261 },
      { x: -8, z: -14, width: 2.5, height: 2.5, depth: 2.5, color: 0xe76f51 },
    ],
    antiAirs: [{ x: 0, z: -25, fireRate: 3, range: 20 }],
    samSites: [],
    radars: [],
    pickups: [
      { x: -5, z: -5, type: 'shield' },
      { x: 8, z: -5, type: 'ammo' },
    ],
    missiles: false,
    fighterWaves: [],
    supplyDropInterval: 35,
    playerStartFuel: 100,
    par: 90
  },
  '1-3': {
    name: '🏜️ 指挥中心', chapter: 1, theme: 'desert',
    description: '摧毁沙漠指挥中心，首次面对雷达站！',
    objectives: [{ type: 'destroy_all', desc: '摧毁指挥中心和雷达' }],
    buildings: [
      { x: 0, z: -20, width: 4, height: 5, depth: 3, color: 0x264653, hp: 25 },
      { x: 8, z: -15, width: 2, height: 3, depth: 2, color: 0xe9c46a },
      { x: -8, z: -15, width: 2, height: 3, depth: 2, color: 0xf4a261 },
      { x: 5, z: -28, width: 2, height: 2, depth: 2, color: 0x636e72 },
      { x: -5, z: -28, width: 2, height: 2, depth: 2, color: 0x636e72 },
    ],
    antiAirs: [
      { x: 10, z: -20, fireRate: 2.5, range: 22 },
      { x: -10, z: -20, fireRate: 2.5, range: 22 },
    ],
    samSites: [],
    radars: [
      { x: 0, z: -30 },  // 首个雷达站！
    ],
    pickups: [
      { x: 0, z: -8, type: 'mega_bomb' },
      { x: 10, z: -5, type: 'health' },
      { x: -10, z: -5, type: 'fuel' },
    ],
    missiles: true,
    fighterWaves: [],
    supplyDropInterval: 30,
    playerStartFuel: 100,
    par: 120
  },

  // === 第二章：城市突袭 ===
  '2-1': {
    name: '🏙️ 工业区', chapter: 2, theme: 'city',
    description: '突袭城市工业区，注意防空网',
    objectives: [{ type: 'destroy_all', desc: '摧毁工厂设施' }],
    buildings: [
      { x: 0, z: -12, width: 3, height: 4, depth: 3, color: 0x636e72, hp: 15 },
      { x: 6, z: -18, width: 2, height: 3, depth: 4, color: 0x95a5a6 },
      { x: -6, z: -20, width: 4, height: 3, depth: 2, color: 0x636e72, hp: 15 },
      { x: 3, z: -28, width: 2, height: 5, depth: 2, color: 0x264653 },
      { x: -3, z: -28, width: 2, height: 5, depth: 2, color: 0x264653 },
    ],
    antiAirs: [{ x: 8, z: -8, fireRate: 2, range: 22 }],
    samSites: [],
    radars: [
      { x: -10, z: -15 },
    ],
    pickups: [
      { x: -8, z: -5, type: 'speed' },
      { x: 5, z: -10, type: 'health' },
      { x: 0, z: -5, type: 'ammo' },
    ],
    missiles: false,
    fighterWaves: [],
    supplyDropInterval: 28,
    playerStartFuel: 100,
    par: 90
  },
  '2-2': {
    name: '🏙️ 军事基地', chapter: 2, theme: 'city',
    description: '攻击城市中的军事基地，首次面对 SAM 阵地！',
    objectives: [{ type: 'destroy_all', desc: '摧毁军事设施' }],
    buildings: [
      { x: 0, z: -15, width: 4, height: 3, depth: 4, color: 0x636e72, hp: 20 },
      { x: -8, z: -10, width: 2, height: 4, depth: 2, color: 0x264653 },
      { x: 8, z: -10, width: 2, height: 4, depth: 2, color: 0x264653 },
      { x: -5, z: -25, width: 3, height: 3.5, depth: 2.5, color: 0x95a5a6 },
      { x: 5, z: -25, width: 3, height: 3.5, depth: 2.5, color: 0x95a5a6 },
      { x: 0, z: -32, width: 2, height: 6, depth: 2, color: 0xe74c3c, hp: 30 },
    ],
    antiAirs: [
      { x: -12, z: -18, fireRate: 2, range: 25 },
      { x: 12, z: -18, fireRate: 2, range: 25 },
    ],
    samSites: [
      { x: 0, z: -35 },  // 首个 SAM 阵地！
    ],
    radars: [
      { x: 10, z: -30 },
    ],
    pickups: [
      { x: 0, z: -5, type: 'shield' },
      { x: -10, z: -15, type: 'mega_bomb' },
      { x: 10, z: -5, type: 'fuel' },
    ],
    missiles: true,
    fighterWaves: [],
    supplyDropInterval: 25,
    playerStartFuel: 100,
    par: 120
  },
  '2-3': {
    name: '🏙️ 通信塔', chapter: 2, theme: 'city',
    description: '摧毁敌方通信枢纽，密集防空网',
    objectives: [{ type: 'destroy_all', desc: '摧毁通信塔' }],
    buildings: [
      { x: 0, z: -20, width: 2, height: 8, depth: 2, color: 0xe74c3c, hp: 35 },
      { x: -10, z: -12, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 10, z: -12, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: -6, z: -30, width: 2.5, height: 4, depth: 2.5, color: 0x636e72, hp: 15 },
      { x: 6, z: -30, width: 2.5, height: 4, depth: 2.5, color: 0x636e72, hp: 15 },
    ],
    antiAirs: [
      { x: 0, z: -10, fireRate: 1.5, range: 25 },
      { x: -8, z: -25, fireRate: 2, range: 20 },
      { x: 8, z: -25, fireRate: 2, range: 20 },
    ],
    samSites: [
      { x: -12, z: -20 },
    ],
    radars: [
      { x: 12, z: -15 },
    ],
    pickups: [
      { x: 5, z: -5, type: 'health' },
      { x: -5, z: -5, type: 'speed' },
      { x: 0, z: -35, type: 'mega_bomb' },
      { x: -12, z: -5, type: 'ammo' },
    ],
    missiles: true,
    fighterWaves: [],
    supplyDropInterval: 25,
    playerStartFuel: 100,
    par: 150
  },

  // === 第三章：海岸突击 ===
  '3-1': {
    name: '🌊 港口设施', chapter: 3, theme: 'coast',
    description: '摧毁敌方港口，首次遭遇敌方战斗机！',
    objectives: [{ type: 'destroy_all', desc: '摧毁港口设施' }],
    buildings: [
      { x: 0, z: -15, width: 5, height: 3, depth: 3, color: 0x636e72, hp: 20 },
      { x: -8, z: -20, width: 3, height: 4, depth: 2, color: 0x264653 },
      { x: 8, z: -12, width: 2, height: 3, depth: 4, color: 0x95a5a6 },
      { x: -3, z: -28, width: 2, height: 2, depth: 2, color: 0xe9c46a },
    ],
    antiAirs: [{ x: 5, z: -25, fireRate: 2, range: 22 }],
    samSites: [
      { x: -10, z: -25 },
    ],
    radars: [
      { x: 10, z: -20 },
    ],
    pickups: [
      { x: 0, z: -5, type: 'shield' },
      { x: -8, z: -5, type: 'health' },
      { x: 8, z: -8, type: 'fuel' },
    ],
    missiles: true,
    fighterWaves: [
      { spawnTime: 15, count: 1 },  // 首波战斗机！
      { spawnTime: 45, count: 1 },
    ],
    supplyDropInterval: 22,
    playerStartFuel: 100,
    par: 90
  },
  '3-2': {
    name: '🌊 雷达站', chapter: 3, theme: 'coast',
    description: '摧毁海岸雷达站，战斗机拦截加强',
    objectives: [{ type: 'destroy_all', desc: '摧毁雷达设施' }],
    buildings: [
      { x: 0, z: -18, width: 3, height: 6, depth: 3, color: 0xe74c3c, hp: 30 },
      { x: -10, z: -10, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 10, z: -10, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: -6, z: -28, width: 2.5, height: 3.5, depth: 2.5, color: 0x636e72, hp: 15 },
      { x: 6, z: -28, width: 2.5, height: 3.5, depth: 2.5, color: 0x636e72, hp: 15 },
    ],
    antiAirs: [
      { x: -5, z: -15, fireRate: 1.8, range: 25 },
      { x: 5, z: -15, fireRate: 1.8, range: 25 },
    ],
    samSites: [
      { x: 0, z: -32 },
    ],
    radars: [
      { x: -12, z: -20 },
      { x: 12, z: -20 },
    ],
    pickups: [
      { x: 0, z: -8, type: 'mega_bomb' },
      { x: 8, z: -5, type: 'speed' },
      { x: -8, z: -5, type: 'ammo' },
    ],
    missiles: true,
    fighterWaves: [
      { spawnTime: 10, count: 1 },
      { spawnTime: 35, count: 2 },
    ],
    supplyDropInterval: 20,
    playerStartFuel: 100,
    par: 120
  },
  '3-3': {
    name: '🌊 海军基地', chapter: 3, theme: 'coast',
    description: '全面轰炸海军基地，最高防御部署',
    objectives: [{ type: 'destroy_all', desc: '摧毁海军基地' }],
    buildings: [
      { x: 0, z: -20, width: 5, height: 4, depth: 4, color: 0x264653, hp: 35 },
      { x: -12, z: -15, width: 3, height: 5, depth: 2, color: 0x636e72, hp: 20 },
      { x: 12, z: -15, width: 3, height: 5, depth: 2, color: 0x636e72, hp: 20 },
      { x: -6, z: -32, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 6, z: -32, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 0, z: -38, width: 2, height: 7, depth: 2, color: 0xe74c3c, hp: 40 },
    ],
    antiAirs: [
      { x: -8, z: -25, fireRate: 1.5, range: 25 },
      { x: 8, z: -25, fireRate: 1.5, range: 25 },
      { x: 0, z: -30, fireRate: 2, range: 30 },
    ],
    samSites: [
      { x: -15, z: -30 },
      { x: 15, z: -30 },
    ],
    radars: [
      { x: 0, z: -10 },
      { x: -12, z: -35 },
    ],
    pickups: [
      { x: 0, z: -5, type: 'health' },
      { x: -10, z: -5, type: 'shield' },
      { x: 10, z: -5, type: 'mega_bomb' },
      { x: 0, z: -15, type: 'fuel' },
    ],
    missiles: true,
    fighterWaves: [
      { spawnTime: 8, count: 1 },
      { spawnTime: 25, count: 2 },
      { spawnTime: 50, count: 2 },
    ],
    supplyDropInterval: 18,
    playerStartFuel: 100,
    par: 180
  },

  // === 第四章：山地要塞 ===
  '4-1': {
    name: '⛰️ 山地哨站', chapter: 4, theme: 'mountain',
    description: '攻击山地哨站，全要素防御',
    objectives: [{ type: 'destroy_all', desc: '摧毁山地设施' }],
    buildings: [
      { x: 0, z: -15, width: 3, height: 4, depth: 3, color: 0x636e72, hp: 25 },
      { x: -8, z: -22, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 8, z: -22, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 0, z: -30, width: 2.5, height: 5, depth: 2.5, color: 0x264653, hp: 20 },
    ],
    antiAirs: [
      { x: -5, z: -10, fireRate: 1.8, range: 25 },
      { x: 5, z: -28, fireRate: 2, range: 25 },
    ],
    samSites: [
      { x: 12, z: -15 },
    ],
    radars: [
      { x: -12, z: -18 },
    ],
    pickups: [
      { x: 0, z: -5, type: 'health' },
      { x: 8, z: -5, type: 'speed' },
      { x: -8, z: -5, type: 'ammo' },
    ],
    missiles: true,
    fighterWaves: [
      { spawnTime: 12, count: 2 },
      { spawnTime: 40, count: 2 },
    ],
    supplyDropInterval: 18,
    playerStartFuel: 90,
    par: 120
  },
  '4-2': {
    name: '⛰️ 导弹发射场', chapter: 4, theme: 'mountain',
    description: '摧毁隐藏的导弹发射场，最高防空密度！',
    objectives: [{ type: 'destroy_all', desc: '摧毁导弹发射台' }],
    buildings: [
      { x: 0, z: -18, width: 4, height: 3, depth: 4, color: 0x636e72, hp: 30 },
      { x: -10, z: -12, width: 3, height: 5, depth: 2, color: 0x264653, hp: 25 },
      { x: 10, z: -12, width: 3, height: 5, depth: 2, color: 0x264653, hp: 25 },
      { x: -5, z: -30, width: 2, height: 7, depth: 2, color: 0xe74c3c, hp: 35 },
      { x: 5, z: -30, width: 2, height: 7, depth: 2, color: 0xe74c3c, hp: 35 },
    ],
    antiAirs: [
      { x: 0, z: -8, fireRate: 1.5, range: 28 },
      { x: -12, z: -22, fireRate: 1.5, range: 25 },
      { x: 12, z: -22, fireRate: 1.5, range: 25 },
    ],
    samSites: [
      { x: -8, z: -35 },
      { x: 8, z: -35 },
    ],
    radars: [
      { x: 0, z: -25 },
      { x: -15, z: -10 },
    ],
    pickups: [
      { x: -8, z: -5, type: 'shield' },
      { x: 8, z: -5, type: 'mega_bomb' },
      { x: 0, z: -35, type: 'health' },
      { x: 0, z: -5, type: 'fuel' },
    ],
    missiles: true,
    fighterWaves: [
      { spawnTime: 8, count: 2 },
      { spawnTime: 30, count: 2 },
      { spawnTime: 55, count: 3 },
    ],
    supplyDropInterval: 15,
    playerStartFuel: 80,
    par: 150
  },
  '4-3': {
    name: '⛰️ 终极要塞', chapter: 4, theme: 'mountain',
    description: '摧毁最终要塞！全要素最高难度！',
    objectives: [{ type: 'destroy_all', desc: '摧毁终极要塞' }],
    buildings: [
      { x: 0, z: -22, width: 6, height: 6, depth: 5, color: 0x264653, hp: 50 },
      { x: -12, z: -12, width: 3, height: 4, depth: 2, color: 0x636e72, hp: 25 },
      { x: 12, z: -12, width: 3, height: 4, depth: 2, color: 0x636e72, hp: 25 },
      { x: -8, z: -32, width: 2, height: 8, depth: 2, color: 0xe74c3c, hp: 40 },
      { x: 8, z: -32, width: 2, height: 8, depth: 2, color: 0xe74c3c, hp: 40 },
      { x: -5, z: -40, width: 2, height: 3, depth: 2, color: 0x95a5a6, hp: 15 },
      { x: 5, z: -40, width: 2, height: 3, depth: 2, color: 0x95a5a6, hp: 15 },
    ],
    antiAirs: [
      { x: 0, z: -10, fireRate: 1.2, range: 30 },
      { x: -10, z: -20, fireRate: 1.5, range: 28 },
      { x: 10, z: -20, fireRate: 1.5, range: 28 },
      { x: 0, z: -35, fireRate: 1.2, range: 30 },
    ],
    samSites: [
      { x: -15, z: -25 },
      { x: 15, z: -25 },
      { x: 0, z: -42 },
    ],
    radars: [
      { x: -15, z: -15 },
      { x: 15, z: -15 },
      { x: 0, z: -30 },
    ],
    pickups: [
      { x: 0, z: -5, type: 'shield' },
      { x: -10, z: -5, type: 'mega_bomb' },
      { x: 10, z: -5, type: 'health' },
      { x: 0, z: -15, type: 'speed' },
      { x: -15, z: -5, type: 'fuel' },
      { x: 15, z: -5, type: 'ammo' },
    ],
    missiles: true,
    fighterWaves: [
      { spawnTime: 5, count: 2 },
      { spawnTime: 25, count: 3 },
      { spawnTime: 50, count: 3 },
      { spawnTime: 80, count: 4 },
    ],
    supplyDropInterval: 12,
    playerStartFuel: 80,
    par: 200,
    boss: { x: 0, z: -35, hp: 100 }
  },
};

// 获取关卡 ID 列表
export function getLevelIds() {
  return Object.keys(LEVEL_DATA);
}

// 获取章节关卡
export function getChapterLevels(chapter) {
  return Object.entries(LEVEL_DATA)
    .filter(([_, d]) => d.chapter === chapter)
    .map(([id, data]) => ({ id, ...data }));
}
