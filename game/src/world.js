/**
 * Fixed-step simulation world for Grid Prism: Polarity Protocol.
 * Orchestrates waves, 5 enemy archetypes, polarity matching, upgrade drafts,
 * warp-grid deformation impulses, hit-stop, and run telemetry.
 */

import {
  ARENA_HEIGHT,
  ARENA_PADDING,
  ARENA_WIDTH,
  COLORS,
  PLAYER_CONFIG,
  POLARITY,
  POLARITY_META,
  SECTORS,
} from './config.js';
import {
  createBoss,
  createBullet,
  createChaserDrone,
  createLaserGate,
  createPlayer,
  createResonanceOrb,
  createTurretBastion,
  otherPolarity,
  randomPolarity,
  resetEntityIds,
} from './entities.js';
import { EffectsManager } from './particles.js';
import { computePerkStats, getPerkDef, rollDraftChoices } from './perks.js';

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export class GameWorld {
  constructor(sound = null) {
    this.sound = sound;
    this.effects = new EffectsManager();
    this.stars = this._createStars();
    this.gridImpulses = [];
    this.reset('title');
  }

  _createStars() {
    const layers = [];
    for (let i = 0; i < 95; i++) {
      layers.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        z: 0.25 + Math.random() * 0.85,
        size: 0.8 + Math.random() * 1.8,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    return layers;
  }

  reset(initialState = 'playing') {
    resetEntityIds();
    this.effects.clear();
    this.gridImpulses.length = 0;
    this.state = initialState; // 'title' | 'playing' | 'draft' | 'victory' | 'gameover'
    this.time = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.sectorIndex = 0;
    this.sectorTime = 0;
    this.sectorKills = 0;
    this.spawnTimer = 0.6;
    this.bannerTimer = 2.2;

    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.orbsAbsorbed = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;

    this.installedPerks = [];
    this.perkStats = computePerkStats([]);
    this.draftChoices = [];

    this.player = createPlayer();
    this.bullets = [];
    this.orbs = [];
    this.enemies = [];
    this.gates = [];
    this.boss = null;

    if (initialState === 'title') {
      this._seedTitleBackdrop();
    } else {
      this._seedSectorStart();
    }
  }

  _seedTitleBackdrop() {
    this.player.x = ARENA_WIDTH * 0.12;
    this.player.y = ARENA_HEIGHT * 0.58;
    this.player.angle = -0.32;
    this.orbs.push(
      createResonanceOrb(ARENA_WIDTH * 0.14, ARENA_HEIGHT * 0.25, POLARITY.CYAN),
      createResonanceOrb(ARENA_WIDTH * 0.87, ARENA_HEIGHT * 0.20, POLARITY.AMBER),
      createResonanceOrb(ARENA_WIDTH * 0.86, ARENA_HEIGHT * 0.82, POLARITY.CYAN)
    );
    this.gates.push(createLaserGate(ARENA_WIDTH * 0.88, ARENA_HEIGHT * 0.50, POLARITY.AMBER, 200));
    this.gates[0].warmUp = 0;
    this.enemies.push(
      createChaserDrone(ARENA_WIDTH * 0.17, ARENA_HEIGHT * 0.78, 2, POLARITY.CYAN),
      createTurretBastion(ARENA_WIDTH * 0.90, ARENA_HEIGHT * 0.72, 2, POLARITY.AMBER)
    );
  }

  _seedSectorStart() {
    this.bannerTimer = 2.2;
    this.spawnTimer = 0.7;
    const sector = this.currentSector;
    if (sector.boss) {
      this.boss = createBoss(sector);
      this.sound?.playBossAlert();
      this.addGridImpulse(this.boss.x, this.boss.y, 1.4, 240);
    }
    for (let i = 0; i < 3; i++) {
      this._spawnOrbAwayFromPlayer();
    }
  }

  get currentSector() {
    return SECTORS[Math.min(this.sectorIndex, SECTORS.length - 1)];
  }

  get accuracyPct() {
    if (this.shotsFired <= 0) return 100;
    return Math.min(100, Math.round((this.shotsHit / this.shotsFired) * 100));
  }

  addGridImpulse(x, y, strength = 1.0, radius = 170) {
    this.gridImpulses.push({ x, y, strength, radius, life: 0.45, maxLife: 0.45 });
    if (this.gridImpulses.length > 16) this.gridImpulses.shift();
  }

  shiftPolarity(targetPolarity = null) {
    const next = targetPolarity || otherPolarity(this.player.polarity);
    if (next === this.player.polarity) return;
    this.player.polarity = next;
    this.player.shiftFlash = 0.28;
    const meta = POLARITY_META[next];
    this.effects.emitRing(this.player.x, this.player.y, 64, meta.primary, 2.5, 0.28);
    this.sound?.playShift(next);
  }

  triggerDash(moveVec) {
    const p = this.player;
    if (p.dashCooldown > 0 || p.dashTimer > 0) return false;
    let dx = moveVec.x;
    let dy = moveVec.y;
    if (Math.hypot(dx, dy) < 0.1) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashDirX = dx / len;
    p.dashDirY = dy / len;
    p.dashTimer = PLAYER_CONFIG.dashDuration;
    p.dashCooldown = PLAYER_CONFIG.dashCooldown * this.perkStats.dashCooldownMult;
    p.dashTrailTick = 0;
    p.invulnTimer = Math.max(p.invulnTimer, PLAYER_CONFIG.dashDuration + 0.08);

    const meta = POLARITY_META[p.polarity];
    this.effects.emitRing(p.x, p.y, 75, meta.primary, 3, 0.26);
    this.effects.emitBurst(p.x, p.y, meta.primary, 12, 80, 240, 2.8, 0.3);
    this.addGridImpulse(p.x, p.y, 1.1, 160);
    this.sound?.playDash();
    return true;
  }

  triggerNova() {
    const p = this.player;
    if (p.overdrive < 100) return false;
    p.overdrive = 0;
    p.invulnTimer = Math.max(p.invulnTimer, 0.75);
    this.hitStop = 0.055;
    this.shake = Math.max(this.shake, 16);
    const meta = POLARITY_META[p.polarity];

    this.effects.emitRing(p.x, p.y, 520, meta.primary, 7, 0.65);
    this.effects.emitRing(p.x, p.y, 340, COLORS.white, 4, 0.48);
    this.effects.emitBurst(p.x, p.y, meta.primary, 38, 120, 480, 4.2, 0.6);
    this.addGridImpulse(p.x, p.y, 2.2, 340);
    this.sound?.playNova();

    let converted = 0;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.bullets[i].fromPlayer) {
        const b = this.bullets[i];
        this.effects.emitSpark(b.x, b.y, (Math.random() - 0.5) * 90, -80, meta.primary, 3, 0.35);
        this.bullets.splice(i, 1);
        converted++;
      }
    }
    if (converted > 0) {
      this._awardScore(converted * 45, p.x, p.y - 26, `PURGE +${converted * 45}`, meta.primary);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) < 520) {
        this._damageEnemy(e, 145, p.polarity, true);
      }
    }
    if (this.boss) {
      this._damageBoss(220, p.polarity);
    }
    this.effects.emitPopup(p.x, p.y - 44, 'OVERDRIVE NOVA!', meta.primary, 1.35, 1.0);
    return true;
  }

  chooseUpgrade(index) {
    if (this.state !== 'draft') return false;
    const chosen = this.draftChoices[index];
    if (!chosen) return false;
    this.installedPerks.push(chosen.id);
    this.perkStats = computePerkStats(this.installedPerks);

    this.player.maxShield = PLAYER_CONFIG.maxShield + this.perkStats.maxShieldBonus;
    if (chosen.id === 'aegis_cap') {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 35);
    } else {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 15);
    }
    this.sound?.playUpgrade();
    this.effects.emitPopup(this.player.x, this.player.y - 34, `${chosen.name} ONLINE`, chosen.color, 1.2, 1.1);

    this.sectorIndex += 1;
    this.sectorTime = 0;
    this.sectorKills = 0;
    this.bullets = this.bullets.filter((b) => b.fromPlayer);
    this.gates.length = 0;
    this.state = 'playing';
    this._seedSectorStart();
    return true;
  }

  step(dt, inputState) {
    this.time += dt;
    this._updateAmbient(dt);

    if (this.state === 'title') {
      this._stepTitleAttract(dt);
      this.effects.update(dt);
      return;
    }
    if (this.state !== 'playing') {
      this.effects.update(dt);
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.effects.update(dt * 0.25);
      return;
    }

    this.shake = Math.max(0, this.shake - dt * 36);
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.sectorTime += dt;

    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = Math.max(1, this.combo - 1);
        this.comboTimer = this.combo > 1 ? 1.8 : 0;
      }
    }

    this._stepPlayer(dt, inputState);
    this._stepSpawning(dt);
    this._stepBullets(dt);
    this._stepOrbs(dt);
    this._stepGates(dt);
    this._stepEnemies(dt);
    this._stepBoss(dt);
    this.effects.update(dt);
    this._checkSectorProgress();
  }

  _updateAmbient(dt) {
    for (const s of this.stars) {
      s.x -= 24 * s.z * dt;
      if (s.x < -4) {
        s.x = ARENA_WIDTH + 4;
        s.y = Math.random() * ARENA_HEIGHT;
      }
    }
    for (let i = this.gridImpulses.length - 1; i >= 0; i--) {
      this.gridImpulses[i].life -= dt;
      if (this.gridImpulses[i].life <= 0) this.gridImpulses.splice(i, 1);
    }
  }

  _stepTitleAttract(dt) {
    for (const g of this.gates) {
      g.angle += g.angularVel * dt * 0.7;
      g.pulse += dt * 4;
    }
    for (const o of this.orbs) {
      o.pulse += dt * 3.5;
      o.y += Math.sin(this.time * 1.4 + o.id) * 14 * dt;
    }
  }

  _stepPlayer(dt, input) {
    const p = this.player;
    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.shiftFlash = Math.max(0, p.shiftFlash - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.fireCooldown = Math.max(0, p.fireCooldown - dt);

    p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

    if (input.shift) this.shiftPolarity();
    if (input.selectCyan) this.shiftPolarity(POLARITY.CYAN);
    if (input.selectAmber) this.shiftPolarity(POLARITY.AMBER);
    if (input.dash) this.triggerDash(input.move);
    if (input.nova) this.triggerNova();

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashDirX * PLAYER_CONFIG.dashSpeed;
      p.vy = p.dashDirY * PLAYER_CONFIG.dashSpeed;
      p.dashTrailTick -= dt;
      if (p.dashTrailTick <= 0) {
        p.dashTrailTick = 0.032;
        this.effects.emitAfterimage(p.x, p.y, p.angle, POLARITY_META[p.polarity].primary, p.radius);
      }
      if (p.dashTimer <= 0 && this.perkStats.novaDashLevel > 0) {
        this._detonateDashNova();
      }
    } else {
      p.vx += input.move.x * PLAYER_CONFIG.accel * dt;
      p.vy += input.move.y * PLAYER_CONFIG.accel * dt;
      const damp = Math.exp(-PLAYER_CONFIG.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      const spd = Math.hypot(p.vx, p.vy);
      if (spd > PLAYER_CONFIG.maxSpeed) {
        p.vx = (p.vx / spd) * PLAYER_CONFIG.maxSpeed;
        p.vy = (p.vy / spd) * PLAYER_CONFIG.maxSpeed;
      }
    }

    p.x = Math.max(ARENA_PADDING, Math.min(ARENA_WIDTH - ARENA_PADDING, p.x + p.vx * dt));
    p.y = Math.max(ARENA_PADDING + 34, Math.min(ARENA_HEIGHT - ARENA_PADDING - 26, p.y + p.vy * dt));

    if (input.firing && p.fireCooldown <= 0) {
      this._firePlayerBolts();
    }
  }

  _detonateDashNova() {
    const p = this.player;
    const meta = POLARITY_META[p.polarity];
    const radius = 140 + (this.perkStats.novaDashLevel - 1) * 40;
    this.effects.emitRing(p.x, p.y, radius, meta.primary, 4, 0.34);
    this.addGridImpulse(p.x, p.y, 1.3, radius);
    for (const e of this.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) <= radius + e.radius) {
        this._damageEnemy(e, 52 * this.perkStats.novaDashLevel, p.polarity, false);
      }
    }
    if (this.boss && Math.hypot(this.boss.x - p.x, this.boss.y - p.y) <= radius + this.boss.radius) {
      this._damageBoss(45 * this.perkStats.novaDashLevel, p.polarity);
    }
  }

  _firePlayerBolts() {
    const p = this.player;
    p.fireCooldown = PLAYER_CONFIG.fireInterval / this.perkStats.fireRateMult;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const nx = -sin;
    const ny = cos;
    const speed = PLAYER_CONFIG.bulletSpeed;
    const dmg = PLAYER_CONFIG.bulletDamage;
    const pierce = this.perkStats.pierceCount;

    const offsets = this.perkStats.extraProjectiles > 0 ? [-7, 7] : [0];
    for (const off of offsets) {
      this.bullets.push(
        createBullet({
          x: p.x + cos * 18 + nx * off,
          y: p.y + sin * 18 + ny * off,
          vx: cos * speed,
          vy: sin * speed,
          polarity: p.polarity,
          fromPlayer: true,
          damage: dmg,
          radius: 5,
          pierce,
          life: 1.5,
        })
      );
      this.shotsFired++;
    }
    this.sound?.playShot(p.polarity);
  }

  _stepSpawning(dt) {
    const sector = this.currentSector;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = sector.spawnRate * (0.8 + Math.random() * 0.4);

    if (this.orbs.length < 6 && Math.random() < 0.72) {
      this._spawnOrbAwayFromPlayer();
    }
    if (this.enemies.length >= sector.maxEnemies) return;

    const roll = Math.random();
    const w = sector.weights;
    if (roll < w.orb) {
      this._spawnOrbAwayFromPlayer();
    } else if (roll < w.orb + w.chaser) {
      const pt = this._randomEdgePoint();
      this.enemies.push(createChaserDrone(pt.x, pt.y, sector.id, randomPolarity()));
    } else if (roll < w.orb + w.chaser + w.gate) {
      if (this.gates.length < 3) {
        const pt = this._randomInteriorPoint();
        this.gates.push(createLaserGate(pt.x, pt.y, randomPolarity()));
      }
    } else if (w.bastion > 0) {
      const bastions = this.enemies.filter((e) => e.kind === 'bastion').length;
      if (bastions < 2) {
        const pt = this._randomInteriorPoint();
        this.enemies.push(createTurretBastion(pt.x, pt.y, sector.id, randomPolarity()));
      }
    }
  }

  _randomEdgePoint() {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: ARENA_PADDING, y: 70 + Math.random() * (ARENA_HEIGHT - 140) };
    if (side === 1) return { x: ARENA_WIDTH - ARENA_PADDING, y: 70 + Math.random() * (ARENA_HEIGHT - 140) };
    if (side === 2) return { x: 80 + Math.random() * (ARENA_WIDTH - 160), y: 68 };
    return { x: 80 + Math.random() * (ARENA_WIDTH - 160), y: ARENA_HEIGHT - 54 };
  }

  _randomInteriorPoint() {
    for (let i = 0; i < 8; i++) {
      const x = 140 + Math.random() * (ARENA_WIDTH - 280);
      const y = 120 + Math.random() * (ARENA_HEIGHT - 240);
      if (Math.hypot(x - this.player.x, y - this.player.y) > 210) return { x, y };
    }
    return { x: ARENA_WIDTH * 0.72, y: ARENA_HEIGHT * 0.35 };
  }

  _spawnOrbAwayFromPlayer() {
    const pt = this._randomInteriorPoint();
    this.orbs.push(createResonanceOrb(pt.x, pt.y, randomPolarity()));
  }

  _stepBullets(dt) {
    const p = this.player;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.life <= 0 || b.x < -30 || b.x > ARENA_WIDTH + 30 || b.y < -30 || b.y > ARENA_HEIGHT + 30) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer) {
        let removed = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (b.hitIds.has(e.id)) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) <= b.radius + e.radius) {
            b.hitIds.add(e.id);
            this.shotsHit++;
            this._damageEnemy(e, b.damage, b.polarity, true);
            if (b.pierce > 0) {
              b.pierce--;
            } else {
              this.bullets.splice(i, 1);
              removed = true;
              break;
            }
          }
        }
        if (removed) continue;

        if (this.boss && !b.hitIds.has(this.boss.id)) {
          if (Math.hypot(b.x - this.boss.x, b.y - this.boss.y) <= b.radius + this.boss.radius) {
            b.hitIds.add(this.boss.id);
            this.shotsHit++;
            this._damageBoss(b.damage, b.polarity);
            this.bullets.splice(i, 1);
          }
        }
      } else {
        if (Math.hypot(b.x - p.x, b.y - p.y) <= b.radius + p.radius - 2) {
          if (b.polarity === p.polarity) {
            this._absorbCharge(18, 4);
            this.effects.emitSpark(b.x, b.y, 0, -40, POLARITY_META[b.polarity].primary, 3, 0.25);
          } else {
            this._damagePlayer(14, b.x, b.y);
          }
          this.bullets.splice(i, 1);
        }
      }
    }
  }

  _stepOrbs(dt) {
    const p = this.player;
    const attractRange = PLAYER_CONFIG.pickupRadius * 3.1 * this.perkStats.pickupRadiusMult;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      o.pulse += dt * 4.5;
      if (o.life <= 0) {
        this.orbs.splice(i, 1);
        continue;
      }

      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (o.polarity === p.polarity && dist < attractRange) {
        const pull = 310 * (1 - dist / attractRange) + 90;
        o.vx += (dx / dist) * pull * dt * 4;
        o.vy += (dy / dist) * pull * dt * 4;
      }

      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.x < ARENA_PADDING || o.x > ARENA_WIDTH - ARENA_PADDING) o.vx *= -1;
      if (o.y < ARENA_PADDING + 34 || o.y > ARENA_HEIGHT - ARENA_PADDING - 26) o.vy *= -1;

      if (dist <= o.radius + p.radius + 4) {
        if (o.polarity === p.polarity) {
          this.orbsAbsorbed++;
          const base = Math.round(150 * this.perkStats.orbScoreMult);
          this._absorbCharge(base, 14);
          this.player.shield = Math.min(this.player.maxShield, this.player.shield + 3);
          const meta = POLARITY_META[o.polarity];
          this.effects.emitBurst(o.x, o.y, meta.primary, 10, 55, 175, 2.8, 0.35);
          this.effects.emitRing(o.x, o.y, 44, meta.primary, 2.2, 0.25);
          this.sound?.playAbsorb(this.combo);
          this._awardScore(base, o.x, o.y - 12, `+${base * this.combo}`, meta.primary);
        } else {
          this._damagePlayer(18, o.x, o.y);
          this.effects.emitBurst(o.x, o.y, COLORS.danger, 14, 90, 240, 3.2, 0.4);
        }
        this.orbs.splice(i, 1);
      }
    }
  }

  _stepGates(dt) {
    const p = this.player;
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.life -= dt;
      g.warmUp = Math.max(0, g.warmUp - dt);
      g.phaseCooldown = Math.max(0, g.phaseCooldown - dt);
      g.angle += g.angularVel * dt;
      g.pulse += dt * 5;
      if (g.life <= 0) {
        this.gates.splice(i, 1);
        continue;
      }
      if (g.warmUp > 0) continue;

      const cos = Math.cos(g.angle);
      const sin = Math.sin(g.angle);
      const x1 = g.x - cos * g.halfLength;
      const y1 = g.y - sin * g.halfLength;
      const x2 = g.x + cos * g.halfLength;
      const y2 = g.y + sin * g.halfLength;

      const d = distToSegment(p.x, p.y, x1, y1, x2, y2);
      if (d <= p.radius + 7) {
        if (g.polarity === p.polarity) {
          if (g.phaseCooldown <= 0) {
            g.phaseCooldown = 0.85;
            this._absorbCharge(250, 12);
            const meta = POLARITY_META[g.polarity];
            this._awardScore(250, p.x, p.y - 24, 'PHASE SYNC +250', meta.primary);
            this.effects.emitRing(p.x, p.y, 50, meta.primary, 2.5, 0.28);
            this.sound?.playAbsorb(this.combo);
          }
        } else {
          this._damagePlayer(20, g.x, g.y);
        }
      }
    }
  }

  _stepEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.kind === 'chaser') {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        e.angle = Math.atan2(dy, dx);
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        e.trail.push({ x: e.x, y: e.y });
        if (e.trail.length > 7) e.trail.shift();

        if (dist <= e.radius + p.radius - 2) {
          this._damagePlayer(20, e.x, e.y);
          this._killEnemyAt(i, false);
        }
      } else if (e.kind === 'bastion') {
        e.rot += dt * 0.7;
        e.fireTimer -= dt;
        e.chargeRatio = Math.max(0, 1 - e.fireTimer / e.firePeriod);
        if (e.fireTimer <= 0) {
          e.fireTimer = e.firePeriod;
          e.polarity = otherPolarity(e.polarity);
          const count = 10;
          const baseAng = e.rot;
          for (let k = 0; k < count; k++) {
            const ang = baseAng + (Math.PI * 2 * k) / count;
            this.bullets.push(
              createBullet({
                x: e.x + Math.cos(ang) * (e.radius + 4),
                y: e.y + Math.sin(ang) * (e.radius + 4),
                vx: Math.cos(ang) * 205,
                vy: Math.sin(ang) * 205,
                polarity: e.polarity,
                fromPlayer: false,
                radius: 6,
                life: 4.5,
              })
            );
          }
          this.effects.emitRing(e.x, e.y, 48, POLARITY_META[e.polarity].primary, 2.4, 0.3);
        }
        if (Math.hypot(p.x - e.x, p.y - e.y) <= e.radius + p.radius) {
          this._damagePlayer(22, e.x, e.y);
        }
      }
    }
  }

  _stepBoss(dt) {
    const b = this.boss;
    if (!b) return;
    b.hitFlash = Math.max(0, b.hitFlash - dt);
    b.rot += dt * 0.55;
    b.ringRot -= dt * 0.9;

    const hpRatio = b.hp / b.maxHp;
    const nextPhase = b.phases === 3 ? (hpRatio < 0.34 ? 3 : hpRatio < 0.68 ? 2 : 1) : hpRatio < 0.5 ? 2 : 1;
    if (nextPhase > b.phase) {
      b.phase = nextPhase;
      this.shake = Math.max(this.shake, 14);
      this.effects.emitRing(b.x, b.y, 260, COLORS.bossPink, 5, 0.5);
      this.effects.emitPopup(b.x, b.y - 68, `PHASE ${b.phase} ENGAGED`, COLORS.bossPink, 1.3, 1.1);
      this.addGridImpulse(b.x, b.y, 1.8, 280);
      this.sound?.playBossAlert();
    }

    b.targetX = ARENA_WIDTH * 0.72 + Math.cos(this.time * 0.55) * 140;
    b.targetY = ARENA_HEIGHT * 0.5 + Math.sin(this.time * 0.9) * 165;
    b.x += (b.targetX - b.x) * Math.min(1, dt * 2.4);
    b.y += (b.targetY - b.y) * Math.min(1, dt * 2.4);

    b.shiftTimer -= dt;
    if (b.shiftTimer <= 0) {
      b.shiftTimer = Math.max(3.4, 5.6 - b.phase * 0.7);
      b.polarity = otherPolarity(b.polarity);
      this.effects.emitRing(b.x, b.y, 110, POLARITY_META[b.polarity].primary, 3, 0.35);
    }

    b.spiralTimer -= dt;
    if (b.spiralTimer <= 0) {
      b.spiralTimer = b.phase >= 3 ? 0.12 : 0.16;
      b.spiralAngle += 0.34;
      const arms = b.phase >= 2 ? 4 : 3;
      for (let a = 0; a < arms; a++) {
        const ang = b.spiralAngle + (Math.PI * 2 * a) / arms;
        const bulletPol = a % 2 === 0 ? b.polarity : otherPolarity(b.polarity);
        this.bullets.push(
          createBullet({
            x: b.x + Math.cos(ang) * (b.radius + 6),
            y: b.y + Math.sin(ang) * (b.radius + 6),
            vx: Math.cos(ang) * (215 + b.phase * 22),
            vy: Math.sin(ang) * (215 + b.phase * 22),
            polarity: bulletPol,
            fromPlayer: false,
            radius: 6,
            life: 5.0,
          })
        );
      }
    }

    b.burstTimer -= dt;
    if (b.burstTimer <= 0) {
      b.burstTimer = Math.max(1.9, 3.2 - b.phase * 0.45);
      const count = 10 + b.phase * 2;
      for (let k = 0; k < count; k++) {
        const ang = b.ringRot + (Math.PI * 2 * k) / count;
        const pol = k % 2 === 0 ? b.polarity : otherPolarity(b.polarity);
        this.bullets.push(
          createBullet({
            x: b.x + Math.cos(ang) * (b.radius + 10),
            y: b.y + Math.sin(ang) * (b.radius + 10),
            vx: Math.cos(ang) * 185,
            vy: Math.sin(ang) * 185,
            polarity: pol,
            fromPlayer: false,
            radius: 6.5,
            life: 5.2,
          })
        );
      }
      this.effects.emitRing(b.x, b.y, b.radius + 45, COLORS.bossPink, 2.5, 0.35);
    }

    b.minionTimer -= dt;
    if (b.minionTimer <= 0) {
      b.minionTimer = Math.max(4.5, 7.0 - b.phase);
      if (this.enemies.length < 6) {
        this.enemies.push(createChaserDrone(b.x - 40, b.y - 60, this.currentSector.id, b.polarity));
      }
      if (this.orbs.length < 4) {
        this._spawnOrbAwayFromPlayer();
      }
    }

    if (Math.hypot(this.player.x - b.x, this.player.y - b.y) <= this.player.radius + b.radius) {
      this._damagePlayer(26, b.x, b.y);
    }
  }

  _damageEnemy(enemy, baseDamage, attackPolarity, allowArc = true) {
    const matched = enemy.polarity === attackPolarity;
    const mult = matched ? 2.0 * this.perkStats.matchedDamageMult : 0.55;
    const dmg = Math.round(baseDamage * mult);
    enemy.hp -= dmg;
    enemy.hitFlash = 0.11;

    const color = matched ? POLARITY_META[attackPolarity].primary : COLORS.muted;
    this.effects.emitBurst(enemy.x, enemy.y, color, matched ? 7 : 3, 60, 170, 2.3, 0.24);

    if (allowArc && matched && this.perkStats.arcBounces > 0) {
      this._triggerArcLightning(enemy, Math.round(dmg * this.perkStats.arcDamageMult), attackPolarity);
    }

    if (enemy.hp <= 0) {
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this._killEnemyAt(idx, true);
    }
  }

  _triggerArcLightning(sourceEnemy, arcDmg, polarity) {
    const meta = POLARITY_META[polarity];
    let hitCount = 0;
    for (const target of this.enemies) {
      if (target === sourceEnemy || target.hp <= 0) continue;
      if (Math.hypot(target.x - sourceEnemy.x, target.y - sourceEnemy.y) <= 210) {
        this.effects.emitArc(sourceEnemy.x, sourceEnemy.y, target.x, target.y, meta.primary);
        target.hp -= arcDmg;
        target.hitFlash = 0.1;
        this.sound?.playChainZap();
        hitCount++;
        if (hitCount >= this.perkStats.arcBounces) break;
      }
    }
    if (hitCount > 0) {
      this.effects.emitPopup(sourceEnemy.x, sourceEnemy.y - 18, `CHAIN x${hitCount + 1}`, meta.primary, 0.95, 0.65);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) this._killEnemyAt(i, true);
    }
  }

  _killEnemyAt(index, awardPoints = true) {
    const e = this.enemies[index];
    if (!e) return;
    this.enemies.splice(index, 1);
    const meta = POLARITY_META[e.polarity];
    const isHeavy = e.kind === 'bastion';
    this.effects.emitBurst(e.x, e.y, meta.primary, isHeavy ? 24 : 16, 90, 320, isHeavy ? 3.8 : 3.0, 0.48);
    this.effects.emitRing(e.x, e.y, isHeavy ? 90 : 54, meta.primary, 3, 0.34);
    this.addGridImpulse(e.x, e.y, isHeavy ? 1.2 : 0.7, 150);

    if (awardPoints) {
      this.kills++;
      this.sectorKills++;
      this._absorbCharge(e.score, isHeavy ? 14 : 8);
      this._awardScore(e.score, e.x, e.y, `+${e.score * this.combo} COMBO x${this.combo}!`, meta.primary);
      this.hitStop = Math.max(this.hitStop, isHeavy ? 0.036 : 0.018);
      this.shake = Math.max(this.shake, isHeavy ? 8 : 3.5);
      this.sound?.playKill(isHeavy);
      if (Math.random() < 0.38) {
        this.orbs.push(createResonanceOrb(e.x, e.y, e.polarity));
      }
    }
  }

  _damageBoss(baseDamage, attackPolarity) {
    const b = this.boss;
    if (!b) return;
    const matched = b.polarity === attackPolarity;
    const mult = matched ? 1.65 * this.perkStats.matchedDamageMult : 0.65;
    const dmg = Math.round(baseDamage * mult);
    b.hp -= dmg;
    b.hitFlash = 0.08;
    const color = matched ? POLARITY_META[attackPolarity].primary : COLORS.muted;
    this.effects.emitBurst(b.x, b.y, color, 5, 70, 190, 2.5, 0.25);

    if (b.hp <= 0) {
      const bx = b.x;
      const by = b.y;
      const bonus = b.score;
      this.boss = null;
      this.kills++;
      this.sectorKills++;
      this.hitStop = 0.085;
      this.shake = 22;
      this.effects.emitRing(bx, by, 340, COLORS.bossPink, 6, 0.7);
      this.effects.emitBurst(bx, by, COLORS.bossPink, 44, 120, 440, 4.4, 0.8);
      this.effects.emitBurst(bx, by, '#00F0FF', 30, 90, 360, 3.6, 0.7);
      this.addGridImpulse(bx, by, 2.5, 340);
      this._awardScore(bonus, bx, by - 24, `NEXUS SHATTERED +${bonus * this.combo}`, COLORS.success);
      this.sound?.playKill(true);
    }
  }

  _absorbCharge(points, overdriveAmount) {
    this.combo = Math.min(16, this.combo + 1);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.6;
    const gain = overdriveAmount * this.perkStats.overdriveGainMult;
    if (this.player.overdrive >= 100 && overdriveAmount >= 10) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 5);
      this.score += 120 * this.combo;
      this.effects.emitPopup(this.player.x, this.player.y - 34, 'SHIELD +5', COLORS.success, 0.95, 0.7);
    }
    this.player.overdrive = Math.min(100, this.player.overdrive + gain);
    return points;
  }

  _awardScore(basePoints, x, y, label, color) {
    const gained = basePoints * this.combo;
    this.score += gained;
    this.effects.emitPopup(x, y, label, color, this.combo >= 6 ? 1.12 : 0.96, 0.85);
  }

  _damagePlayer(amount, sourceX, sourceY) {
    const p = this.player;
    if (p.invulnTimer > 0) return;
    p.shield = Math.max(0, p.shield - amount);
    p.invulnTimer = PLAYER_CONFIG.invulnOnHit;
    p.hitFlash = 0.28;
    this.combo = 1;
    this.comboTimer = 0;
    this.shake = Math.max(this.shake, 13);
    this.hitStop = 0.032;

    const dx = p.x - sourceX;
    const dy = p.y - sourceY;
    const dist = Math.hypot(dx, dy) || 1;
    p.vx += (dx / dist) * 260;
    p.vy += (dy / dist) * 260;

    this.effects.emitBurst(p.x, p.y, COLORS.danger, 18, 90, 280, 3.4, 0.42);
    this.effects.emitRing(p.x, p.y, 88, COLORS.danger, 3.5, 0.32);
    this.effects.emitPopup(p.x, p.y - 26, `-${amount} SHIELD`, COLORS.danger, 1.1, 0.85);
    this.addGridImpulse(p.x, p.y, 1.4, 180);
    this.sound?.playHit();

    if (p.shield <= 0) {
      this.state = 'gameover';
      this.effects.emitBurst(p.x, p.y, COLORS.danger, 40, 80, 380, 4, 0.75);
    }
  }

  _checkSectorProgress() {
    const sector = this.currentSector;
    const cleared = sector.boss ? this.boss === null : this.sectorKills >= sector.targetKills || this.sectorTime >= sector.duration;
    if (!cleared) return;

    if (this.sectorIndex >= SECTORS.length - 1) {
      this.state = 'victory';
      this.sound?.playVictory();
      return;
    }
    this.draftChoices = rollDraftChoices(this.installedPerks, 3);
    this.state = 'draft';
    this.sound?.playUpgrade();
  }
}
