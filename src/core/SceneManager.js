// ============================
// 场景管理器 - Three.js 场景/相机/渲染器/光照/后处理/天空
// ============================
import * as THREE from 'three';
import { PostProcessing } from './PostProcessing.js';
import { SkySystem } from './SkySystem.js';

// 阴影质量配置
const SHADOW_QUALITY = {
  low:    { mapSize: 1024, type: THREE.PCFShadowMap },
  medium: { mapSize: 2048, type: THREE.PCFSoftShadowMap },
  high:   { mapSize: 4096, type: THREE.VSMShadowMap },
};

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,  // 由后处理 FXAA 接管抗锯齿
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap; // 高质量软阴影
    this.renderer.setClearColor(0x000000); // 天空系统接管背景色
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.7;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 场景
    this.scene = new THREE.Scene();
    // 使用指数雾（比线性雾更自然）— 初始密度很低，由 setAtmosphere 动态调整
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.003);

    // 45 度等角相机
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      500  // 扩大远裁剪面以容纳天空
    );
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);

    // 相机偏移（45 度等角视角）
    this.cameraOffset = new THREE.Vector3(0, 25, 25);

    // 天空系统（在光照之前初始化，因为光照需要天空信息）
    this.skySystem = new SkySystem(this.renderer, this.scene);
    this.skySystem.generateClouds(12);

    // 光照
    this.setupLights();

    // 后处理管线（Bloom/暗角/色差/震动/SSAO/色彩分级/FXAA）
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    // 窗口自适应
    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    // 环境光 — 从环境贴图获得间接照明，这里做基础补充
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambient);

    // 主方向光（太阳光，带高质量阴影）
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
    // 太阳方向从天空系统获取
    const sunDir = this.skySystem.getSunDirection();
    this.sunLight.position.set(sunDir.x * 30, sunDir.y * 30, sunDir.z * 30);
    this.sunLight.castShadow = true;

    // VSM 阴影配置
    const quality = SHADOW_QUALITY.high;
    this.sunLight.shadow.mapSize.width = quality.mapSize;
    this.sunLight.shadow.mapSize.height = quality.mapSize;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02; // VSM 需要 normalBias
    this.sunLight.shadow.radius = 4; // VSM 软阴影模糊半径
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 补光 — 柔和蓝色调（模拟天空散射）
    this.fillLight = new THREE.DirectionalLight(0x88bbff, 0.15);
    this.fillLight.position.set(-10, 15, -10);
    this.scene.add(this.fillLight);

    // 半球光 — 天空和地面颜色过渡
    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xDEB887, 0.2);
    this.scene.add(this.hemiLight);

    // 边缘光 — 从玩家背后照射，产生轮廓高光
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
    this.rimLight.position.set(0, 10, 20); // 从后方照向前方
    this.scene.add(this.rimLight);
  }

  /**
   * 根据地形主题设置完整的大气氛围（天空+雾+光照色调）
   * @param {string} terrainTheme - 地形主题：'desert', 'city', 'coast', 'mountain'
   */
  setAtmosphere(terrainTheme) {
    // 设置天空
    const preset = this.skySystem.setForTerrain(terrainTheme);

    // 更新雾效
    const fogConfig = this.skySystem.getFogConfig();
    this.scene.fog.color.set(fogConfig.color);
    this.scene.fog.density = fogConfig.density;

    // 更新太阳光方向
    const sunDir = this.skySystem.getSunDirection();
    this.sunLight.position.set(sunDir.x * 30, sunDir.y * 30, sunDir.z * 30);

    // 根据主题微调光照色温
    const lightConfigs = {
      desert:   { sunColor: 0xfff0d0, sunIntensity: 1.0, fillColor: 0xaabb99, hemiSky: 0xE8D5B7, hemiGround: 0xC4A66A },
      city:     { sunColor: 0xfff5e6, sunIntensity: 0.8, fillColor: 0x88bbff, hemiSky: 0x87CEEB, hemiGround: 0x95a5a6 },
      coast:    { sunColor: 0xffccaa, sunIntensity: 0.7, fillColor: 0x99aacc, hemiSky: 0xFFB6A0, hemiGround: 0x76c7c0 },
      mountain: { sunColor: 0xddeeff, sunIntensity: 0.6, fillColor: 0x6688bb, hemiSky: 0x9BB5D0, hemiGround: 0x8d6e63 },
    };

    const lc = lightConfigs[terrainTheme] || lightConfigs.city;
    this.sunLight.color.set(lc.sunColor);
    this.sunLight.intensity = lc.sunIntensity;
    this.fillLight.color.set(lc.fillColor);
    this.hemiLight.color.set(lc.hemiSky);
    this.hemiLight.groundColor.set(lc.hemiGround);

    // 通知后处理更新色彩分级（不同主题不同色调）
    if (this.postProcessing.setColorPreset) {
      this.postProcessing.setColorPreset(terrainTheme);
    }
  }

  /**
   * 向后兼容：设置天空颜色（旧代码调用此方法）
   * @deprecated 使用 setAtmosphere() 代替
   */
  setSkyColor(color) {
    // 旧的兼容：只设置雾效颜色
    this.scene.fog.color.set(color);
  }

  // 相机跟随目标
  followTarget(targetPosition, smoothness = 0.05) {
    const desired = targetPosition.clone().add(this.cameraOffset);
    this.camera.position.lerp(desired, smoothness);
    this.camera.lookAt(targetPosition);

    // 阴影相机跟随
    const sunDir = this.skySystem.getSunDirection();
    this.sunLight.position.set(
      targetPosition.x + sunDir.x * 30,
      sunDir.y * 30,
      targetPosition.z + sunDir.z * 30
    );
    this.sunLight.target.position.copy(targetPosition);
    this.sunLight.target.updateMatrixWorld();

    // 边缘光也跟随
    this.rimLight.position.set(
      targetPosition.x,
      targetPosition.y + 10,
      targetPosition.z + 20
    );
    this.rimLight.target = this.sunLight.target;
  }

  // 清除场景中的所有非灯光/非天空对象
  clearScene() {
    const toRemove = [];
    this.scene.traverse((child) => {
      if (child.isMesh || child.isGroup) {
        // 保留天空系统的对象
        if (child === this.skySystem.sky || child === this.skySystem.cloudGroup) return;
        if (child.parent === this.skySystem.cloudGroup) return;
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => {
      if (obj.parent === this.scene) {
        this.scene.remove(obj);
      }
    });
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcessing.onResize(w, h);
  }

  // 渲染（通过后处理管线）
  render() {
    this.postProcessing.render();
  }

  // 更新后处理效果和天空系统（每帧调用）
  updatePostProcessing(deltaTime) {
    this.postProcessing.update(deltaTime);
    this.skySystem.update(deltaTime);
  }

  // 快捷方法：屏幕震动
  screenShake(intensity = 0.01, duration = 0.3) {
    this.postProcessing.shake(intensity, duration);
  }

  // 快捷方法：受击闪烁
  hitFlash(intensity = 0.015, duration = 0.15) {
    this.postProcessing.hitFlash(intensity, duration);
  }
}

