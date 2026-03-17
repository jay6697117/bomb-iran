// ============================
// 程序化天空系统
// 提供天空渲染、环境贴图生成、云层效果
// ============================
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { setGlobalEnvMap } from '../shaders/MaterialFactory.js';

// 天空主题预设
const SKY_PRESETS = {
  // 正午 — 沙漠地图用（强烈阳光，高浑浊度）
  noon: {
    turbidity: 4,
    rayleigh: 1.0,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.8,
    sunElevation: 65,
    sunAzimuth: 180,
    fogDensity: 0.003,
    fogColor: 0xE8D5B7,
  },
  // 清晨 — 城市地图用（清新天空）
  morning: {
    turbidity: 2,
    rayleigh: 1.5,
    mieCoefficient: 0.002,
    mieDirectionalG: 0.7,
    sunElevation: 35,
    sunAzimuth: 120,
    fogDensity: 0.002,
    fogColor: 0xADD8E6,
  },
  // 日落 — 海岸地图用（温暖霞光）
  sunset: {
    turbidity: 3,
    rayleigh: 2.0,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.9,
    sunElevation: 10,
    sunAzimuth: 250,
    fogDensity: 0.003,
    fogColor: 0xFFB6A0,
  },
  // 阴天 — 山地地图用（低角度冷色调）
  overcast: {
    turbidity: 6,
    rayleigh: 0.4,
    mieCoefficient: 0.01,
    mieDirectionalG: 0.6,
    sunElevation: 25,
    sunAzimuth: 160,
    fogDensity: 0.005,
    fogColor: 0xC0C8D0,
  },
};

// 地形主题到天空预设的映射
const THEME_TO_SKY = {
  desert: 'noon',
  city: 'morning',
  coast: 'sunset',
  mountain: 'overcast',
};

export class SkySystem {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.currentPreset = null;

    // 创建 Sky 对象（仅用于生成环境贴图，不直接添加到可见场景）
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    // 注意：不添加到 this.scene，避免超亮太阳光盘直接渲染
    this.skyScene = new THREE.Scene();
    this.skyScene.add(this.sky);

    // 太阳位置向量
    this.sunPosition = new THREE.Vector3();

    // PMREM 生成器（用于生成环境反射贴图）
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.envMap = null;

    // 云层
    this.clouds = [];
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'clouds';
    this.scene.add(this.cloudGroup);

