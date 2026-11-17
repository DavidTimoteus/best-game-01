import { ARENA_BOUNDS, ENEMY_ARCHETYPES, PILLAR_LAYOUT } from './constants.js';

export function clampToArena(entity, radius = entity.radius) {
  entity.x = Math.max(ARENA_BOUNDS.left + radius, Math.min(ARENA_BOUNDS.right - radius, entity.x));
  entity.y = Math.max(ARENA_BOUNDS.top + radius, Math.min(ARENA_BOUNDS.bottom - radius, entity.y));
}

export function resolveCircleObstacle(entity, obstacle) {
  const dx = entity.x - obstacle.x;
  const dy = entity.y - obstacle.y;
  const minDist = entity.radius + obstacle.radius;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < minDist) {
    const push = minDist - dist;
    entity.x += (dx / dist) * push;
    entity.y += (dy / dist) * push;
  } else if (dist === 0) {
    entity.x += minDist;
  }
}

export class ArenaPillar {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.brazierHeat = 0.65;
    this.flashTimer = 0;
  }

  ignite() {
    this.brazierHeat = 1.4;
    this.flashTimer = 0.35;
  }

  update(dt) {
    if (this.brazierHeat > 0.65) {
      this.brazierHeat = Math.max(0.65, this.brazierHeat - dt * 0.8);
    }
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }
  }
}

export function createArenaPillars() {
  return PILLAR_LAYOUT.map((p) => new ArenaPillar(p.x, p.y, p.radius));
}

export class PlayerWarden {
  constructor(difficulty = 'standard') {
    this.x = ARENA_BOUNDS.centerX;
    this.y = ARENA_BOUNDS.centerY + 60;
    this.vx = 0;
    this.vy = 0;
    this.radius = 18;
    this.aimAngle = -Math.PI / 2;
    this.stridePhase = 0;

    this.maxHp = difficulty === 'ascended' ? 4 : 5;
    this.hp = this.maxHp;
    this.invulnTimer = 0;
    this.hurtFlash = 0;

    // Base stats modified by Clockwork Relics
    this.baseSpeed = 248;
    this.fireRate = 4.6;
    this.fireCooldown = 0;
    this.shotCounter = 0;
    this.damageMult = 1;
    this.boltSpeedMult = 1;
    this.extraBolts = 0;
    this.wallBounces = 0;
    this.chainLightning = 0;
    this.ignisEveryThird = false;
    this.mirroredParry = false;
    this.carapaceShockwave = false;
    this.vampiricKills = false;
    this.scoreMult = difficulty === 'ascended' ? 1.4 : 1.0;

    // Parry-Dash
    this.dashCooldownMax = 1.35;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashDirX = 0;
    this.dashDirY = -1;
    this.afterimages = [];

    // Sunburst Nova
    this.novaCooldownMax = 4.5;
    this.novaCooldown = 0;
    this.lanceSwingTimer = 0;
  }

  getMoveSpeed() {
    return this.baseSpeed;
  }

  isParrying() {
    return this.dashTimer > 0;
  }

