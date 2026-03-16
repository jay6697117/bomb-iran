// ============================
// 植被风吹动画 Shader
// 通过 onBeforeCompile 注入到 MeshStandardMaterial
// 底部固定，顶部随风摇摆
// ============================
import * as THREE from 'three';

// 风参数
const WIND_CONFIG = {
  speed: 1.2,            // 风速
  strength: 0.15,        // 摇摆幅度
  direction: new THREE.Vector2(1.0, 0.5).normalize(), // 风向（XZ 平面）
};

// 全局时间（所有植被共享）
let _windTime = 0;

/**
 * 更新风时间（每帧调用一次）
 */
export function updateWind(deltaTime) {
  _windTime += deltaTime * WIND_CONFIG.speed;
}

/**
 * 给 MeshStandardMaterial 注入风吹动画
 * 需要在 InstancedMesh 上使用
 * @param {THREE.MeshStandardMaterial} material - 要注入的材质
 * @param {Object} [options] - 可选配置
 * @returns {THREE.MeshStandardMaterial} 注入后的材质
 */
export function applyWindShader(material, options = {}) {
  const strength = options.strength || WIND_CONFIG.strength;

  // 存储 shader 引用以便更新
  material.userData.windShader = null;

  material.onBeforeCompile = (shader) => {
    // 添加自定义 uniform
    shader.uniforms.uWindTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: strength };
    shader.uniforms.uWindDir = { value: WIND_CONFIG.direction };

    // 在顶点 Shader 中注入风动画
    shader.vertexShader = `
      uniform float uWindTime;
      uniform float uWindStrength;
      uniform vec2 uWindDir;
    ` + shader.vertexShader;

    // 替换顶点变换（在 begin_vertex 之后添加位移）
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>

      // 风吹动画 — 基于世界坐标的 instanceMatrix
      #ifdef USE_INSTANCING
        // 获取实例世界位置（从 instanceMatrix 提取平移分量）
        vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        // 基于世界位置的相位偏移（每棵植物相位不同）
        float phase = instancePos.x * 0.37 + instancePos.z * 0.53;
      #else
        float phase = 0.0;
      #endif

      // 高度因子：越高摆动越大，底部（y≈0）不动
      float heightFactor = clamp(position.y / 2.0, 0.0, 1.0);
      heightFactor = heightFactor * heightFactor; // 二次曲线，让底部更稳定

      // 多层正弦叠加，更自然的摇摆
      float wave1 = sin(uWindTime * 2.0 + phase) * 0.6;
      float wave2 = sin(uWindTime * 3.7 + phase * 1.3) * 0.3;
      float wave3 = sin(uWindTime * 5.1 + phase * 2.1) * 0.1;
      float windOffset = (wave1 + wave2 + wave3) * uWindStrength * heightFactor;

      transformed.x += windOffset * uWindDir.x;
      transformed.z += windOffset * uWindDir.y;
      // 微微弯曲（Y 轴下压）
      transformed.y -= abs(windOffset) * 0.15;
      `
    );

    // 存储引用
    material.userData.windShader = shader;
  };

  return material;
}

/**
 * 更新材质的风时间 uniform
 * @param {THREE.MeshStandardMaterial} material
 */
export function updateWindMaterial(material) {
  if (material.userData.windShader) {
    material.userData.windShader.uniforms.uWindTime.value = _windTime;
  }
}
