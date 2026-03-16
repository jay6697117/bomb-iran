# 🎮 Bomb Iran — 游戏品质全面升级设计文档

> **目标**：将当前卡通几何体风格的轰炸游戏，提升至**写实 PBR + 精致卡通**混合风格的高品质游戏水准。
>
> **方案**：渐进式升级（方案 A），分 5 个阶段逐步实施。
>
> **日期**：2026-03-17

---

## 总体架构概览

```
当前状态                          目标状态
─────────                        ─────────
ToonMaterial (卡通阶梯光照)  →    PBR Stylized Material (写实+风格化)
基础几何体模型               →    GLTF 模型(关键实体) + 精致程序化(场景)
简单 Mesh 粒子               →    GPU 实例化粒子系统
简单合成器音效               →    3D 空间音频 + 分层音效系统
基础 HTML/CSS UI             →    动态动画 HUD + 过渡效果
```

---

## 阶段 1：渲染与光影升级 🎨

> **核心目标**：改一处渲染管线，全场景立刻变好看。

### 1.1 材质系统重构

**目标**：从 `MeshToonMaterial` 迁移到 **风格化 PBR 材质**（`MeshStandardMaterial` / `MeshPhysicalMaterial`）。

#### 改造项

| 文件 | 改动内容 |
|------|----------|
| `src/shaders/ToonShader.js` | 重构为 `MaterialFactory.js`，提供多种预设材质（金属、石材、玻璃、土壤等）|
| 所有实体文件 | 将 `createToonMaterial()` 调用替换为新的材质工厂 |

#### 材质预设示例

```javascript
// 风格化 PBR 材质工厂
export function createStylizedMaterial(preset, options = {}) {
  const presets = {
    metal: { metalness: 0.8, roughness: 0.3, envMapIntensity: 1.2 },
    stone: { metalness: 0.0, roughness: 0.9, envMapIntensity: 0.3 },
    glass: { metalness: 0.1, roughness: 0.05, transmission: 0.9 },
    earth: { metalness: 0.0, roughness: 1.0, envMapIntensity: 0.2 },
    paint: { metalness: 0.0, roughness: 0.4, envMapIntensity: 0.6 }, // 飞机涂装
    emissive: { metalness: 0.0, roughness: 0.5, emissiveIntensity: 2.0 }, // 发光体
  };
  // ...
}
```

#### 关键设计决策
- **不完全写实**：metalness 和 roughness 值会比真实世界偏移，保留"高级卡通感"
- 使用 `MeshPhysicalMaterial` 的 `clearcoat` 属性给飞机涂装做出光泽效果
- 保留描边（outline）效果作为可选，不默认启用

### 1.2 天空与环境系统

**目标**：用程序化天空 + 环境贴图替代纯色背景。

| 组件 | 技术方案 |
|------|----------|
| **天空** | `THREE.Sky` Shader（Preetham 天空模型）— 支持日出/日落/正午不同时段 |
| **环境贴图** | 从 Sky 实时渲染 `PMREMGenerator` 生成环境反射贴图 |
| **云层** | 程序化 Billboard 云（半透明平面 + 噪声纹理，随风飘动） |
| **雾效** | 从 `THREE.Fog` 改为指数雾 `THREE.FogExp2`，结合天空颜色过渡 |

#### 新增文件

- `src/core/SkySystem.js` — 天空、云层、环境贴图管理
- `src/core/WeatherSystem.js`（可选）— 不同关卡的天气氛围

#### 关键设计决策
- 每个地形主题对应不同的太阳角度和天空色调（沙漠=高角度强烈阳光，山地=低角度冷色调）
- 环境贴图在关卡加载时生成一次（性能优先），不实时更新

### 1.3 光照增强

**目标**：更富层次的光影效果。

| 改动 | 说明 |
|------|------|
| **阴影质量** | 从 2048 提升到 4096（可配）+ `VSM` 软阴影替代 `PCFSoft` |
| **级联阴影** | 使用 `CSM`（Cascaded Shadow Maps）覆盖更大范围 |
| **光源** | 增加边缘光 `RimLight` 效果（通过自定义 Shader 或光源组合） |
| **AO** | 场景 SSAO（Screen Space Ambient Occlusion）增强空间感 |

### 1.4 后处理管线增强

**改造文件**：`src/core/PostProcessing.js`

| 新增 Pass | 说明 |
|-----------|------|
| **SSAO** | 屏幕空间环境光遮蔽，增加深度层次感 |
| **色彩分级（Color Grading）** | LUT 色彩映射，给不同关卡不同色调 |
| **景深（DOF）** | 远处物体轻微模糊，增加纵深感 |
| **FXAA/SMAA** | 优质抗锯齿替代默认 antialias |
| **运动模糊** | 加速时的速度感（Speed Boost 道具） |

