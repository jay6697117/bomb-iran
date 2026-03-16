// ============================
// 后处理管线 - Bloom/SSAO/暗角/色差/屏幕震动/色彩分级/FXAA
// ============================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// ============================
// 自定义 Shader 定义
// ============================

// 暗角 Shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = clamp(1.0 - dot(uv, uv), 0.0, 1.0);
      texel.rgb *= mix(1.0, vignette, darkness);
      gl_FragColor = texel;
    }
  `,
};

// 色差 Shader（受击/爆炸闪烁）
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      float r = texture2D(tDiffuse, vUv - dir * amount * dist).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * amount * dist).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

// 屏幕震动 Shader
const ScreenShakeShader = {
  uniforms: {
    tDiffuse: { value: null },
    offsetX: { value: 0.0 },
    offsetY: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offsetX;
    uniform float offsetY;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv + vec2(offsetX, offsetY);
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};

// 色彩分级 Shader — 调整亮度/对比度/饱和度/色温
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },    // [-1, 1]
    contrast: { value: 1.0 },      // [0, 2]
    saturation: { value: 1.0 },    // [0, 2]
    temperature: { value: 0.0 },   // [-1, 1]  负值偏冷蓝，正值偏暖黄
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float temperature;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // 亮度
      texel.rgb += brightness;

      // 对比度
      texel.rgb = (texel.rgb - 0.5) * contrast + 0.5;

      // 饱和度
      float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      texel.rgb = mix(vec3(lum), texel.rgb, saturation);

      // 色温偏移
      texel.r += temperature * 0.1;
      texel.b -= temperature * 0.1;

      texel.rgb = clamp(texel.rgb, 0.0, 1.0);
      gl_FragColor = texel;
    }
  `,
};

