// ============================
// 成就管理器 — 检查、解锁、通知
// ============================
import { ACHIEVEMENTS } from '../utils/constants.js';
import { LEVEL_DATA } from '../levels/LevelData.js';
import { UPGRADE_CONFIG } from '../utils/constants.js';
import { LevelManager } from '../levels/LevelManager.js';

export class AchievementManager {
  constructor(game, achievementNotify) {
    this.game = game;
    this.notify = achievementNotify;
  }

  /**
   * 关卡完成后调用，检查所有成就条件
   * @param {object} result - 关卡结算结果
   * @param {object} save - 当前存档（含已解锁成就等）
   */
  checkAchievements(result, save) {
    const unlocked = save.achievements || [];
    const stats = result.stats || {};
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      // 跳过已解锁的
      if (unlocked.includes(ach.id)) continue;

      // 检查当前成就是否满足条件
      if (this.checkCondition(ach.id, result, stats, save)) {
        newlyUnlocked.push(ach);
      }
    }

    // 解锁并通知
    if (newlyUnlocked.length > 0) {
      this.unlockAchievements(newlyUnlocked, save);
    }

    return newlyUnlocked;
  }

  /**
   * 检查单个成就条件
   */
  checkCondition(id, result, stats, save) {
    switch (id) {
      // === 关卡完成类 ===
      case 'first_mission':
        // 完成第一关
        return result.levelId === '1-1';

      case 'chapter1_clear':
        // 通关第一章（完成 1-3）
        return result.levelId === '1-3';

      case 'chapter2_clear':
        // 通关第二章（完成 2-3）
        return result.levelId === '2-3';

      case 'chapter3_clear':
        // 通关第三章（完成 3-3）
        return result.levelId === '3-3';

      case 'chapter4_clear':
        // 通关第四章（完成 4-3）
        return result.levelId === '4-3';

      case 'boss_killer':
        // 击败最终 BOSS — 完成带 boss 的最后一关
        return result.levelId === '4-3';

      // === 评级类 ===
      case 'perfect_bomb':
        // 单关获得 S 评级
        return result.grade === 'S';

      case 'all_s_rank': {
        // 所有关卡 S 评级
        const levels = save.levels || {};
        const allIds = Object.keys(LEVEL_DATA);
        // 当前关也要算上
        const allS = allIds.every(id => {
          if (id === result.levelId) return result.grade === 'S';
          return levels[id] && levels[id].grade === 'S';
        });
        return allS;
      }

      // === 战斗统计类 ===
      case 'chain_destroy':
        // 连续摧毁 5 个目标
        return (stats.consecutiveHits || 0) >= 5;

      case 'no_damage':
        // 通关不掉血
        return (stats.damageReceived || 0) === 0;

      case 'all_destroy':
        // 单关摧毁所有目标（100% 摧毁率）
        return result.destroyRate === 100;

      case 'speed_run':
        // 60 秒内完成关卡
        return (result.timeUsed || 999) <= 60;

      case 'collector':
        // 单关拾取 3 个道具
        return (stats.pickupsCollected || 0) >= 3;

      case 'sharpshooter':
        // 连续命中 10 发机枪
        return (stats.consecutiveHits || 0) >= 10;

      case 'dodge_master':
        // 单关闪避 10 发导弹
        return (stats.missilesEvaded || 0) >= 10;

      case 'bomb_rain':
        // 单关投弹超过 20 次
        return (stats.bombsDropped || 0) >= 20;

      case 'ace_pilot':
        // 单关击落 3 架战斗机
        return (stats.fightersShot || 0) >= 3;

      case 'napalm_master':
        // 凝固汽油弹一次击毁 3 个目标（使用 napalmDropped 作为近似）
        return (stats.napalmDropped || 0) >= 3 && (stats.targetsDestroyed || 0) >= 3;

      case 'fuel_miser':
        // 通关时剩余燃料超过 50%
        return (result.fuelRemaining || 0) >= 50;

      case 'radar_hunter': {
        // 一关内摧毁所有雷达站
        const levelData = LEVEL_DATA[result.levelId];
        if (!levelData || !levelData.radars || levelData.radars.length === 0) return false;
        // 如果摧毁率是 100%，雷达也都被摧毁了
        return result.destroyRate === 100;
      }

      // === 累计类 ===
      case 'rich':
        // 累计获得 5000 金币（当前存档加上本次奖励）
        return (save.coins || 0) >= 5000;

      case 'play_10':
        // 总游戏次数达到 10
        return (save.totalPlays || 0) >= 10;

      case 'max_upgrade': {
        // 任一升级项达到满级
        const upgrades = save.upgradeLevels || {};
        return Object.keys(UPGRADE_CONFIG).some(key => {
          const maxLv = UPGRADE_CONFIG[key].maxLevel;
          return (upgrades[key] || 0) >= maxLv;
        });
      }

      case 'full_upgrade': {
        // 所有升级项达到满级
        const ups = save.upgradeLevels || {};
        return Object.keys(UPGRADE_CONFIG).every(key => {
          const maxLv = UPGRADE_CONFIG[key].maxLevel;
          return (ups[key] || 0) >= maxLv;
        });
      }

      default:
        return false;
    }
  }

  /**
   * 解锁成就：写入存档、发放奖励、弹出通知
   */
  unlockAchievements(achievements, save) {
    if (!save.achievements) save.achievements = [];

    for (const ach of achievements) {
      // 记录已解锁
      save.achievements.push(ach.id);

      // 发放金币奖励
      save.coins = (save.coins || 0) + (ach.reward || 0);

      // 弹出 Toast 通知
      if (this.notify) {
        this.notify.show(ach);
      }

      // 播放音效
      if (this.game && this.game.audioManager) {
        this.game.audioManager.play('achievement');
      }

      console.log(`🏆 成就解锁: ${ach.name} (+${ach.reward} 💰)`);
    }

    // 保存到 localStorage
    try {
      localStorage.setItem('bomb_iran_save', JSON.stringify(save));
    } catch (e) {
      console.warn('保存成就失败', e);
    }
  }
}