---

## 阶段 2：模型与场景精度 🏗️

> **核心目标**：关键实体视觉飞跃，场景细节大幅增加。

### 2.1 GLTF 模型加载系统

**新增文件**：`src/core/AssetManager.js`

```javascript
// 统一资源管理器
export class AssetManager {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader(); // Draco 压缩
    this.cache = new Map();
    this.loadingProgress = 0;
  }

  async loadModel(name, url) { /* ... */ }
  async preloadLevel(levelId) { /* ... */ }
  getModel(name) { /* 返回缓存的 clone */ }
}
```

### 2.2 需要 GLTF 模型的实体

| 实体 | 模型需求 | 来源建议 |
|------|----------|----------|
| **玩家飞机** | 低多边形战斗机（含骨骼动画：螺旋桨转动、起落架）| 免费 GLTF 资源或 Blender 自制 |
| **BOSS** | 大型堡垒/据点（多部件可分离动画）| 免费 GLTF 或程序化增强 |
| **防空炮** | 炮台模型（炮管可旋转）| 免费 GLTF |
| **建筑** | 多种建筑风格（中东/城市/军事）| 可混合使用程序化+GLTF |

#### 关键设计决策
- 使用 Draco 压缩减小模型体积
- 实现加载进度条（loading screen）
- 模型 LOD（Level of Detail）：远处用简化版

### 2.3 程序化场景增强

**改造文件**：`src/levels/Terrain.js`

| 改动 | 说明 |
|------|------|
| **地形纹理** | 使用程序化噪声生成地形 Normal Map，增加凹凸感 |
| **植被密度** | 装饰物数量从 8 个提升到 50+，使用 `InstancedMesh` 批量渲染 |
| **道路细节** | 路面标线、路灯、交通标志 |
| **水面** | 海岸关卡的水面反射 Shader（简化版反射 + 波浪) |
| **随机性** | Seed 化的伪随机分布，确保关卡可复现 |

### 2.4 建筑系统增强

**改造文件**：`src/entities/Building.js`

- 多种建筑模板（居民楼/商业楼/军事设施/清真寺/工厂）
- 每种模板有不同的窗户、天台、空调外机等细节
- 摧毁时的碎片种类更多（不只是 Box，增加三角碎片、弧形碎片）

---

## 阶段 3：特效与反馈系统 💥

> **核心目标**：让每一次操作都有强烈的视觉和感官反馈（Juice）。

### 3.1 GPU 粒子系统重构

**改造文件**：`src/systems/ParticleSystem.js`

| 现状 | 目标 |
|------|------|
| 每个粒子是独立 Mesh（~15 个） | 使用 `InstancedBufferGeometry` 或 `Points`（可 1000+ 粒子） |
| 无纹理 | 使用 Billboard 精灵纹理（火焰/烟雾/碎屑/火花） |
| 简单透明度衰减 | 完整生命周期：出生→加速→减速→淡出+颜色渐变 |

```javascript
// GPU 粒子系统核心思路
class GPUParticleSystem {
  constructor(maxParticles = 5000) {
    this.geometry = new THREE.InstancedBufferGeometry();
    // 每个粒子的属性：位置、速度、颜色、生命周期、大小
    this.positionAttr = new THREE.InstancedBufferAttribute(/*...*/);
    this.velocityAttr = new THREE.InstancedBufferAttribute(/*...*/);
    // 使用自定义 Shader 在 GPU 端更新粒子
  }
}
```

### 3.2 爆炸效果升级

**改造文件**：`src/entities/Explosion.js`

| 新增效果 | 说明 |
|----------|------|
| **多阶段爆炸** | 闪光 → 火球膨胀 → 烟柱上升 → 碎片飞溅 → 地面焦痕 |
| **火焰精灵** | 使用 Billboard 火焰纹理 + 颜色渐变（白→黄→橙→红→黑烟）|
| **冲击波扭曲** | 屏幕空间折射扭曲 Shader（爆炸中心向外扩散的透镜效果）|
| **地面焦痕** | 爆炸后在地面留下贴花（Decal），持续数秒后淡出 |
| **碎片拖尾** | 飞溅的碎片带有短暂的烟尾 |

### 3.3 尾迹系统

**新增文件**：`src/systems/TrailSystem.js`

| 实体 | 尾迹效果 |
|------|----------|
| **玩家飞机** | 引擎排气尾迹（白色半透明条带 + 热扭曲）|
| **导弹** | 烟尾（烟雾粒子链 + 发光头部）|
| **子弹** | 曳光弹效果（短发光拖尾）|
| **炸弹** | 下落时的气流尾迹 |

