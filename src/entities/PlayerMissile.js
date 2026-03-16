// ============================
// 玩家空对地导弹 — 半自动追踪地面目标
// ============================
import * as THREE from 'three';
import { createMaterial } from '../shaders/MaterialFactory.js';
import { WEAPON_CONFIG, COLORS } from '../utils/constants.js';

export class PlayerMissile {
  constructor(game, position) {
    const config = WEAPON_CONFIG.missile;

    this.speed = config.speed;
    this.turnRate = config.turnRate;
    this.damage = config.damage;
    this.blastRadius = config.blastRadius;
    this.lifetime = 0;
    this.maxLifetime = 5;
    this.isActive = true;
    this.type = 'player_missile';

    // 创建导弹模型
    this.mesh = new THREE.Group();

    // 弹体
    const bodyGeo = new THREE.ConeGeometry(0.12, 0.8, 6);
    const bodyMat = createMaterial('metal', COLORS.playerMissile);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    this.mesh.add(body);

    // 尾翼
    const finGeo = new THREE.BoxGeometry(0.4, 0.04, 0.15);
    const finMat = createMaterial('metal', 0x636e72);
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.z = 0.3;
    this.mesh.add(fin);

    // 尾焰
    const flameGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x74b9ff });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.rotation.x = -Math.PI / 2;
    this.flame.position.z = 0.45;
    this.mesh.add(this.flame);

    this.mesh.position.copy(position);
    this.mesh.position.y -= 0.5;
    game.sceneManager.scene.add(this.mesh);

    // 烟迹粒子
    this.trailParticles = [];

    // 初始方向（向前下方）
    this.direction = new THREE.Vector3(0, -0.4, -1).normalize();

    // 寻找最近的地面目标
    this.target = this.findNearestTarget(game);
  }

  // 寻找最近地面目标
  findNearestTarget(game) {
    let nearest = null;
    let minDist = Infinity;
    const myPos = this.mesh.position;

    // 从战斗系统中寻找目标
    if (game.combatSystem) {
      // 搜索建筑
      for (const b of game.combatSystem.buildings) {
        if (b.isDestroyed) continue;
        const dist = myPos.distanceTo(b.mesh.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = b;
        }
      }
      // 搜索防空炮
      for (const aa of game.combatSystem.antiAirs) {
        if (aa.isDestroyed) continue;
        const dist = myPos.distanceTo(aa.mesh.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = aa;
        }
      }
      // 搜索 SAM 阵地
      for (const sam of (game.combatSystem.samSites || [])) {
        if (sam.isDestroyed) continue;
        const dist = myPos.distanceTo(sam.mesh.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = sam;
        }
      }
      // 搜索雷达站
      for (const radar of (game.combatSystem.radars || [])) {
        if (radar.isDestroyed) continue;
        const dist = myPos.distanceTo(radar.mesh.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = radar;
        }
      }
    }

    return nearest;
  }

  update(game, deltaTime) {
    if (!this.isActive) return;

    this.lifetime += deltaTime;

    // 弱追踪目标
    if (this.target && !this.target.isDestroyed) {
      const toTarget = new THREE.Vector3()
        .subVectors(this.target.mesh.position, this.mesh.position)
        .normalize();
      this.direction.lerp(toTarget, this.turnRate * deltaTime);
      this.direction.normalize();
    } else {
      // 没有目标，继续向前下方飞行
      const downward = new THREE.Vector3(0, -0.3, 0);
      this.direction.add(downward.multiplyScalar(deltaTime));
      this.direction.normalize();
    }

    // 移动
    this.mesh.position.addScaledVector(this.direction, this.speed * deltaTime);

    // 朝向
    const lookTarget = this.mesh.position.clone().add(this.direction);
    this.mesh.lookAt(lookTarget);

    // 尾焰闪烁
    this.flame.material.color.setHex(
      Math.random() > 0.5 ? 0x74b9ff : 0x00cec9
    );
    this.flame.scale.y = 0.8 + Math.random() * 0.4;

    // 烟迹
    if (Math.floor(this.lifetime * 15) % 2 === 0) {
      this.addTrailParticle(game);
    }

    // 更新烟迹
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= deltaTime;
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.addScalar(deltaTime * 0.3);
      if (p.life <= 0) {
        game.sceneManager.scene.remove(p.mesh);
        this.trailParticles.splice(i, 1);
      }
    }

    // 碰撞检测 — 与所有地面目标
    if (game.combatSystem) {
      // 检测建筑
      for (const b of game.combatSystem.buildings) {
        if (b.isDestroyed) continue;
        const dist = this.mesh.position.distanceTo(b.mesh.position);
        if (dist < b.width + 0.5) {
          b.takeDamage(game, this.damage);
          this.detonate(game);
          return;
        }
      }
      // 检测防空炮
      for (const aa of game.combatSystem.antiAirs) {
        if (aa.isDestroyed) continue;
        const dist = this.mesh.position.distanceTo(aa.mesh.position);
        if (dist < 1.5) {
          aa.takeDamage(game, this.damage);
          this.detonate(game);
          return;
        }
      }
      // 检测 SAM
      for (const sam of (game.combatSystem.samSites || [])) {
        if (sam.isDestroyed) continue;
        const dist = this.mesh.position.distanceTo(sam.mesh.position);
        if (dist < 2) {
          sam.takeDamage(game, this.damage);
          this.detonate(game);
          return;
        }
      }
      // 检测雷达
      for (const radar of (game.combatSystem.radars || [])) {
        if (radar.isDestroyed) continue;
        const dist = this.mesh.position.distanceTo(radar.mesh.position);
        if (dist < 2) {
          radar.takeDamage(game, this.damage);
          this.detonate(game);
          return;
        }
      }
      // 检测战斗机
      for (const f of (game.combatSystem.fighters || [])) {
        if (!f.isAlive) continue;
        const dist = this.mesh.position.distanceTo(f.mesh.position);
        if (dist < 2) {
          f.takeDamage(game, this.damage);
          this.detonate(game);
          return;
        }
      }
    }

    // 撞地面
    if (this.mesh.position.y < 0.5) {
      this.detonate(game);
      return;
    }

    // 超时
    if (this.lifetime > this.maxLifetime) {
      this.detonate(game);
    }
  }

  addTrailParticle(game) {
    const geo = new THREE.SphereGeometry(0.06, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x81ecec,
      transparent: true,
      opacity: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.mesh.position);
    game.sceneManager.scene.add(mesh);
    this.trailParticles.push({ mesh, life: 0.6, maxLife: 0.6 });
  }

  detonate(game) {
    if (!this.isActive) return;
    this.isActive = false;

    // 爆炸
    import('./Explosion.js').then(({ Explosion }) => {
      const expl = new Explosion(game, this.mesh.position.clone(), this.blastRadius, false);
      game.addEntity(expl);
    });

    game.audioManager.play('explosion');
    game.removeEntity(this);
  }

  destroy(game) {
    game.sceneManager.scene.remove(this.mesh);
    for (const p of this.trailParticles) {
      game.sceneManager.scene.remove(p.mesh);
    }
    this.trailParticles = [];
  }
}
