// ============================
// 卡通着色器 — 向后兼容层
// 旧代码调用 createToonMaterial() 时自动使用新的 PBR 材质工厂
// ============================
import * as THREE from 'three';
import { createMaterial, createOutlineMaterial as _createOutline } from './MaterialFactory.js';

/**
 * 创建材质（向后兼容接口）
 * 旧代码无需修改即可获得 PBR 材质效果
 * @param {number} color - 颜色
 * @param {Object} [options] - 可选参数
 * @returns {THREE.Material}
 */
export function createToonMaterial(color, options = {}) {
  // 根据旧代码的使用场景，默认使用 stone 预设
  return createMaterial('stone', color, options);
}

// 描边材质直接透传到 MaterialFactory
export function createOutlineMaterial(color = 0x000000, thickness = 0.03) {
  return _createOutline(color, thickness);
}

// 创建带描边的网格（保留兼容）
export function createToonMesh(geometry, color, options = {}) {
  const { outlineThickness = 0.03, outlineColor = 0x222222, castShadow = true } = options;

  const group = new THREE.Group();

  // 主体网格（使用 PBR 材质）
  const mainMesh = new THREE.Mesh(geometry, createToonMaterial(color));
  mainMesh.castShadow = castShadow;
  mainMesh.receiveShadow = true;
  group.add(mainMesh);

  // 描边网格
  if (outlineThickness > 0) {
    const outlineMesh = new THREE.Mesh(geometry, createOutlineMaterial(outlineColor, outlineThickness));
    group.add(outlineMesh);
  }

  return group;
}