技术方案：使用 `MeshLine` 或自定义 `TubeGeometry` 动态更新顶点。

### 3.4 屏幕效果增强

**改造文件**：`src/core/PostProcessing.js`

| 效果 | 触发时机 |
|------|----------|
| **径向模糊** | 加速道具激活时 |
| **慢动作 + 高对比** | 重要击杀瞬间（如最后一个目标、BOSS 阶段切换）|
| **全屏闪白** | 巨型爆炸 / BOSS 死亡 |
| **画面边缘泛红** | 低血量警告 |
| **击杀确认** | 画面微顿（Hitstop）+ 画面放大 |

### 3.5 打击感系统（Juice System）

**新增文件**：`src/systems/JuiceSystem.js`

统一管理所有"爽感"反馈：

```javascript
export class JuiceSystem {
  // 击杀反馈包
  onKill(game, position, importance) {
    // 屏幕震动（强度与重要性挂钩）
    // 暂停帧（Hitstop，2-5 帧）
    // 慢动作（重要目标）
    // 画面闪白
    // 击杀特效粒子
    // 连杀计数 UI 动画
  }

  // 受伤反馈包
  onPlayerHit(game) {
    // 画面边缘泛红
    // 色差闪烁
    // 控制器震动（如果支持 Gamepad API）
    // 短暂色饱和度降低
  }
}
```

---

## 阶段 4：音效与沉浸感 🎵

> **核心目标**：从合成器音效升级到分层 3D 空间音频。

### 4.1 音频系统重构

**改造文件**：`src/core/AudioManager.js`

| 现状 | 目标 |
|------|------|
| 纯合成器音效（OscillatorNode） | 合成器 + 预制音频样本混合 |
| 无空间定位 | 3D 空间音频（`PannerNode` / `THREE.PositionalAudio`）|
| 无环境音 | 环境音循环（风声、远处爆炸、城市噪音）|
| 无 BGM | 动态 BGM 系统（战斗/探索/BOSS 战切换）|

### 4.2 音效分层

| 事件 | 音效层次 |
|------|----------|
| **爆炸** | 层 1：核心爆炸声 + 层 2：碎片撞击声 + 层 3：余波回响 + 层 4：低频震动 |
| **飞机引擎** | 持续循环音，pitch 随速度变化 |
| **机枪** | 连射时 pitch 微变 + 弹药命中/未命中不同音效 |
| **BOSS** | 专属 BGM + 阶段变化时音乐转调 |

### 4.3 音频资源策略

- **优先使用合成器**生成基础音效（零资源依赖）
- 逐步替换为**高质量音频样本**（.ogg 格式，体积小）
- 环境音使用程序化生成（白噪声 + 滤波器模拟风声）

---

## 阶段 5：UI 与最终打磨 🖥️

> **核心目标**：精美的 UI 和流畅的动效带来完整的游戏感。

### 5.1 HUD 重构

**改造文件**：`src/ui/components/HUD.js`

| 元素 | 升级内容 |
|------|----------|
| **血量** | 数字 → 带动画的血条 + 受伤时红色闪烁 + 低血量脉搏效果 |
| **武器** | 图标 + 弹药计数 + 切换动画 |
| **分数** | 实时飘字 +100、+200（连杀时字号递增） |
| **迷你地图** | 右上角 mini-map，标记目标位置和威胁 |
| **BOSS 血条** | 屏幕顶部专用血条 + 阶段指示器 |
| **连杀条** | COMBO 计数 + 火焰效果 + 时间衰减 |
| **方向指示器** | 受伤时屏幕边缘显示伤害来源方向 |

### 5.2 菜单动效

**改造文件**：`src/ui/screens/*.js`

| 屏幕 | 动效 |
|------|------|
| **主菜单** | 背景 3D 场景（飞机盘旋 + 粒子特效）+ 按钮悬停动画 |
| **关卡选择** | 地图式布局 + 路径连线 + 解锁动画 |
| **结算屏** | 分数滚动动画 + 星级评定 + 统计数据动画 |
| **过场** | 对话框逐字显示 + 人物立绘（可选）|

### 5.3 加载系统

**新增文件**：`src/ui/screens/LoadingScreen.js`

- 关卡资源加载进度条
- 加载画面 Tips
- 最低显示时间（避免闪烁）

### 5.4 通知与反馈 UI

**新增文件**：`src/ui/components/NotificationQueue.js`

