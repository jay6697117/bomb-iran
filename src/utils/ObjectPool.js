// ============================
// 对象池 - 减少 GC 压力
// ============================

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];

    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  // 获取一个对象（从池中取或新建）
  get() {
    const obj = this.pool.length > 0 ? this.pool.pop() : this.createFn();
    this.active.push(obj);
    return obj;
  }

  // 回收一个对象
  release(obj) {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  // 回收所有激活的对象
  releaseAll() {
    while (this.active.length > 0) {
      this.release(this.active[0]);
    }
  }

  // 获取当前激活数量
  get activeCount() {
    return this.active.length;
  }
}
