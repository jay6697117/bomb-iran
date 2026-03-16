// ============================
// 工具函数
// ============================

// 角度转弧度
export function degToRad(deg) {
  return deg * Math.PI / 180;
}

// 弧度转角度
export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

// 随机范围（不包含 max）
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// 随机整数（包含 min 和 max）
export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

// 限制范围
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 线性插值
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 距离计算（2D, XZ 平面）
export function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// 格式化数字（千位分隔符）
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 延迟函数（返回 Promise）
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 从数组中随机选择一个元素
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