  tryDash(moveVec) {
    if (this.dashCooldown > 0 || this.dashTimer > 0) return false;
    let dx = moveVec.x;
    let dy = moveVec.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aimAngle);
      dy = Math.sin(this.aimAngle);
    }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.dashTimer = 0.21;
    this.dashCooldown = this.dashCooldownMax;
    this.invulnTimer = Math.max(this.invulnTimer, 0.26);
    return true;
  }

  tryNova() {
    if (this.novaCooldown > 0) return false;
    this.novaCooldown = this.novaCooldownMax;
    this.lanceSwingTimer = 0.25;
    return true;
  }

  update(dt, moveVec, pillars) {
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.novaCooldown > 0) this.novaCooldown = Math.max(0, this.novaCooldown - dt);
    if (this.lanceSwingTimer > 0) this.lanceSwingTimer = Math.max(0, this.lanceSwingTimer - dt);

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      const dashSpeed = 700;
      this.vx = this.dashDirX * dashSpeed;
      this.vy = this.dashDirY * dashSpeed;
      this.afterimages.push({ x: this.x, y: this.y, alpha: 0.72, angle: this.aimAngle });
    } else {
      const targetVx = moveVec.x * this.getMoveSpeed();
      const targetVy = moveVec.y * this.getMoveSpeed();
      const accel = Math.min(1, dt * 16);
      this.vx += (targetVx - this.vx) * accel;
      this.vy += (targetVy - this.vy) * accel;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const speedNow = Math.hypot(this.vx, this.vy);
    if (speedNow > 25) {
      this.stridePhase += dt * (speedNow * 0.055);
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= dt * 3.4;
      if (this.afterimages[i].alpha <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    for (const pillar of pillars) {
      resolveCircleObstacle(this, pillar);
    }
    clampToArena(this);
  }
}

export class EnemyUnit {
  constructor(type, x, y, hpScale = 1, speedScale = 1) {
    const def = ENEMY_ARCHETYPES[type];
    this.type = type;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = def.radius;
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.speed = def.speed * speedScale;
    this.scoreValue = def.score;
    this.amberValue = def.amber;

    this.facing = 0;
    this.animTimer = Math.random() * 6;
    this.hitFlash = 0;
    this.state = 'pursue';
    this.stateTimer = 0.7 + Math.random() * 0.9;
    this.attackCooldown = 1.2 + Math.random() * 1.1;
    this.chargeAngle = 0;
    this.phase = 1;
    this.bossPattern = 0;
    this.orbitAngle = 0;
  }

  update(dt, player, pillars, callbacks) {
    this.animTimer += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const angleToPlayer = Math.atan2(dy, dx);
    this.facing = angleToPlayer;

    if (this.type === 'scarab') {
      const weave = Math.sin(this.animTimer * 5.2) * 0.45;
      const moveAng = angleToPlayer + weave;
      this.vx = Math.cos(moveAng) * this.speed;
      this.vy = Math.sin(moveAng) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else if (this.type === 'sentinel') {
      if (this.state === 'pursue') {
        const desired = dist > 320 ? 1 : dist < 190 ? -0.7 : 0;
        const strafe = Math.sin(this.animTimer * 1.6) * 0.55;
        this.vx = (Math.cos(angleToPlayer) * desired - Math.sin(angleToPlayer) * strafe) * this.speed;
        this.vy = (Math.sin(angleToPlayer) * desired + Math.cos(angleToPlayer) * strafe) * this.speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) {
          this.state = 'windup';
          this.stateTimer = 0.65;
          this.chargeAngle = angleToPlayer;
        }
      } else if (this.state === 'windup') {
        this.chargeAngle = angleToPlayer;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          callbacks.fireEnemyBolt(this.x, this.y, this.chargeAngle, 340, 1, '#ff5959', 8);
          this.state = 'pursue';
          this.attackCooldown = 1.9;
        }
      }
    } else if (this.type === 'knight') {
      if (this.state === 'pursue') {
        this.vx = Math.cos(angleToPlayer) * this.speed;
        this.vy = Math.sin(angleToPlayer) * this.speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0 && dist < 340) {
          this.state = 'windup';
          this.stateTimer = 0.62;
          this.chargeAngle = angleToPlayer;
        }
      } else if (this.state === 'windup') {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'charge';
          this.stateTimer = 0.36;
        }
      } else if (this.state === 'charge') {
        const lungeSpeed = 480;
        this.x += Math.cos(this.chargeAngle) * lungeSpeed * dt;
        this.y += Math.sin(this.chargeAngle) * lungeSpeed * dt;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'recover';
          this.stateTimer = 0.55;
          // Emit twin side sparks at end of lunge
          callbacks.fireEnemyBolt(this.x, this.y, this.chargeAngle + 0.35, 250, 1, '#f59f3d', 7);
          callbacks.fireEnemyBolt(this.x, this.y, this.chargeAngle - 0.35, 250, 1, '#f59f3d', 7);
        }
      } else if (this.state === 'recover') {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'pursue';
          this.attackCooldown = 1.7;
        }
      }
    } else if (this.type === 'alchemist') {
      const desired = dist > 360 ? 1 : dist < 240 ? -0.8 : 0;
      const strafe = Math.cos(this.animTimer * 1.4) * 0.65;
      this.x += (Math.cos(angleToPlayer) * desired - Math.sin(angleToPlayer) * strafe) * this.speed * dt;
      this.y += (Math.sin(angleToPlayer) * desired + Math.cos(angleToPlayer) * strafe) * this.speed * dt;
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        callbacks.spawnHazardFlask(this.x, this.y, player.x, player.y);
        this.attackCooldown = 2.6;
      }
    } else if (this.type === 'boss') {
      this.updateBoss(dt, player, angleToPlayer, callbacks);
    }

    for (const pillar of pillars) {
      resolveCircleObstacle(this, pillar);
    }
    clampToArena(this);
  }

  updateBoss(dt, player, angleToPlayer, callbacks) {
    this.orbitAngle += dt * 1.8;
    const hpRatio = this.hp / this.maxHp;
    this.phase = hpRatio < 0.5 ? 2 : 1;
    const rageMult = this.phase === 2 ? 1.32 : 1.0;

    if (this.state === 'pursue') {
      const targetX = ARENA_BOUNDS.centerX + Math.cos(this.animTimer * 0.55) * 180;
      const targetY = ARENA_BOUNDS.centerY + Math.sin(this.animTimer * 0.72) * 110;
      const toX = targetX - this.x;
      const toY = targetY - this.y;
      const toDist = Math.hypot(toX, toY) || 1;
      if (toDist > 12) {
        this.x += (toX / toDist) * this.speed * rageMult * dt;
        this.y += (toY / toDist) * this.speed * rageMult * dt;
      }

      this.attackCooldown -= dt * rageMult;
      if (this.attackCooldown <= 0) {
        this.bossPattern = (this.bossPattern + 1) % 3;
        this.state = 'windup';
        this.chargeAngle = angleToPlayer;
        this.stateTimer = this.bossPattern === 1 ? 0.8 : 0.65;
      }
    } else if (this.state === 'windup') {
      if (this.bossPattern === 0) {
        this.chargeAngle = angleToPlayer;
      }
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.bossPattern === 0) {
          // Aimed Eclipse Fan Volley
          const count = this.phase === 2 ? 7 : 5;
          const spread = 0.22;
          for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * spread;
            callbacks.fireEnemyBolt(this.x, this.y, this.chargeAngle + offset, 310, 1, '#ff4d4d', 9);
          }
        } else if (this.bossPattern === 1) {
          // 12-Way Clockwork Gear Barrage
          const spokes = this.phase === 2 ? 14 : 10;
          for (let i = 0; i < spokes; i++) {
            const ang = this.orbitAngle + (i / spokes) * Math.PI * 2;
            callbacks.fireEnemyBolt(this.x, this.y, ang, 240, 1, '#ff9a3c', 8);
          }
        } else {
          // Dual Alchemical Bomb Toss + Aimed Lance
          callbacks.spawnHazardFlask(this.x, this.y, player.x + 65, player.y - 45);
          callbacks.spawnHazardFlask(this.x, this.y, player.x - 65, player.y + 45);
          callbacks.fireEnemyBolt(this.x, this.y, angleToPlayer, 360, 1, '#ff4d4d', 10);
        }
        this.state = 'pursue';
        this.attackCooldown = this.phase === 2 ? 1.25 : 1.65;
      }
    }
  }
}

export class AmberPickup {
  constructor(x, y, value = 2, heals = false) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.heals = heals;
    this.radius = heals ? 11 : 8;
    this.age = 0;
  }
}
