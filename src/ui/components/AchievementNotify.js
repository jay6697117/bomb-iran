// ============================
// 成就解锁弹窗通知（toast）
// ============================

export class AchievementNotify {
  constructor() {
    // 创建通知容器
    this.container = document.createElement('div');
    this.container.className = 'achievement-notify-container';
    document.getElementById('ui-container').appendChild(this.container);
    this.queue = [];
    this.isShowing = false;
  }

  // 显示成就通知
  show(achievement) {
    this.queue.push(achievement);
    if (!this.isShowing) {
      this.processQueue();
    }
  }

  processQueue() {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const ach = this.queue.shift();

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-icon">${ach.icon || '🏆'}</div>
      <div class="achievement-toast-content">
        <div class="achievement-toast-title">🎉 成就解锁！</div>
        <div class="achievement-toast-name">${ach.name}</div>
        <div class="achievement-toast-desc">${ach.desc}</div>
      </div>
      <div class="achievement-toast-reward">+${ach.reward || 100} 💰</div>
    `;
    this.container.appendChild(toast);

    // 入场动画
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 3 秒后消失
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
        this.processQueue();
      }, 500);
    }, 3000);
  }
}
