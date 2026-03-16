// ============================
// 卡通着色器（Toon Shader）
// ============================
import * as THREE from 'three';

// 创建卡通材质
export function createToonMaterial(color, options = {}) {
  const { steps = 4 } = options;

  // 创建梯度贴图实现卡通阶梯光照
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    data[i] = Math.round((i / (steps - 1)) * 255);
  }

  const gradientMap = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  const material = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: gradientMap
  });

  return material;
}

// 创建描边材质（反面扩大法）
export function createOutlineMaterial(color = 0x000000, thickness = 0.03) {
  return new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color(color) },
      outlineThickness: { value: thickness }
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
    side: THREE.BackSide
  });
}

// 创建带描边的卡通网格（返回一个 Group）
export function createToonMesh(geometry, color, options = {}) {
  const { outlineThickness = 0.03, outlineColor = 0x222222, castShadow = true } = options;

  const group = new THREE.Group();

  // 主体网格
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