- 成就解锁弹窗（从底部滑入 + 自动消失）
- 道具拾取提示（图标 + 名称 + 持续时间）
- 关卡目标提示（任务更新时显示）

---

## 技术考量

### 性能预算

| 指标 | 目标 |
|------|------|
| **帧率** | 60 FPS（中高端设备） |
| **Draw Calls** | < 200（使用 InstancedMesh 合批）|
| **粒子数** | < 5000 同屏 |
| **纹理内存** | < 128 MB |
| **模型面数** | 单个 GLTF < 10K 面 |

### 性能优化策略

1. **InstancedMesh** — 大量相同装饰物（树木、岩石）合批渲染
2. **LOD 系统** — 远处模型使用简化版
3. **对象池** — 粒子、子弹、碎片等复用对象
4. **视锥裁剪** — 不渲染相机外的实体
5. **延迟后处理** — 某些 Pass 可按需开关（如 SSAO 在低端设备关闭）

### 兼容性

- Three.js r183+（当前版本）
- 目标浏览器：Chrome/Edge/Safari 最新版
- WebGL 2.0 必需（PBR + 后处理依赖）
- 降级方案：检测 WebGL 能力，低端设备自动降低画质

---

## 各阶段依赖关系

```
阶段 1（渲染与光影）
   ↓ 材质系统
阶段 2（模型与场景）→ 依赖阶段 1 的新材质系统
   ↓ GLTF 加载
阶段 3（特效与反馈）→ 可与阶段 2 并行，需要阶段 1 的后处理管线
   ↓
阶段 4（音效系统）→ 独立，可在任何阶段后实施
   ↓
阶段 5（UI 与打磨）→ 依赖前面所有阶段的功能
```

---

## 文件变更清单

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/shaders/MaterialFactory.js` | 风格化 PBR 材质工厂 |
| `src/core/SkySystem.js` | 程序化天空、云层、环境贴图 |
| `src/core/AssetManager.js` | GLTF 模型加载与缓存 |
| `src/systems/GPUParticleSystem.js` | GPU 加速粒子系统 |
| `src/systems/TrailSystem.js` | 尾迹渲染系统 |
| `src/systems/JuiceSystem.js` | 统一打击感反馈管理 |
| `src/systems/DecalSystem.js` | 地面贴花系统（焦痕等） |
| `src/ui/screens/LoadingScreen.js` | 加载画面 |
| `src/ui/components/NotificationQueue.js` | 通知弹窗 |
| `src/ui/components/MiniMap.js` | 迷你地图组件 |
| `src/ui/components/DamageIndicator.js` | 受伤方向指示器 |
| `public/models/` | GLTF 模型资源目录 |
| `public/textures/` | 纹理/精灵资源目录 |
| `public/audio/` | 音频资源目录 |

### 改造文件

| 文件 | 改动范围 |
|------|----------|
| `src/shaders/ToonShader.js` | 重构为材质工厂（或保留兼容旧代码） |
| `src/core/SceneManager.js` | 集成天空系统、改进光照 |
| `src/core/PostProcessing.js` | 新增 SSAO/DOF/ColorGrading/运动模糊 |
| `src/core/AudioManager.js` | 3D 空间音频、分层音效 |
| `src/core/Game.js` | 集成新系统（AssetManager、JuiceSystem 等） |
| `src/entities/Player.js` | 加载 GLTF 模型、尾迹、增强动画 |
| `src/entities/Boss.js` | 加载 GLTF 模型、增强阶段效果 |
| `src/entities/Building.js` | 多模板、增强碎片 |
| `src/entities/Explosion.js` | 多阶段爆炸 + GPU 粒子 |
| `src/entities/AntiAir.js` | 加载 GLTF 模型 |
| `src/entities/Missile.js` | 烟尾 + 尾迹 |
| `src/entities/Bomb.js` | 气流尾迹 |
| `src/levels/Terrain.js` | InstancedMesh 植被、地形纹理 |
| `src/levels/LevelManager.js` | 集成资源预加载 |
| `src/systems/ParticleSystem.js` | 替换为 GPU 粒子系统 |
| `src/ui/components/HUD.js` | 完全重构 |
| `src/ui/screens/*.js` | 动画增强 |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| PBR 材质过于写实失去风格 | 控制 metalness/roughness 参数范围，保持半卡通感 |
| GLTF 模型资源找不到合适的 | 准备程序化增强作为后备方案 |
| 粒子过多导致性能下降 | GPU 粒子 + 粒子数上限 + LOD |
| 后处理 Pass 过重 | 可配置质量等级，低端设备自动降级 |
| 音频资源体积过大 | 优先合成器，逐步替换，音频压缩 |
