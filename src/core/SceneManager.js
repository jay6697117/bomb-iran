// ============================
// 场景管理器 - Three.js 场景/相机/渲染器/光照/后处理
// ============================
import * as THREE from 'three';
import { PostProcessing } from './PostProcessing.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87CEEB);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // 场景
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 140);

    // 45 度等角相机
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);

    // 相机偏移（45 度等角视角）
    this.cameraOffset = new THREE.Vector3(0, 25, 25);

    // 光照
    this.setupLights();

    // 后处理管线（Bloom/暗角/色差/震动）
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    // 窗口自适应
    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    // 环境光 - 基础照明
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // 主方向光（太阳光，带阴影）
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    this.sunLight.position.set(15, 25, 15);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // 补光 - 柔和蓝色调
    const fillLight = new THREE.DirectionalLight(0x88bbff, 0.35);
    fillLight.position.set(-10, 15, -10);
    this.scene.add(fillLight);

    // 半球光 - 天空和地面颜色过渡
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xDEB887, 0.3);
    this.scene.add(hemiLight);
  }

  // 相机跟随目标
  followTarget(targetPosition, smoothness = 0.05) {
    const desired = targetPosition.clone().add(this.cameraOffset);
    this.camera.position.lerp(desired, smoothness);
    this.camera.lookAt(targetPosition);

    // 阴影相机也跟随
    this.sunLight.position.set(
      targetPosition.x + 15,
      25,
      targetPosition.z + 15
    );
    this.sunLight.target.position.copy(targetPosition);
    this.sunLight.target.updateMatrixWorld();
  }

  // 设置天空颜色（不同关卡场景用）
  setSkyColor(color) {
    this.renderer.setClearColor(color);
    this.scene.fog.color.set(color);
  }

  // 清除场景中的所有非灯光对象
  clearScene() {
    const toRemove = [];
    this.scene.traverse((child) => {
      if (child.isMesh || child.isGroup) {
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

  // 更新后处理效果（每帧调用）
  updatePostProcessing(deltaTime) {
    this.postProcessing.update(deltaTime);
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
