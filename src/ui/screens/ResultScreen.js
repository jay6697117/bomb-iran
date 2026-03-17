// ============================
// 关卡结算 UI — 含烟花/失败特效
// ============================

export class ResultScreen {
  constructor(game, uiManager, callbacks) {
    this.game = game;
    this.callbacks = callbacks;
    this.animFrameId = null;

    this.el = document.createElement('div');
    this.el.className = 'result-screen screen-hidden fade-in';
    document.getElementById('ui-container').appendChild(this.el);
  }

  show(result) {
    // 停止上一次特效
    this.stopFx();

    const isFail = result.grade === 'F';
    const gradeClass = `grade-${result.grade}`;
    const gradeExtra = result.grade === 'S' || result.grade === 'A' ? 'grade-shine' : (isFail ? 'grade-shake' : '');
    const titleText = isFail ? '💀 任务失败' : '🎉 任务完成！';
    const titleClass = isFail ? 'result-title-fail' : 'result-title-success';

    this.el.innerHTML = `
      <canvas class="result-fx-canvas" id="result-fx-canvas"></canvas>
      <div class="result-panel game-panel result-panel-animate">
        <div class="result-grade ${gradeClass} ${gradeExtra}">${result.grade}</div>
        <h3 class="${titleClass}">${titleText}</h3>
        <div class="result-stats">
          <div class="stat-row"><span>摧毁率</span><span>${result.destroyRate}%</span></div>
          <div class="stat-row"><span>用时</span><span>${result.timeUsed}s</span></div>
          <div class="stat-row"><span>存活</span><span>${result.survived ? '✅ 是' : '❌ 否'}</span></div>
          <div class="stat-row"><span>综合评分</span><span>${result.score}</span></div>
        </div>
        <div class="result-coins">+${result.coins} 💰</div>
        <div class="result-buttons">
          <button class="game-btn secondary" id="btn-result-retry">🔄 重试</button>
          ${!isFail ? '<button class="game-btn" id="btn-result-next">➡️ 下一关</button>' : ''}
          <button class="game-btn secondary" id="btn-result-menu">🏠 菜单</button>
        </div>
      </div>
    `;

    // 绑定按钮事件
    this.el.querySelector('#btn-result-retry')?.addEventListener('click', () => {
      this.stopFx();
      this.game.audioManager.play('click');
      if (this.callbacks.onRestart) this.callbacks.onRestart();
    });

    this.el.querySelector('#btn-result-next')?.addEventListener('click', () => {
      this.stopFx();
      this.game.audioManager.play('click');
      if (this.callbacks.onNext) this.callbacks.onNext();
    });

    this.el.querySelector('#btn-result-menu')?.addEventListener('click', () => {
      this.stopFx();
      this.game.audioManager.play('click');
      if (this.callbacks.onQuit) this.callbacks.onQuit();
    });

    // 启动 Canvas 特效
    const canvas = this.el.querySelector('#result-fx-canvas');
    if (canvas) {
      if (isFail) {
        this.startFailFx(canvas);
      } else {
        this.startFireworksFx(canvas);
      }
    }
  }

  // ===== 烟花特效 =====
  startFireworksFx(canvas) {
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    this._fxResize = resize;

    const fireworks = [];
    const sparks = [];

    // 烟花颜色集
    const colors = [
      '#ff6b35', '#feca57', '#2ecc71', '#3498db',
      '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4'
    ];

    // 创建一发烟花
    const createFirework = () => {
      fireworks.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        targetY: canvas.height * (0.15 + Math.random() * 0.35),
        speed: 4 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        trail: []
      });
    };

    // 烟花爆炸
    const explode = (fw) => {
      const count = 40 + Math.floor(Math.random() * 30);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 4;
        sparks.push({
          x: fw.x, y: fw.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: fw.color,
          life: 1,
          decay: 0.012 + Math.random() * 0.015,
          size: 1.5 + Math.random() * 2
        });
      }
    };

    let spawnTimer = 0;

    const animate = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      // 定期生成新烟花
      spawnTimer++;
      if (spawnTimer % 25 === 0 || spawnTimer === 1) {
        createFirework();
        if (Math.random() > 0.4) createFirework();
      }

      // 更新烟花弹
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        fw.trail.push({ x: fw.x, y: fw.y });
        if (fw.trail.length > 8) fw.trail.shift();

        fw.y -= fw.speed;

        // 画上升尾迹
        for (let t = 0; t < fw.trail.length; t++) {
          ctx.beginPath();
          ctx.arc(fw.trail[t].x, fw.trail[t].y, 2 * (t / fw.trail.length), 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.globalAlpha = t / fw.trail.length * 0.5;
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (fw.y <= fw.targetY) {
          explode(fw);
          fireworks.splice(i, 1);
        }
      }

      // 更新火花
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.04; // 重力
        s.vx *= 0.99;
        s.life -= s.decay;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.fill();

        // 尾迹光斑
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life * 0.15;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      this.animFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // ===== 失败特效 =====
  startFailFx(canvas) {
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    this._fxResize = resize;

    const particles = [];
    const embers = [];
    let time = 0;

    // 创建碎片
    const createDebris = () => {
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 2,
          vy: 1 + Math.random() * 3,
          size: 2 + Math.random() * 4,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          color: Math.random() > 0.5 ? '#e74c3c' : '#c0392b',
          life: 1
        });
      }
    };

    // 创建灰烬/火星
    const createEmber = () => {
      embers.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(0.5 + Math.random() * 2),
        size: 1 + Math.random() * 2,
        life: 1,
        decay: 0.005 + Math.random() * 0.01,
        color: Math.random() > 0.6 ? '#ff6b35' : '#e74c3c'
      });
    };

    const animate = () => {
      time++;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 红色脉冲边框
      const pulse = Math.sin(time * 0.05) * 0.5 + 0.5;
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.8
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(231, 76, 60, ${0.08 + pulse * 0.06})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 定期创建碎片
      if (time % 8 === 0) createDebris();
      if (time % 3 === 0) createEmber();

      // 更新碎片
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rotation += p.rotSpeed;
        p.life -= 0.003;

        if (p.life <= 0 || p.y > canvas.height + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      // 更新灰烬
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx + Math.sin(time * 0.02 + i) * 0.3;
        e.y += e.vy;
        e.life -= e.decay;

        if (e.life <= 0) {
          embers.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = e.life * 0.8;
        ctx.fill();

        // 光晕
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * e.life * 3, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = e.life * 0.1;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      this.animFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // 停止 Canvas 特效
  stopFx() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this._fxResize) {
      window.removeEventListener('resize', this._fxResize);
      this._fxResize = null;
    }
  }
}
