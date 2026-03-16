// ============================
// 写实水面 Shader
// 多层波浪 + 菲涅尔反射 + 焦散 + 泡沫
// ============================
import * as THREE from 'three';

/**
 * 创建写实水面
 * @param {Object} options
 * @param {number} [options.width=60] - 水面宽度
 * @param {number} [options.height=60] - 水面高度
 * @param {number} [options.segments=128] - 网格细分数
 * @returns {THREE.Mesh}
 */
export function createWaterSurface(options = {}) {
  const {
    width = 60,
    height = 60,
    segments = 128
  } = options;

  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x003366) },      // 深水色
      uShallowColor: { value: new THREE.Color(0x0099cc) },   // 浅水色
      uFresnelColor: { value: new THREE.Color(0x88ccff) },    // 菲涅尔反射色
      uFoamColor: { value: new THREE.Color(0xeeffff) },       // 泡沫色
      uSunDirection: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
      uSunColor: { value: new THREE.Color(0xffeecc) },
      uOpacity: { value: 0.85 },
      uWaveHeight: { value: 0.35 },
      uWaveSpeed: { value: 0.8 },
      uFoamThreshold: { value: 0.45 },
    },

    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uWaveHeight;
      uniform float uWaveSpeed;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      varying float vWaveHeight;

      // Simplex 2D 噪声函数
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vUv = uv;

        vec3 pos = position;

        // 多层波浪叠加
        float t = uTime * uWaveSpeed;

        // 主波浪（大波）
        float wave1 = sin(pos.x * 0.8 + t * 1.0) * cos(pos.z * 0.6 + t * 0.7) * 0.5;
        // 次波浪（中波）
        float wave2 = sin(pos.x * 1.5 + t * 1.3 + 1.0) * cos(pos.z * 2.0 + t * 0.9) * 0.25;
        // 细节波（小波）
        float wave3 = snoise(vec2(pos.x * 3.0 + t * 0.5, pos.z * 3.0 + t * 0.3)) * 0.12;
        // 噪声波（打破规则性）
        float wave4 = snoise(vec2(pos.x * 0.5 + t * 0.15, pos.z * 0.5 - t * 0.1)) * 0.15;

        float totalWave = (wave1 + wave2 + wave3 + wave4) * uWaveHeight;
        pos.y += totalWave;

        vWaveHeight = totalWave;

        // 计算法线（有限差分法）
        float eps = 0.1;
        float hL = (sin((pos.x - eps) * 0.8 + t) * cos(pos.z * 0.6 + t * 0.7) * 0.5 +
                    sin((pos.x - eps) * 1.5 + t * 1.3 + 1.0) * cos(pos.z * 2.0 + t * 0.9) * 0.25) * uWaveHeight;
        float hR = (sin((pos.x + eps) * 0.8 + t) * cos(pos.z * 0.6 + t * 0.7) * 0.5 +
                    sin((pos.x + eps) * 1.5 + t * 1.3 + 1.0) * cos(pos.z * 2.0 + t * 0.9) * 0.25) * uWaveHeight;
        float hD = (sin(pos.x * 0.8 + t) * cos((pos.z - eps) * 0.6 + t * 0.7) * 0.5 +
                    sin(pos.x * 1.5 + t * 1.3 + 1.0) * cos((pos.z - eps) * 2.0 + t * 0.9) * 0.25) * uWaveHeight;
        float hU = (sin(pos.x * 0.8 + t) * cos((pos.z + eps) * 0.6 + t * 0.7) * 0.5 +
                    sin(pos.x * 1.5 + t * 1.3 + 1.0) * cos((pos.z + eps) * 2.0 + t * 0.9) * 0.25) * uWaveHeight;

        vec3 computedNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(computedNormal, 0.0)).xyz);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,

    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFresnelColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform float uOpacity;
      uniform float uFoamThreshold;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      varying float vWaveHeight;

      // Simplex 噪声
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 normal = normalize(vWorldNormal);

        // === 菲涅尔效果 ===
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
        fresnel = clamp(fresnel, 0.1, 1.0);

        // === 水体颜色（深浅渐变）===
        // 基于 UV 和噪声混合
        float depthFactor = snoise(vUv * 3.0 + uTime * 0.05) * 0.3 + 0.5;
        depthFactor = clamp(depthFactor, 0.0, 1.0);
        vec3 waterColor = mix(uShallowColor, uDeepColor, depthFactor);

        // === 焦散图案 ===
        float caustic1 = snoise(vWorldPosition.xz * 1.5 + uTime * 0.3);
        float caustic2 = snoise(vWorldPosition.xz * 2.3 - uTime * 0.2 + 5.0);
        float caustics = pow(abs(caustic1 + caustic2) * 0.5, 1.5) * 0.4;
        waterColor += caustics * vec3(0.1, 0.25, 0.35);

        // === 镜面高光（太阳反射） ===
        vec3 halfDir = normalize(uSunDirection + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 128.0);
        vec3 specular = uSunColor * spec * 2.0;

        // 次级高光（环境光）
        float spec2 = pow(max(dot(normal, halfDir), 0.0), 32.0);
        specular += uSunColor * spec2 * 0.3;

        // === 泡沫效果 ===
        // 波浪顶部的白色泡沫
        float foamNoise = snoise(vWorldPosition.xz * 4.0 + uTime * 0.6) * 0.5 + 0.5;
        float foamMask = smoothstep(uFoamThreshold, uFoamThreshold + 0.15, vWaveHeight + foamNoise * 0.1);
        // 边缘泡沫（靠近陆地区域）
        float edgeFoam = smoothstep(0.4, 0.5, abs(vUv.y - 0.5) * 2.0) * foamNoise * 0.3;
        float totalFoam = clamp(foamMask + edgeFoam, 0.0, 1.0);

        // === 最终合成 ===
        vec3 finalColor = mix(waterColor, uFresnelColor, fresnel * 0.6);
        finalColor += specular;
        finalColor = mix(finalColor, uFoamColor, totalFoam * 0.7);

        // 轻微的 SSS（次表面散射模拟）
        float sss = pow(max(dot(-viewDir, uSunDirection), 0.0), 4.0) * 0.15;
        finalColor += vec3(0.0, sss * 0.5, sss);

        gl_FragColor = vec4(finalColor, uOpacity - totalFoam * 0.1);
      }
    `,

    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.userData.isWater = true;

  return mesh;
}

/**
 * 更新水面 Shader（每帧调用）
 * @param {THREE.Mesh} waterMesh
 * @param {number} deltaTime
 */
export function updateWater(waterMesh, deltaTime) {
  if (!waterMesh || !waterMesh.userData.isWater) return;
  waterMesh.material.uniforms.uTime.value += deltaTime;
}