    // 默认设置正午天空
    this.setPreset('noon');
  }

  /**
   * 设置天空预设
   * @param {string} presetName - 预设名称：'noon', 'morning', 'sunset', 'overcast'
   */
  setPreset(presetName) {
    const preset = SKY_PRESETS[presetName];
    if (!preset) {
      console.warn(`[SkySystem] 未知的天空预设: ${presetName}`);
      return;
    }

    this.currentPreset = presetName;
    const uniforms = this.sky.material.uniforms;

    // 设置大气散射参数
    uniforms['turbidity'].value = preset.turbidity;
    uniforms['rayleigh'].value = preset.rayleigh;
    uniforms['mieCoefficient'].value = preset.mieCoefficient;
    uniforms['mieDirectionalG'].value = preset.mieDirectionalG;

    // 计算太阳位置
    const phi = THREE.MathUtils.degToRad(90 - preset.sunElevation);
    const theta = THREE.MathUtils.degToRad(preset.sunAzimuth);
    this.sunPosition.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(this.sunPosition);

    // 生成环境贴图
    this.generateEnvMap();

    return preset;
  }

  /**
   * 根据地形主题设置天空
   * @param {string} terrainTheme - 地形主题：'desert', 'city', 'coast', 'mountain'
   * @returns {Object} 天空预设配置
   */
  setForTerrain(terrainTheme) {
    const skyPreset = THEME_TO_SKY[terrainTheme] || 'noon';
    return this.setPreset(skyPreset);
  }

  /**
   * 生成环境贴图（供 PBR 材质反射使用）
   */
  generateEnvMap() {
    // 清理旧的环境贴图
    if (this.envMap) {
      this.envMap.dispose();
    }

    // 使用独立的 skyScene 生成环境贴图
    // PMREM 会自动对 HDR 进行预过滤，压制太阳光盘的极端亮度
    const renderTarget = this.pmremGenerator.fromScene(this.skyScene);
    this.envMap = renderTarget.texture;

    // 用环境贴图作为背景（PMREM 已压缩 HDR 峰值）
    this.scene.background = this.envMap;
    this.scene.backgroundIntensity = 0.18; // 大幅降低背景亮度，防止天空过曝
    this.scene.backgroundBlurriness = 0.12; // 增加模糊以柔化太阳光盘残余高亮

    // 设置场景环境（间接照明用）
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.12; // 降低环境间接照明强度

    // 通知材质工厂更新所有材质
    setGlobalEnvMap(this.envMap);
  }

  /**
   * 生成云层
   * @param {number} count - 云朵数量
   */
  generateClouds(count = 12) {
    // 清理旧云层
    this.clearClouds();

    for (let i = 0; i < count; i++) {
      const cloud = this.createCloud();

      // 随机位置（在场景上方的大范围内分布）
      cloud.position.set(
        (Math.random() - 0.5) * 200,
        30 + Math.random() * 20,  // 高度 30-50
        (Math.random() - 0.5) * 200
      );

      // 随机缩放
      const scale = 1 + Math.random() * 2;
      cloud.scale.set(scale * 2, scale * 0.5, scale);

      // 随机朝向
      cloud.rotation.y = Math.random() * Math.PI * 2;

      // 飘动速度
      cloud.userData.windSpeed = 0.5 + Math.random() * 1.5;
      cloud.userData.windDirection = new THREE.Vector3(1, 0, 0.3).normalize();

      this.cloudGroup.add(cloud);
      this.clouds.push(cloud);
    }
  }

  /**
   * 创建单个云朵（多个半透明球体组合）
   */
  createCloud() {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 1.0,
      metalness: 0.0,
      depthWrite: false,
    });

    // 用 2-3 个球体组合出云的形状（性能优化：减少球体数）
    const blobCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < blobCount; i++) {
      const radius = 2 + Math.random() * 3;
      const geo = new THREE.SphereGeometry(radius, 8, 6);
      const blob = new THREE.Mesh(geo, cloudMat.clone());
      blob.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 3
      );
      // 每个球体略微不同的透明度
      blob.material.opacity = 0.4 + Math.random() * 0.3;
      group.add(blob);
    }

    return group;
  }

  /**
   * 清理云层
   */
  clearClouds() {
    for (const cloud of this.clouds) {
      this.cloudGroup.remove(cloud);
      cloud.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
    this.clouds = [];
  }

  /**
   * 每帧更新（云层飘动）
   * @param {number} deltaTime
   */
  update(deltaTime) {
    for (const cloud of this.clouds) {
      const { windSpeed, windDirection } = cloud.userData;
      cloud.position.addScaledVector(windDirection, windSpeed * deltaTime);

      // 超出范围后循环回来
      if (cloud.position.x > 120) cloud.position.x = -120;
      if (cloud.position.x < -120) cloud.position.x = 120;
    }
  }

  /**
   * 获取当前天空预设的雾效配置
   * @returns {{ density: number, color: number }}
   */
  getFogConfig() {
    const preset = SKY_PRESETS[this.currentPreset];
    return {
      density: preset ? preset.fogDensity : 0.008,
      color: preset ? preset.fogColor : 0x87CEEB,
    };
  }

  /**
   * 获取太阳方向向量（用于设置平行光）
   * @returns {THREE.Vector3}
   */
  getSunDirection() {
    return this.sunPosition.clone().normalize();
  }

  /**
   * 清理资源
   */
  dispose() {
    this.clearClouds();
    this.scene.remove(this.cloudGroup);
    // skyScene 中的 sky 对象也要清理
    this.skyScene.remove(this.sky);
    if (this.envMap) this.envMap.dispose();
    this.pmremGenerator.dispose();
  }
}
