// ============================
// 全局常量和配置 — 硬核模式 C
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

// 武器类型（4种）
export const WEAPONS = {
  BOMB: 'bomb',
  GUN: 'gun',
  MISSILE: 'missile',
  NAPALM: 'napalm'
};

// 武器详细配置
export const WEAPON_CONFIG = {
  bomb: {
    name: '💣 炸弹',
    key: '1',
    cooldown: 1000,
    damage: 10,
    blastRadius: 5,
    maxAmmo: 20,
    startAmmo: 15,
    description: '自由落体炸弹，大范围爆炸'
  },
  gun: {
    name: '🔫 机枪',
    key: '2',
    cooldown: 100,
    damage: 1,
    maxAmmo: 300,
    startAmmo: 200,
    description: '高射速机枪，适合打战斗机'
  },
  missile: {
    name: '🚀 导弹',
    key: '3',
    cooldown: 2000,
    damage: 25,
    blastRadius: 3,
    speed: 20,
    turnRate: 3,
    maxAmmo: 8,
    startAmmo: 4,
    description: '空对地导弹，精确打击'
  },
  napalm: {
    name: '🔥 凝固汽油弹',
    key: '4',
    cooldown: 3000,
    damage: 3,            // 每秒伤害
    burnDuration: 5,      // 燃烧持续秒数
    burnRadius: 8,        // 燃烧区域半径
    maxAmmo: 6,
    startAmmo: 3,
    description: '大面积区域燃烧，持续伤害'
  }
};

// 燃料配置
export const FUEL_CONFIG = {
  maxFuel: 100,
  consumeRate: 2,         // 每秒消耗
  boostMultiplier: 2.5,   // 加速时消耗倍率
  lowFuelThreshold: 20,   // 低燃料警告阈值（百分比）
  criticalFuelThreshold: 10, // 危险燃料阈值
  descentRate: 1.5        // 无燃料下坠速度
};

// 道具类型
export const PICKUPS = {
  SHIELD: 'shield',
  SPEED: 'speed',
  MEGA_BOMB: 'mega_bomb',
  HEALTH: 'health',
  FUEL: 'fuel',
  AMMO: 'ammo',
  WEAPON_CRATE: 'weapon_crate'
};

// 补给空投配置
export const SUPPLY_CONFIG = {
  fallSpeed: 3,           // 降落伞下降速度
  despawnTime: 30,        // 超时消失时间
  fuelAmount: 40,         // 燃料补给量
  ammoRefillPercent: 0.5  // 弹药补充比例（50%最大值）
};

// 敌方配置
export const ENEMY_CONFIG = {
  fighter: {
    hp: 8,
    speed: 12,
    turnRate: 2,
    fireRate: 1.5,        // 射击间隔秒
    damage: 1,
    attackRange: 30,
    detectionRange: 50,
    bulletSpeed: 25,
    scoreValue: 300
  },
  radar: {
    hp: 8,
    detectionRange: 40,
    rotationSpeed: 1.5,   // 天线旋转速度
    alertBonus: 1.5,      // 防空射速提升倍率
    scanInterval: 2,      // 扫描间隔
    scoreValue: 400
  },
  sam: {
    hp: 15,
    fireRate: 6,          // 发射间隔秒
    range: 45,
    missileSpeed: 14,
    missileTurnRate: 3,
    missileLifetime: 8,
    salvoCount: 3,        // 一波齐射几发
    reloadTime: 10,       // 齐射后装填时间
    scoreValue: 500
  }
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
  maxHP: 5,
  altitude: 8,
  bombCooldown: 1000,     // 保留兼容
  gunCooldown: 100,
  bombBlastRadius: 5,
  gunDamage: 1,
  bombDamage: 10
};

// 物理常量
export const PHYSICS = {
  gravity: -20,
  bombMass: 2,
  napalmMass: 3,
  debrisMass: 0.5,
  blastForce: 30,
  debrisCount: 8
};

// 升级配置（含新武器升级项）
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
  missilePower: {
    name: '🚀 导弹威力',
    maxLevel: 5,
    costs: [0, 300, 600, 1000, 2000],
    multipliers: [1, 1.3, 1.6, 2.0, 2.5]
  },
  napalmRange: {
    name: '🔥 燃烧范围',
    maxLevel: 3,
    costs: [0, 400, 800],
    multipliers: [1, 1.4, 1.8]
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
    values: [5, 7, 9]
  },
  fuelCapacity: {
    name: '⛽ 燃料容量',
    maxLevel: 3,
    costs: [0, 400, 800],
    values: [100, 140, 180]
  },
  ammoCapacity: {
    name: '📦 弹药容量',
    maxLevel: 3,
    costs: [0, 400, 800],
    multipliers: [1, 1.3, 1.6]
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
  { id: 'ace_pilot', name: '🦅 王牌飞行员', desc: '单关击落 3 架战斗机', reward: 300 },
  { id: 'radar_hunter', name: '📡 雷达猎人', desc: '一关内摧毁所有雷达站', reward: 250 },
  { id: 'napalm_master', name: '🔥 烈焰之王', desc: '凝固汽油弹一次击毁 3 个目标', reward: 350 },
  { id: 'fuel_miser', name: '⛽ 节油大师', desc: '通关时剩余燃料超过 50%', reward: 200 },
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
  // 玩家武器
  playerMissile: 0x00b894,
  napalm: 0xff7675,
  napalmFlame: 0xfdcb6e,
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
  enemyFighter: 0xd63031,
  enemyFighterWing: 0xc0392b,
  radar: 0x6c5ce7,
  radarDish: 0xa29bfe,
  sam: 0xe17055,
  samMissile: 0xff4757,
  // 道具
  pickupShield: 0x00d2ff,
  pickupSpeed: 0xfeca57,
  pickupMega: 0xff6b35,
  pickupHealth: 0x2ecc71,
  pickupFuel: 0xfdcb6e,
  pickupAmmo: 0x74b9ff,
  pickupWeaponCrate: 0xa29bfe,
  // 补给
  supplyParachute: 0xffffff,
  supplyCrate: 0xb2bec3,
};
