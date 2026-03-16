// ============================
// 全局常量和配置
// ============================

// 游戏状态枚举
export const GAME_STATES = {
  MENU: 'menu',
  LEVEL_SELECT: 'level_select',
  SHOP: 'shop',
  ACHIEVEMENTS: 'achievements',
  CUTSCENE: 'cutscene',
  PLAYING: 'playing',
  PAUSED: 'paused',
  RESULT: 'result'
};

// 武器类型
export const WEAPONS = {
  BOMB: 'bomb',
  GUN: 'gun'
};

// 道具类型
export const PICKUPS = {
  SHIELD: 'shield',
  SPEED: 'speed',
  MEGA_BOMB: 'mega_bomb',
  HEALTH: 'health'
};

// 评级阈值
export const RATINGS = {
  S: 90,
  A: 75,
  B: 50
};

// 玩家默认配置
export const PLAYER_DEFAULTS = {
  speed: 8,
  maxHP: 3,
  bombCooldown: 1000,
  gunCooldown: 150,
  bombBlastRadius: 5,
  gunDamage: 1,
  bombDamage: 10,
  altitude: 8 // 飞行高度
};

// 物理常量
export const PHYSICS = {
  gravity: -20,
  bombMass: 2,
  debrisMass: 0.5,
  blastForce: 30,
  debrisCount: 8 // 爆炸碎片数量
};

// 升级配置
export const UPGRADE_CONFIG = {
  bombPower: {
    name: '💣 炸弹威力',
    maxLevel: 5,
    costs: [0, 200, 400, 800, 1500],
    multipliers: [1, 1.3, 1.6, 2.0, 2.5]
  },
  gunPower: {
    name: '🔫 机枪火力',
    maxLevel: 5,
    costs: [0, 200, 400, 800, 1500],
    multipliers: [1, 1.2, 1.5, 1.8, 2.2]
  },
  speed: {
    name: '✈️ 飞机速度',
    maxLevel: 5,
    costs: [0, 200, 400, 800, 1500],
    multipliers: [1, 1.15, 1.3, 1.45, 1.6]
  },
  maxHP: {
    name: '❤️ 生命上限',
    maxLevel: 3,
    costs: [0, 500, 1000],
    values: [3, 5, 7]
  },
  shieldDuration: {
    name: '🛡️ 护盾时长',
    maxLevel: 3,
    costs: [0, 300, 600],
    values: [5, 8, 12]
  }
};

// 成就定义
export const ACHIEVEMENTS = [
  { id: 'first_mission', name: '🥇 初次出击', desc: '完成第一关', reward: 100 },
  { id: 'perfect_bomb', name: '💯 完美轰炸', desc: '单关获得 S 评级', reward: 200 },
  { id: 'chain_destroy', name: '🔥 连环爆破', desc: '连续摧毁 5 个目标', reward: 150 },
  { id: 'no_damage', name: '🛡️ 金身不破', desc: '通关不掉血', reward: 300 },
  { id: 'all_destroy', name: '💥 赶尽杀绝', desc: '单关摧毁所有目标', reward: 200 },
  { id: 'speed_run', name: '⚡ 闪电战', desc: '60秒内完成任意关卡', reward: 250 },
  { id: 'collector', name: '🎁 收集者', desc: '单关拾取 3 个道具', reward: 100 },
  { id: 'sharpshooter', name: '🎯 神枪手', desc: '连续命中 10 发机枪', reward: 150 },
  { id: 'chapter1_clear', name: '🏜️ 沙漠之鹰', desc: '通关第一章', reward: 300 },
  { id: 'chapter2_clear', name: '🏙️ 城市猎人', desc: '通关第二章', reward: 400 },
  { id: 'chapter3_clear', name: '🌊 海域霸主', desc: '通关第三章', reward: 500 },
  { id: 'chapter4_clear', name: '⛰️ 终极指挥官', desc: '通关第四章', reward: 600 },
  { id: 'boss_killer', name: '💀 终结者', desc: '击败最终 BOSS', reward: 500 },
  { id: 'rich', name: '💰 富甲一方', desc: '累计获得 5000 金币', reward: 200 },
  { id: 'max_upgrade', name: '🔧 满级强化', desc: '任一升级项达到满级', reward: 200 },
  { id: 'full_upgrade', name: '⭐ 全面升级', desc: '所有升级项达到满级', reward: 500 },
  { id: 'dodge_master', name: '🎭 闪避大师', desc: '单关闪避 10 发导弹', reward: 200 },
  { id: 'bomb_rain', name: '🌧️ 弹雨纷飞', desc: '单关投弹超过 20 次', reward: 100 },
  { id: 'all_s_rank', name: '👑 全明星', desc: '所有关卡 S 评级', reward: 1000 },
  { id: 'play_10', name: '🎮 老玩家', desc: '总游戏次数达到 10', reward: 100 },
];

// 颜色主题
export const COLORS = {
  // 卡通风格调色板
  player: 0x4cc9f0,
  playerWing: 0x4895ef,
  bomb: 0x333333,
  bullet: 0xfeca57,
  explosion: 0xff6b35,
  explosionInner: 0xffd93d,
  shield: 0x00d2ff,
  // 建筑颜色
  building1: 0xe9c46a,
  building2: 0xf4a261,
  building3: 0x2a9d8f,
  building4: 0x264653,
  military: 0x636e72,
  // 地形颜色
  desert: 0xDEB887,
  city: 0x95a5a6,
  coast: 0x76c7c0,
  mountain: 0x8d6e63,
  water: 0x3498db,
  grass: 0x55efc4,
  // 敌方
  antiAir: 0xe74c3c,
  missile: 0xff4757,
  // 道具
  pickupShield: 0x00d2ff,
  pickupSpeed: 0xfeca57,
  pickupMega: 0xff6b35,
  pickupHealth: 0x2ecc71,
};
