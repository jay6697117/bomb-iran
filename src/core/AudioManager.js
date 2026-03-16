// ============================
// 音频管理器 - Web Audio API 合成音效
// ============================

export class AudioManager {
  constructor() {
    this.context = null;
    this.sounds = {};
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
    this.isMuted = false;
  }

  // 初始化音频上下文（需用户交互后调用）
  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  // 注册合成音效
  registerSynth(name, config) {
    this.sounds[name] = { type: 'synth', config };
  }

  // 播放合成音效
  play(name) {
    if (this.isMuted) return;
    if (!this.context) this.init();

    const sound = this.sounds[name];
    if (!sound || sound.type !== 'synth') return;

    const { frequency = 440, duration = 0.2, type = 'square', volume = 1 } = sound.config;

    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.context.currentTime);

      // 频率滑动效果（让音效更有趣）
      if (sound.config.frequencyEnd) {
        osc.frequency.exponentialRampToValueAtTime(
          sound.config.frequencyEnd,
          this.context.currentTime + duration
        );
      }

      gain.gain.setValueAtTime(volume * this.sfxVolume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.context.destination);

      osc.start();
      osc.stop(this.context.currentTime + duration);
    } catch (e) {
      // 忽略音频错误，不影响游戏
    }
  }

  // 播放爆炸音效（混合多个振荡器）
  playExplosion() {
    if (this.isMuted || !this.context) return;

    try {
      // 低频隆隆声
      const osc1 = this.context.createOscillator();
      const gain1 = this.context.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(60, this.context.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(20, this.context.currentTime + 0.5);
      gain1.gain.setValueAtTime(0.5 * this.sfxVolume, this.context.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(this.context.destination);
      osc1.start();
      osc1.stop(this.context.currentTime + 0.5);

      // 噪音碎裂声（使用高频方波模拟）
      const osc2 = this.context.createOscillator();
      const gain2 = this.context.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(200, this.context.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.3);
      gain2.gain.setValueAtTime(0.3 * this.sfxVolume, this.context.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(this.context.destination);
      osc2.start();
      osc2.stop(this.context.currentTime + 0.3);
    } catch (e) {
      // 忽略
    }
  }

  setMusicVolume(v) { this.musicVolume = v; }
  setSfxVolume(v) { this.sfxVolume = v; }
  toggleMute() { this.isMuted = !this.isMuted; }
}
