// ============================
// 输入管理器 - 键盘和鼠标输入
// ============================

export class InputManager {
  constructor() {
    this.keys = {};
    this.keyJustPressed = {};
    this.mousePosition = { x: 0, y: 0 };

    // 键盘按下
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.keyJustPressed[e.code] = true;
      }
      this.keys[e.code] = true;

      // 阻止空格和方向键的默认行为（防止页面滚动）
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    // 键盘抬起
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 鼠标移动
    window.addEventListener('mousemove', (e) => {
      this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // 失去焦点时清除所有按键状态
    window.addEventListener('blur', () => {
      this.keys = {};
      this.keyJustPressed = {};
    });
  }

  // 按键是否按下
  isKeyDown(code) {
    return !!this.keys[code];
  }

  // 按键是否刚按下（单次触发）
  isKeyJustPressed(code) {
    return !!this.keyJustPressed[code];
  }

  // 获取移动方向向量（WASD / 方向键）
  getMovement() {
    let x = 0, z = 0;
    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp'))    z -= 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown'))  z += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft'))  x -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;

    // 归一化（对角线移动不应更快）
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) { x /= len; z /= len; }

    return { x, z };
  }

  // 每帧结束时调用，清除单次按键状态
  update() {
    this.keyJustPressed = {};
  }
}
