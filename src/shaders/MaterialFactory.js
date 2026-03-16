// ============================
// 风格化 PBR 材质工厂
// 替代原有 ToonShader 的卡通材质系统
// 提供写实PBR + 精致卡通的混合风格
// ============================
import * as THREE from 'three';

// 材质预设配置
const MATERIAL_PRESETS = {
  // 金属质感（炮台/机身金属件/炮管）
  metal: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.7,
    roughness: 0.3,
    envMapIntensity: 0.6,
  },
  // 油漆涂装（飞机外壳/载具）
  paint: {
    MaterialClass: THREE.MeshPhysicalMaterial,
    metalness: 0.1,
    roughness: 0.35,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.5,
  },
  // 石材/混凝土（建筑/墙壁）
  stone: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 0.85,
    envMapIntensity: 0.3,
  },
  // 泥土/沙地（地形表面）
  earth: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 0.2,
  },
  // 玻璃（驾驶舱/窗户）
  glass: {
    MaterialClass: THREE.MeshPhysicalMaterial,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.7,
    thickness: 0.5,
    envMapIntensity: 0.7,
    transparent: true,
    opacity: 0.85,
  },
  // 布料/帐篷
  fabric: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 0.9,
    envMapIntensity: 0.15,
  },
  // 发光体（指示灯/天线/导弹尾焰）
  emissive: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 0.5,
    emissiveIntensity: 0.6,
  },
  // 植被（树叶/仙人掌）
  foliage: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 0.8,
    envMapIntensity: 0.3,
    side: THREE.DoubleSide,
  },
  // 木材（树干/路灯杆）
  wood: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 0.75,
    envMapIntensity: 0.2,
  },
  // 道路/沥青
  asphalt: {
    MaterialClass: THREE.MeshStandardMaterial,
    metalness: 0.0,
    roughness: 0.95,
    envMapIntensity: 0.1,
  },
};

// 全局环境贴图引用
let _globalEnvMap = null;

// 所有创建过的材质列表（用于批量更新环境贴图）
const _createdMaterials = [];

/**
 * 创建风格化 PBR 材质
 * @param {string} preset - 材质预设名称（metal/paint/stone/earth/glass/emissive/foliage/wood/asphalt）
 * @param {number|THREE.Color} color - 材质颜色（十六进制数值或 THREE.Color）
 * @param {Object} [options] - 额外选项，会覆盖预设默认值
 * @returns {THREE.Material}
 */
export function createMaterial(preset, color, options = {}) {
  const presetConfig = MATERIAL_PRESETS[preset];
  if (!presetConfig) {
    console.warn(`[MaterialFactory] 未知的材质预设: ${preset}，回退到 stone`);
    return createMaterial('stone', color, options);
  }

  const { MaterialClass, ...defaults } = presetConfig;

  // 构建材质参数
  const params = {
    ...defaults,
    color: new THREE.Color(color),
    ...options,
  };

  // 发光体材质需要设置 emissive 颜色
  if (preset === 'emissive') {
    params.emissive = params.emissive || new THREE.Color(color);
  }

  // 应用全局环境贴图
  if (_globalEnvMap) {
    params.envMap = _globalEnvMap;
  }

  // 清理 MaterialClass（不应传入构造函数）
  delete params.MaterialClass;

  const material = new MaterialClass(params);

  // 记录到列表，便于后续批量更新环境贴图
  _createdMaterials.push(new WeakRef(material));

  return material;
}

/**
 * 设置全局环境贴图（所有已创建和未来创建的材质都会使用）
 * @param {THREE.Texture} envMap - PMREMGenerator 生成的环境贴图
 */
export function setGlobalEnvMap(envMap) {
  _globalEnvMap = envMap;

  // 批量更新已创建的材质
  const alive = [];
  for (const ref of _createdMaterials) {
    const mat = ref.deref();
    if (mat && !mat.disposed) {
      mat.envMap = envMap;
      mat.needsUpdate = true;
      alive.push(ref);
    }
  }
  // 清理已回收的弱引用
  _createdMaterials.length = 0;
  _createdMaterials.push(...alive);
}

/**
 * 获取当前全局环境贴图
 * @returns {THREE.Texture|null}
 */
export function getGlobalEnvMap() {
  return _globalEnvMap;
}

// ============================
// 向后兼容接口
// ============================

/**
 * 兼容旧代码的卡通材质创建（内部重定向到 PBR 材质）
 * @param {number} color - 颜色
 * @param {Object} [options] - 可选参数
 * @returns {THREE.Material}
 */
export function createToonMaterialCompat(color, options = {}) {
  // 旧代码调用 createToonMaterial(color) 时，默认使用 stone 预设
  return createMaterial('stone', color, options);
}

// ============================
// 描边材质（保留，作为可选功能）
// ============================

/**
 * 创建描边材质（反面扩大法）
 */
export function createOutlineMaterial(color = 0x000000, thickness = 0.03) {
  return new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color(color) },
      outlineThickness: { value: thickness },
    },
    vertexShader: `
      uniform float outlineThickness;
      void main() {
        vec3 pos = position + normal * outlineThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 outlineColor;
      void main() {
        gl_FragColor = vec4(outlineColor, 1.0);
      }
    `,
    side: THREE.BackSide,
  });
}
