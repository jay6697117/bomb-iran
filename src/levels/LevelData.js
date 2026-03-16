// ============================
// 关卡数据配置 - 4 章 12+1 关
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
    pickups: [{ x: 3, z: -5, type: 'health' }],
    missiles: false, par: 60
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
    pickups: [{ x: -5, z: -5, type: 'shield' }],
    missiles: false, par: 90
  },
  '1-3': {
    name: '🏜️ 指挥中心', chapter: 1, theme: 'desert',
    description: '摧毁沙漠指挥中心，小心导弹',
    objectives: [{ type: 'destroy_all', desc: '摧毁指挥中心' }],
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
    pickups: [
      { x: 0, z: -8, type: 'mega_bomb' },
      { x: 10, z: -5, type: 'health' },
    ],
    missiles: true, par: 120
  },

  // === 第二章：城市突袭 ===
  '2-1': {
    name: '🏙️ 工业区', chapter: 2, theme: 'city',
    description: '突袭城市工业区',
    objectives: [{ type: 'destroy_all', desc: '摧毁工厂设施' }],
    buildings: [
      { x: 0, z: -12, width: 3, height: 4, depth: 3, color: 0x636e72, hp: 15 },
      { x: 6, z: -18, width: 2, height: 3, depth: 4, color: 0x95a5a6 },
      { x: -6, z: -20, width: 4, height: 3, depth: 2, color: 0x636e72, hp: 15 },
      { x: 3, z: -28, width: 2, height: 5, depth: 2, color: 0x264653 },
      { x: -3, z: -28, width: 2, height: 5, depth: 2, color: 0x264653 },
    ],
    antiAirs: [{ x: 8, z: -8, fireRate: 2, range: 22 }],
    pickups: [
      { x: -8, z: -5, type: 'speed' },
      { x: 5, z: -10, type: 'health' },
    ],
    missiles: false, par: 90
  },
  '2-2': {
    name: '🏙️ 军事基地', chapter: 2, theme: 'city',
    description: '攻击城市中的军事基地',
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
    pickups: [
      { x: 0, z: -5, type: 'shield' },
      { x: -10, z: -15, type: 'mega_bomb' },
    ],
    missiles: true, par: 120
  },
  '2-3': {
    name: '🏙️ 通信塔', chapter: 2, theme: 'city',
    description: '摧毁敌方通信枢纽',
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
    pickups: [
      { x: 5, z: -5, type: 'health' },
      { x: -5, z: -5, type: 'speed' },
      { x: 0, z: -35, type: 'mega_bomb' },
    ],
    missiles: true, par: 150
  },

  // === 第三章：海岸突击 ===
  '3-1': {
    name: '🌊 港口设施', chapter: 3, theme: 'coast',
    description: '摧毁敌方港口',
    objectives: [{ type: 'destroy_all', desc: '摧毁港口设施' }],
    buildings: [
      { x: 0, z: -15, width: 5, height: 3, depth: 3, color: 0x636e72, hp: 20 },
      { x: -8, z: -20, width: 3, height: 4, depth: 2, color: 0x264653 },
      { x: 8, z: -12, width: 2, height: 3, depth: 4, color: 0x95a5a6 },
      { x: -3, z: -28, width: 2, height: 2, depth: 2, color: 0xe9c46a },
    ],
    antiAirs: [{ x: 5, z: -25, fireRate: 2, range: 22 }],
    pickups: [{ x: 0, z: -5, type: 'shield' }, { x: -8, z: -5, type: 'health' }],
    missiles: true, par: 90
  },
  '3-2': {
    name: '🌊 雷达站', chapter: 3, theme: 'coast',
    description: '摧毁海岸雷达站',
    objectives: [{ type: 'destroy_all', desc: '摧毁雷达设施' }],
    buildings: [
      { x: 0, z: -18, width: 3, height: 6, depth: 3, color: 0xe74c3c, hp: 30 },
      { x: -10, z: -10, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: 10, z: -10, width: 2, height: 3, depth: 2, color: 0x95a5a6 },
      { x: -6, z: -28, width: 2.5, height: 3.5, depth: 2.5, color: 0x636e72,hp: 15 },
      { x: 6, z: -28, width: 2.5, height: 3.5, depth: 2.5, color: 0x636e72, hp: 15 },
    ],
    antiAirs: [
      { x: -5, z: -15, fireRate: 1.8, range: 25 },
      { x: 5, z: -15, fireRate: 1.8, range: 25 },
    ],
    pickups: [{ x: 0, z: -8, type: 'mega_bomb' }, { x: 8, z: -5, type: 'speed' }],
    missiles: true, par: 120
  },
  '3-3': {
    name: '🌊 海军基地', chapter: 3, theme: 'coast',
    description: '全面轰炸海军基地',
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
    pickups: [
      { x: 0, z: -5, type: 'health' },
      { x: -10, z: -5, type: 'shield' },
      { x: 10, z: -5, type: 'mega_bomb' },
    ],
    missiles: true, par: 180
  },

  // === 第四章：山地要塞 ===
  '4-1': {
    name: '⛰️ 山地哨站', chapter: 4, theme: 'mountain',
    description: '攻击山地哨站',
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
    pickups: [{ x: 0, z: -5, type: 'health' }, { x: 8, z: -5, type: 'speed' }],
    missiles: true, par: 120
  },
  '4-2': {
    name: '⛰️ 导弹发射场', chapter: 4, theme: 'mountain',
    description: '摧毁隐藏的导弹发射场',
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
    pickups: [
      { x: -8, z: -5, type: 'shield' },
      { x: 8, z: -5, type: 'mega_bomb' },
      { x: 0, z: -35, type: 'health' },
    ],
    missiles: true, par: 150
  },
  '4-3': {
    name: '⛰️ 终极要塞', chapter: 4, theme: 'mountain',
    description: '摧毁最终要塞！最高难度！',
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
    pickups: [
      { x: 0, z: -5, type: 'shield' },
      { x: -10, z: -5, type: 'mega_bomb' },
      { x: 10, z: -5, type: 'health' },
      { x: 0, z: -15, type: 'speed' },
    ],
    missiles: true, par: 200,
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
