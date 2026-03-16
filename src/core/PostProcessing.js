// ============================
// 后处理管线 - Bloom/暗角/色差/屏幕震动
// 基于 threejs-postprocessing Skill
// ============================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// 暗角 Shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 }
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
  `
};

// 色差 Shader（受击/爆炸闪烁）
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 }
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
  `
};

// 屏幕震动 Shader
const ScreenShakeShader = {
  uniforms: {
    tDiffuse: { value: null },
    offsetX: { value: 0.0 },
    offsetY: { value: 0.0 }
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
  `
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // 创建 EffectComposer
    this.composer = new EffectComposer(renderer);

    // 1. 场景渲染 Pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. Bloom 发光（爆炸/道具/闪光）
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.6, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    // 3. 屏幕震动
    this.shakePass = new ShaderPass(ScreenShakeShader);
    this.composer.addPass(this.shakePass);

    // 4. 色差（受击闪烁时短暂启用）
    this.chromaPass = new ShaderPass(ChromaticAberrationShader);
    this.composer.addPass(this.chromaPass);

    // 5. 暗角（画面边缘变暗，增加聚焦感）
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = 1.0;
    this.vignettePass.uniforms['darkness'].value = 0.6;
    this.composer.addPass(this.vignettePass);

    // 震动状态
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;

    // 色差闪烁状态
    this.chromaIntensity = 0;
    this.chromaTimer = 0;
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
  }

  // 渲染（替代 renderer.render）
  render() {
    this.composer.render();
  }

  // 窗口 resize
  onResize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }
}