// SSAO 简化版 Shader（Screen Space Ambient Occlusion）
const SimpleSSAOShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 500 },
    aoStrength: { value: 0.5 },
    aoRadius: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float aoStrength;
    uniform float aoRadius;
    varying vec2 vUv;

    // 手动定义深度转换函数（Three.js 内置函数在自定义 ShaderPass 中不可用）
    float perspDepthToViewZ(float depth, float near, float far) {
      return (near * far) / ((far - near) * depth - far);
    }

    float viewZToOrthoDepth(float viewZ, float near, float far) {
      return (viewZ + near) / (near - far);
    }

    float readDepth(vec2 coord) {
      float fragCoordZ = texture2D(tDepth, coord).x;
      float viewZ = perspDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      return viewZToOrthoDepth(viewZ, cameraNear, cameraFar);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float depth = readDepth(vUv);

      // 忽略天空（深度接近 1.0）
      if (depth > 0.99) {
        gl_FragColor = color;
        return;
      }

      // 基于深度差的 AO 采样
      float ao = 0.0;
      float sampleRadius = aoRadius / resolution.x;

      // 8 方向采样
      for (int i = 0; i < 8; i++) {
        float angle = float(i) * 0.785398; // PI/4
        vec2 offset = vec2(cos(angle), sin(angle)) * sampleRadius;
        float sampleDepth = readDepth(vUv + offset);
        float diff = depth - sampleDepth;
        ao += smoothstep(0.0, 0.02, diff) * 0.125;
      }

      ao = 1.0 - ao * aoStrength;
      color.rgb *= ao;
      gl_FragColor = color;
    }
  `,
};

// ============================
// 色彩分级预设（不同关卡不同色调）
// ============================
const COLOR_PRESETS = {
  desert:   { brightness: 0.05, contrast: 1.1, saturation: 1.15, temperature: 0.3 },
  city:     { brightness: 0.0,  contrast: 1.05, saturation: 1.0,  temperature: 0.0 },
  coast:    { brightness: 0.02, contrast: 1.0,  saturation: 1.2,  temperature: 0.2 },
  mountain: { brightness: -0.03, contrast: 1.1, saturation: 0.9,  temperature: -0.25 },
};

// ============================
// 后处理主类
// ============================

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // EffectComposer
    this.composer = new EffectComposer(renderer);

    // 1. 场景渲染 Pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. SSAO（简化版，基于深度的环境光遮蔽）
    // 注意：当前实现需要额外的深度渲染 pass，性能开销较大
    // 默认禁用，可通过 setQuality('high') 启用
    this.ssaoPass = new ShaderPass(SimpleSSAOShader);
    this.ssaoPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    this.ssaoPass.uniforms['cameraNear'].value = camera.near;
    this.ssaoPass.uniforms['cameraFar'].value = camera.far;
    this.ssaoPass.uniforms['aoStrength'].value = 0.3;
    this.ssaoPass.uniforms['aoRadius'].value = 0.4;
    this.ssaoPass.enabled = false; // 默认禁用，避免双重渲染崩溃
    // SSAO 需要深度纹理
    this.setupDepthTexture();
    this.composer.addPass(this.ssaoPass);

    // 3. Bloom 发光（爆炸/道具/闪光）
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    // Bloom 参数：(分辨率, 强度, 半径, 阈值)
    // 提高阈值到 0.98 以只让极亮物体产生光辉，降低强度避免飞机周围白色光晕
    this.bloomPass = new UnrealBloomPass(resolution, 0.08, 0.2, 0.98);
    this.composer.addPass(this.bloomPass);

    // 4. 屏幕震动
    this.shakePass = new ShaderPass(ScreenShakeShader);
    this.composer.addPass(this.shakePass);

    // 5. 色差（受击闪烁时短暂启用）
    this.chromaPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(this.chromaPass);

    // 6. 色彩分级
    this.colorGradingPass = new ShaderPass(ColorGradingShader);
    this.composer.addPass(this.colorGradingPass);

    // 7. 暗角（画面边缘变暗，增加聚焦感）
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = 1.0;
    this.vignettePass.uniforms['darkness'].value = 0.5;
    this.composer.addPass(this.vignettePass);

    // 8. FXAA 抗锯齿（最后一步）
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.set(
      1 / (window.innerWidth * pixelRatio),
      1 / (window.innerHeight * pixelRatio)
    );
    this.composer.addPass(this.fxaaPass);

    // 震动状态
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;

    // 色差闪烁状态
    this.chromaIntensity = 0;
    this.chromaTimer = 0;
  }

  /**
   * 设置深度纹理（SSAO 需要）
   */
  setupDepthTexture() {
    // 创建深度渲染目标
    const depthTexture = new THREE.DepthTexture();
    depthTexture.type = THREE.FloatType;

    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight,
      {
        depthTexture: depthTexture,
        depthBuffer: true,
      }
    );
    this.depthRenderTarget = renderTarget;

    // 将深度纹理传给 SSAO
    this.ssaoPass.uniforms['tDepth'].value = depthTexture;
  }

  // 触发屏幕震动
  shake(intensity = 0.01, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  // 触发色差闪烁（受击反馈）
  hitFlash(intensity = 0.01, duration = 0.15) {
    this.chromaIntensity = intensity;
    this.chromaTimer = duration;
  }

  /**
   * 设置色彩分级预设（不同关卡不同色调）
   * @param {string} presetName - 'desert', 'city', 'coast', 'mountain'
   */
  setColorPreset(presetName) {
    const preset = COLOR_PRESETS[presetName] || COLOR_PRESETS.city;
    this.colorGradingPass.uniforms['brightness'].value = preset.brightness;
    this.colorGradingPass.uniforms['contrast'].value = preset.contrast;
    this.colorGradingPass.uniforms['saturation'].value = preset.saturation;
    this.colorGradingPass.uniforms['temperature'].value = preset.temperature;
  }

  /**
   * 设置画质等级（控制哪些 Pass 启用）
   * @param {'low'|'medium'|'high'} level
   */
  setQuality(level) {
    switch (level) {
      case 'low':
        this.ssaoPass.enabled = false;
        this.bloomPass.enabled = false;
        this.colorGradingPass.enabled = true;
        this.fxaaPass.enabled = true;
        break;
      case 'medium':
        this.ssaoPass.enabled = false;
        this.bloomPass.enabled = true;
        this.colorGradingPass.enabled = true;
        this.fxaaPass.enabled = true;
        break;
      case 'high':
      default:
        this.ssaoPass.enabled = true;
        this.bloomPass.enabled = true;
        this.colorGradingPass.enabled = true;
        this.fxaaPass.enabled = true;
        break;
    }
  }

  // 每帧更新
  update(deltaTime) {
    // 屏幕震动衰减
    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
      const progress = this.shakeTimer / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * progress;
      this.shakePass.uniforms['offsetX'].value = (Math.random() - 0.5) * currentIntensity * 2;
      this.shakePass.uniforms['offsetY'].value = (Math.random() - 0.5) * currentIntensity * 2;
    } else {
      this.shakePass.uniforms['offsetX'].value = 0;
      this.shakePass.uniforms['offsetY'].value = 0;
    }

    // 色差闪烁衰减
    if (this.chromaTimer > 0) {
      this.chromaTimer -= deltaTime;
      this.chromaPass.uniforms['amount'].value = this.chromaIntensity * (this.chromaTimer / 0.15);
    } else {
      this.chromaPass.uniforms['amount'].value = 0;
    }

    // 更新 SSAO 深度纹理（渲染深度到单独目标）
    if (this.ssaoPass.enabled && this.depthRenderTarget) {
      this.renderer.setRenderTarget(this.depthRenderTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
    }
  }

  // 渲染（替代 renderer.render）
  render() {
    this.composer.render();
  }

  // 窗口 resize
  onResize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);

    // 更新 FXAA 分辨率
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.set(
      1 / (width * pixelRatio),
      1 / (height * pixelRatio)
    );

    // 更新 SSAO 分辨率
    this.ssaoPass.uniforms['resolution'].value.set(width, height);

    // 更新深度渲染目标
    if (this.depthRenderTarget) {
      this.depthRenderTarget.setSize(width, height);
    }
  }
}

