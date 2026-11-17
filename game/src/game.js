import { SoundEngine } from './audio.js';
import {
  FloatingText,
  HazardFlask,
  HazardPool,
  LightningArc,
  ParticleSystem,
  Projectile,
  ShockwaveRing,
} from './combat.js';
import { ARENA_BOUNDS, WAVE_DEFINITIONS } from './constants.js';
import { AmberPickup, createArenaPillars, EnemyUnit, PlayerWarden } from './entities.js';
import { HudController } from './hud.js';
import { InputController } from './input.js';
import { CourtyardRenderer } from './renderer.js';
import { RelicDraftManager } from './upgrades.js';

function createRng(seedValue) {
  if (!seedValue) return Math.random;
  let s = seedValue >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class HeliosBastionGame {
  constructor() {
    this.canvas = document.getElementById('bastion-canvas');
    this.renderer = new CourtyardRenderer(this.canvas);
    this.input = new InputController(this.canvas);
    this.audio = new SoundEngine();
    this.draftManager = new RelicDraftManager();

    const params = new URLSearchParams(window.location.search);
    const seedParam = Number(params.get('seed'));
    this.rng = createRng(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : 0);

    this.difficulty = 'standard';
    this.mode = 'TITLE';
    this.elapsed = 0;
    this.runTime = 0;
    this.hitstopTimer = 0;
    this.shakeAmount = 0;

    this.pillars = createArenaPillars();
    this.player = new PlayerWarden(this.difficulty);
    this.enemies = [];
    this.projectiles = [];
    this.flasks = [];
    this.hazardPools = [];
    this.pickups = [];
    this.rings = [];
    this.lightningArcs = [];
    this.floatingTexts = [];
    this.particles = new ParticleSystem();

    this.waveIndex = 0;
    this.waveTotal = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.draftChoices = [];

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.peakCombo = 1.0;
    this.amber = 0;
    this.kills = 0;
    this.parries = 0;
    this.victory = false;

    this.hud = new HudController({
      onStart: () => this.startNewRun(),
      onResume: () => this.togglePause(false),
      onRestart: () => this.startNewRun(),
      onTitle: () => this.returnToTitle(),
      onToggleMute: () => {
        this.audio.unlock();
        const muted = this.audio.toggleMute();
        this.hud.setMuteLabel(muted);
      },
      onDifficultyChange: (diff) => {
        this.difficulty = diff;
      },
    });

    this.bindGlobalHotkeys();
    this.seedTitleDiorama();
    this.hud.setMode('TITLE');

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  bindGlobalHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.audio.unlock();
        this.hud.setMuteLabel(this.audio.toggleMute());
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.mode === 'PLAYING') {
          this.togglePause(true);
        } else if (this.mode === 'PAUSED') {
          this.togglePause(false);
        }
      } else if (e.code === 'KeyR') {
        if (this.mode === 'RESULTS' || this.mode === 'PAUSED') {
          this.startNewRun();
        }
      } else if (this.mode === 'DRAFT') {
        if (e.code === 'Digit1') this.pickDraftRelic(0);
        if (e.code === 'Digit2') this.pickDraftRelic(1);
        if (e.code === 'Digit3') this.pickDraftRelic(2);
      } else if (this.mode === 'TITLE' && e.code === 'Enter') {
        this.startNewRun();
      }
    });
  }

  seedTitleDiorama() {
    this.pillars = createArenaPillars();
    this.player = new PlayerWarden(this.difficulty);
    this.player.x = 215;
    this.player.y = 395;
    this.player.aimAngle = -0.15;
    this.enemies = [
      new EnemyUnit('boss', 1055, 360),
      new EnemyUnit('sentinel', 1095, 190),
      new EnemyUnit('knight', 1030, 540),
      new EnemyUnit('scarab', 180, 185),
      new EnemyUnit('alchemist', 235, 575),
    ];
    this.projectiles = [
      new Projectile({ x: 268, y: 382, angle: -0.1, speed: 0, color: '#ffd55a', radius: 9, fromPlayer: true }),
      new Projectile({ x: 990, y: 315, angle: 3.0, speed: 0, color: '#ff5959', radius: 8, fromPlayer: false }),
      new Projectile({ x: 980, y: 425, angle: 2.9, speed: 0, color: '#ff9a3c', radius: 8, fromPlayer: false }),
    ];
    this.hazardPools = [new HazardPool(175, 535)];
    this.flasks = [];
    this.pickups = [new AmberPickup(245, 290, 4, false), new AmberPickup(1025, 250, 4, false)];
    this.rings = [new ShockwaveRing(215, 395, 48, '#ffd55a', 1.0, 4)];
    this.rings[0].age = 0.45;
    this.lightningArcs = [];
    this.floatingTexts = [];
  }

  returnToTitle() {
    this.mode = 'TITLE';
    this.seedTitleDiorama();
    this.hud.setMode('TITLE');
  }

  togglePause(paused) {
    if (paused && this.mode === 'PLAYING') {
      this.mode = 'PAUSED';
      this.hud.setMode('PAUSED');
    } else if (!paused && this.mode === 'PAUSED') {
      this.mode = 'PLAYING';
      this.hud.setMode('PLAYING');
    }
  }

  startNewRun() {
    this.audio.unlock();
    this.input.resetActionQueues();
    this.draftManager.reset();
    this.pillars = createArenaPillars();
    this.player = new PlayerWarden(this.difficulty);

    this.enemies = [];
    this.projectiles = [];
    this.flasks = [];
    this.hazardPools = [];
    this.pickups = [];
    this.rings = [];
    this.lightningArcs = [];
    this.floatingTexts = [];
    this.particles = new ParticleSystem();

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.peakCombo = 1.0;
    this.amber = 0;
    this.kills = 0;
    this.parries = 0;
    this.runTime = 0;
    this.victory = false;
    this.waveIndex = 0;

    this.mode = 'PLAYING';
    this.hud.setMode('PLAYING');
    this.beginNextWave();
  }

  beginNextWave() {
    this.waveIndex += 1;
    if (this.waveIndex > WAVE_DEFINITIONS.length) {
      this.finishRun(true);
      return;
    }

    const def = WAVE_DEFINITIONS[this.waveIndex - 1];
    this.spawnQueue = [];
    const diffHp = this.difficulty === 'ascended' ? 1.2 : 1.0;
    const diffSpd = this.difficulty === 'ascended' ? 1.14 : 1.0;

    for (const group of def.groups) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          type: group.type,
          hpScale: (group.hpScale || 1) * diffHp,
          speedScale: diffSpd,
        });
      }
    }

    this.waveTotal = this.spawnQueue.length;
    this.spawnTimer = 0.25;
    this.projectiles = [];
    this.flasks = [];
    this.hazardPools = [];

    if (def.bossTitle) {
      this.audio.playBossHorn();
      // Spawn boss immediately at top-center courtyard
      const bossIdx = this.spawnQueue.findIndex((s) => s.type === 'boss');
      if (bossIdx >= 0) {
        const [bossSpec] = this.spawnQueue.splice(bossIdx, 1);
        this.spawnEnemyAt(bossSpec, ARENA_BOUNDS.centerX, ARENA_BOUNDS.top + 88);
      }
    } else {
      this.floatingTexts.push(
        new FloatingText(ARENA_BOUNDS.centerX, ARENA_BOUNDS.centerY - 70, `WAVE ${this.waveIndex}: ${def.label}`, '#fff2be', 1.2)
      );
    }

    // Spawn initial vanguard immediately so the arena feels alive right away
    const initialCount = Math.min(3, this.spawnQueue.length);
    for (let i = 0; i < initialCount; i++) {
      this.spawnNextFromQueue();
    }
    this.syncHud();
  }

  spawnNextFromQueue() {
    if (this.spawnQueue.length === 0) return;
    const spec = this.spawnQueue.shift();
    const edge = Math.floor(this.rng() * 4);
    let x = ARENA_BOUNDS.centerX;
    let y = ARENA_BOUNDS.top + 36;
    if (edge === 0) {
      x = ARENA_BOUNDS.left + 40 + this.rng() * (ARENA_BOUNDS.right - ARENA_BOUNDS.left - 80);
      y = ARENA_BOUNDS.top + 34;
    } else if (edge === 1) {
      x = ARENA_BOUNDS.right - 36;
      y = ARENA_BOUNDS.top + 40 + this.rng() * (ARENA_BOUNDS.bottom - ARENA_BOUNDS.top - 80);
    } else if (edge === 2) {
      x = ARENA_BOUNDS.left + 40 + this.rng() * (ARENA_BOUNDS.right - ARENA_BOUNDS.left - 80);
      y = ARENA_BOUNDS.bottom - 36;
    } else {
      x = ARENA_BOUNDS.left + 36;
      y = ARENA_BOUNDS.top + 40 + this.rng() * (ARENA_BOUNDS.bottom - ARENA_BOUNDS.top - 80);
    }
    this.spawnEnemyAt(spec, x, y);
  }

  spawnEnemyAt(spec, x, y) {
    const enemy = new EnemyUnit(spec.type, x, y, spec.hpScale, spec.speedScale);
    this.enemies.push(enemy);
    this.rings.push(new ShockwaveRing(x, y, enemy.radius * 2.1, '#ffd466', 0.36, 3));
  }

  frame(now) {
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    this.elapsed += dt;
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 28);
    }

    if (this.mode === 'TITLE') {
      this.updateTitleDiorama(dt);
    } else if (this.mode === 'PLAYING') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        this.updateGameplay(dt);
      }
      this.syncHud();
    }

    this.renderer.render({
      mode: this.mode,
      elapsed: this.elapsed,
      shakeAmount: this.shakeAmount,
      pillars: this.pillars,
      player: this.player,
      enemies: this.enemies,
      projectiles: this.projectiles,
      flasks: this.flasks,
      hazardPools: this.hazardPools,
      pickups: this.pickups,
      rings: this.rings,
      lightningArcs: this.lightningArcs,
      floatingTexts: this.floatingTexts,
      particles: this.particles,
      aimX: this.input.mouseX,
      aimY: this.input.mouseY,
    });

    requestAnimationFrame((t) => this.frame(t));
  }

  updateTitleDiorama(dt) {
    for (const p of this.pillars) p.update(dt);
    this.player.stridePhase += dt * 4.5;
    this.player.aimAngle = Math.sin(this.elapsed * 0.8) * 0.32 - 0.1;
    for (const e of this.enemies) {
      e.animTimer += dt;
      if (e.type === 'boss') e.orbitAngle += dt * 1.4;
      e.facing = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    }
  }

  updateGameplay(dt) {
    this.runTime += dt;
    for (const p of this.pillars) p.update(dt);

    // Radiance combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
    } else if (this.combo > 1.0) {
      this.combo = Math.max(1.0, this.combo - dt * 0.35);
    }

    // Player aim & movement
    this.player.aimAngle = Math.atan2(this.input.mouseY - this.player.y, this.input.mouseX - this.player.x);
    const moveVec = this.input.getMoveVector();

    if (this.input.consumeDash()) {
      if (this.player.tryDash(moveVec)) {
        this.audio.playDash();
        this.rings.push(new ShockwaveRing(this.player.x, this.player.y, 56, '#7ceeff', 0.28, 4));
        this.particles.burst(this.player.x, this.player.y, '#ffe68a', 8, 50, 150, 4);
      }
    }

    if (this.input.consumeNova()) {
      if (this.player.tryNova()) {
        this.triggerSunburstNova();
      }
    }

    if (this.input.mouseDown && this.player.fireCooldown <= 0) {
      this.firePlayerLance();
    }

    this.player.update(dt, moveVec, this.pillars);

    // Wave spawner
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnNextFromQueue();
        this.spawnTimer = 1.15;
      }
    }

    // Update enemies
    const enemyCallbacks = {
      fireEnemyBolt: (x, y, angle, speed, damage, color, radius) => {
        this.projectiles.push(
          new Projectile({ x, y, angle, speed, damage, color, radius, fromPlayer: false, life: 3.4 })
        );
      },
      spawnHazardFlask: (sx, sy, tx, ty) => {
        this.flasks.push(new HazardFlask(sx, sy, tx, ty));
      },
    };

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this.pillars, enemyCallbacks);
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.radius + this.player.radius - 2) {
        if (!this.player.isParrying()) {
          this.damagePlayer(1, enemy.x, enemy.y);
        }
      }
    }

    // Update arcing flasks & acid pools
    for (let i = this.flasks.length - 1; i >= 0; i--) {
      if (this.flasks[i].update(dt)) {
        const landed = this.flasks[i];
        this.hazardPools.push(new HazardPool(landed.targetX, landed.targetY));
        this.particles.burst(landed.targetX, landed.targetY, '#66e07f', 12, 40, 140, 5);
        this.flasks.splice(i, 1);
      }
    }

    for (let i = this.hazardPools.length - 1; i >= 0; i--) {
      const pool = this.hazardPools[i];
      if (!pool.update(dt)) {
        this.hazardPools.splice(i, 1);
        continue;
      }
      const dist = Math.hypot(this.player.x - pool.x, this.player.y - pool.y);
      if (dist < pool.radius + this.player.radius * 0.5 && !this.player.isParrying()) {
        this.damagePlayer(1, pool.x, pool.y);
      }
    }

    // Update projectiles
    this.updateProjectiles(dt);

    // Update pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.age += dt;
      const dx = this.player.x - item.x;
      const dy = this.player.y - item.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 150) {
        item.x += (dx / d) * 320 * dt;
        item.y += (dy / d) * 320 * dt;
      }
      if (d < this.player.radius + item.radius + 4) {
        if (item.heals) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
          this.floatingTexts.push(new FloatingText(item.x, item.y - 10, '+1 HP', '#ff8585', 1.0));
        } else {
          this.amber += item.value;
          this.addScore(item.value * 15);
        }
        this.particles.burst(item.x, item.y, item.heals ? '#ff7070' : '#ffbe3d', 6, 30, 100, 3.5);
        this.pickups.splice(i, 1);
      }
    }

    // Visual effects
    this.particles.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      if (!this.rings[i].update(dt)) this.rings.splice(i, 1);
    }
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      if (!this.lightningArcs[i].update(dt)) this.lightningArcs.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      if (!this.floatingTexts[i].update(dt)) this.floatingTexts.splice(i, 1);
    }

    // Check wave completion
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.mode === 'PLAYING') {
      this.onWaveCleared();
    }
  }

  firePlayerLance() {
    this.player.fireCooldown = 1 / this.player.fireRate;
    this.player.shotCounter += 1;
    this.player.lanceSwingTimer = 0.14;

    const isIgnisShot = this.player.ignisEveryThird && this.player.shotCounter % 3 === 0;
    const totalBolts = 1 + this.player.extraBolts;
    const spreadStep = 0.15;
    const baseSpeed = 590 * this.player.boltSpeedMult;
    const baseDmg = (isIgnisShot ? 32 : 20) * this.player.damageMult;

    for (let i = 0; i < totalBolts; i++) {
      const offset = (i - (totalBolts - 1) / 2) * spreadStep;
      const ang = this.player.aimAngle + offset;
      this.projectiles.push(
        new Projectile({
          x: this.player.x + Math.cos(ang) * 24,
          y: this.player.y + Math.sin(ang) * 24,
          angle: ang,
          speed: baseSpeed,
          damage: baseDmg,
          color: isIgnisShot ? '#ff7d38' : '#ffd55a',
          radius: isIgnisShot ? 10 : 7,
          fromPlayer: true,
          bouncesLeft: this.player.wallBounces,
          explosive: isIgnisShot,
          life: 1.8,
        })
      );
    }

    this.audio.playShoot(isIgnisShot);
    this.particles.burst(
      this.player.x + Math.cos(this.player.aimAngle) * 26,
      this.player.y + Math.sin(this.player.aimAngle) * 26,
      isIgnisShot ? '#ff8e47' : '#ffe88c',
      5,
      50,
      140,
      3.2
    );
  }

  triggerSunburstNova() {
    const hasConduit = this.draftManager.collected.some((r) => r.id === 'brazier_conduit');
    const radius = hasConduit ? 235 : 165;
    const dmg = Math.round(42 * this.player.damageMult);

    this.audio.playNova();
    this.shakeAmount = Math.max(this.shakeAmount, 9);
    this.rings.push(new ShockwaveRing(this.player.x, this.player.y, radius, '#ffd34f', 0.42, 7));
    this.particles.burst(this.player.x, this.player.y, '#ffba38', 22, 90, 290, 5.5);

    for (const p of this.pillars) {
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < radius + p.radius) {
        p.ignite();
      }
    }

    // Clear nearby enemy projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      if (!pr.fromPlayer && Math.hypot(pr.x - this.player.x, pr.y - this.player.y) <= radius) {
        this.particles.burst(pr.x, pr.y, '#ffd55a', 6, 40, 120, 3.5);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) <= radius + e.radius) {
        this.damageEnemy(e, i, dmg, true);
      }
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const status = proj.update(dt, this.enemies, this.pillars);

      if (!status.alive) {
        if (proj.explosive) {
          this.triggerExplosion(proj.x, proj.y, 92, proj.damage * 0.8);
        } else {
          this.particles.burst(proj.x, proj.y, proj.color, 5, 30, 100, 3);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.fromPlayer) {
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(proj.x - e.x, proj.y - e.y) < proj.radius + e.radius) {
            hit = true;
            if (proj.explosive) {
              this.triggerExplosion(proj.x, proj.y, 96, proj.damage * 0.75);
            }
            if (this.player.chainLightning > 0) {
              this.triggerChainLightning(e, Math.round(proj.damage * 0.55), this.player.chainLightning);
            }
            this.damageEnemy(e, j, Math.round(proj.damage), proj.parried);
            break;
          }
        }
        if (hit) {
          this.projectiles.splice(i, 1);
        }
      } else {
        const distToPlayer = Math.hypot(proj.x - this.player.x, proj.y - this.player.y);
        if (this.player.isParrying() && distToPlayer < this.player.radius + proj.radius + 18) {
          this.parryEnemyBolt(proj);
          this.projectiles.splice(i, 1);
          continue;
        }
        if (distToPlayer < this.player.radius + proj.radius - 2) {
          this.damagePlayer(proj.damage, proj.x, proj.y);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  parryEnemyBolt(proj) {
    this.parries += 1;
    this.hitstopTimer = 0.045;
    this.shakeAmount = Math.max(this.shakeAmount, 7);
    this.audio.playParry();
    this.boostCombo(0.35);
    this.addScore(120);

    this.rings.push(new ShockwaveRing(proj.x, proj.y, 74, '#fff29e', 0.3, 5));
    this.particles.burst(proj.x, proj.y, '#ffe66b', 14, 80, 260, 4.5);
    this.floatingTexts.push(new FloatingText(proj.x, proj.y - 14, 'PARRY! +120', '#fff08a', 1.15));

    const reflectBaseAngle = Math.atan2(this.input.mouseY - proj.y, this.input.mouseX - proj.x);
    const count = this.player.mirroredParry ? 3 : 1;
    for (let k = 0; k < count; k++) {
      const ang = reflectBaseAngle + (k - (count - 1) / 2) * 0.24;
      this.projectiles.push(
        new Projectile({
          x: proj.x,
          y: proj.y,
          angle: ang,
          speed: 650,
          damage: Math.round(48 * this.player.damageMult),
          color: '#fff078',
          radius: 10,
          fromPlayer: true,
          parried: true,
          homing: this.player.mirroredParry,
          life: 2.0,
        })
      );
    }
  }

  triggerExplosion(x, y, radius, damage) {
    this.rings.push(new ShockwaveRing(x, y, radius, '#ff8038', 0.32, 5));
    this.particles.burst(x, y, '#ff9a3d', 16, 70, 220, 5);
    this.shakeAmount = Math.max(this.shakeAmount, 5);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.radius) {
        this.damageEnemy(e, i, Math.round(damage), true);
      }
    }
  }

  triggerChainLightning(sourceEnemy, damage, maxJumps) {
    const visited = new Set([sourceEnemy]);
    let current = sourceEnemy;
    const pts = [{ x: current.x, y: current.y }];

    for (let jump = 0; jump < maxJumps; jump++) {
      let nearestIdx = -1;
      let nearestDist = 210;
      for (let i = 0; i < this.enemies.length; i++) {
        const cand = this.enemies[i];
        if (visited.has(cand)) continue;
        const d = Math.hypot(cand.x - current.x, cand.y - current.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      if (nearestIdx < 0) break;
      const target = this.enemies[nearestIdx];
      visited.add(target);
      pts.push({ x: target.x, y: target.y });
      this.damageEnemy(target, nearestIdx, damage, false);
      current = target;
    }

    if (pts.length > 1) {
      this.lightningArcs.push(new LightningArc(pts, '#74ecff'));
    }
  }

  damageEnemy(enemy, index, amount, isCrit = false) {
    if (!this.enemies[index] || this.enemies[index] !== enemy) {
      index = this.enemies.indexOf(enemy);
      if (index < 0) return;
    }
    enemy.hp -= amount;
    enemy.hitFlash = 0.09;
    this.audio.playHit(isCrit);
    this.particles.burst(enemy.x, enemy.y, isCrit ? '#ffd859' : '#ff6f47', 7, 45, 165, 3.8);
    this.floatingTexts.push(
      new FloatingText(enemy.x, enemy.y - enemy.radius, String(amount), isCrit ? '#ffe878' : '#fff5df', isCrit ? 1.15 : 0.92)
    );

    if (enemy.hp <= 0) {
      this.enemies.splice(index, 1);
      this.kills += 1;
      this.boostCombo(0.15);
      this.addScore(enemy.scoreValue);
      this.audio.playKill();

      this.rings.push(new ShockwaveRing(enemy.x, enemy.y, enemy.radius * 1.9, '#ffb84d', 0.28, 3));
      this.particles.burst(enemy.x, enemy.y, '#ff9d3b', enemy.type === 'boss' ? 32 : 14, 60, 250, 5);

      const dropsHeal = enemy.type === 'boss' || (this.kills % 9 === 0);
      this.pickups.push(new AmberPickup(enemy.x, enemy.y, enemy.amberValue, dropsHeal));

      if (this.player.vampiricKills && this.kills % 8 === 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 22, '+1 SUNDIAL HP', '#7bff9a', 1.0));
      }
    }
  }

  damagePlayer(amount, srcX, srcY) {
    if (this.player.invulnTimer > 0) return;
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.invulnTimer = 0.85;
    this.player.hurtFlash = 0.22;
    this.combo = Math.max(1.0, this.combo * 0.65);
    this.shakeAmount = Math.max(this.shakeAmount, 12);
    this.hitstopTimer = 0.05;
    this.audio.playHurt();

    const ang = Math.atan2(this.player.y - srcY, this.player.x - srcX);
    this.player.vx += Math.cos(ang) * 260;
    this.player.vy += Math.sin(ang) * 260;
    this.particles.burst(this.player.x, this.player.y, '#ff5247', 16, 70, 220, 4.5);
    this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 24, `-${amount} HP`, '#ff665c', 1.15));

    if (this.player.carapaceShockwave) {
      this.rings.push(new ShockwaveRing(this.player.x, this.player.y, 150, '#ffd86b', 0.35, 5));
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 150) {
          e.x += (dx / dist) * 55;
          e.y += (dy / dist) * 55;
          this.damageEnemy(e, i, 24, false);
        }
      }
    }

    if (this.player.hp <= 0) {
      this.finishRun(false);
    }
  }

  boostCombo(delta) {
    this.combo = Math.min(5.0, this.combo + delta);
    this.comboTimer = 3.6;
    if (this.combo > this.peakCombo) {
      this.peakCombo = this.combo;
    }
  }

  addScore(base) {
    this.score += base * this.combo * this.player.scoreMult;
  }

  onWaveCleared() {
    this.audio.playWaveClear();
    this.addScore(350 * this.waveIndex);

    if (this.waveIndex >= WAVE_DEFINITIONS.length) {
      this.finishRun(true);
      return;
    }

    this.mode = 'DRAFT';
    this.input.resetActionQueues();
    this.draftChoices = this.draftManager.rollOptions(this.rng);
    this.hud.setMode('DRAFT');
    this.hud.showDraftChoices(this.waveIndex, this.draftChoices, (idx) => this.pickDraftRelic(idx));
  }

  pickDraftRelic(index) {
    if (this.mode !== 'DRAFT') return;
    const chosen = this.draftChoices[index];
    if (!chosen) return;

    this.audio.playDraftPick();
    this.draftManager.applyRelic(chosen, this.player);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
    this.mode = 'PLAYING';
    this.hud.setMode('PLAYING');
    this.beginNextWave();
  }

  finishRun(victory) {
    this.victory = victory;
    this.mode = 'RESULTS';
    this.input.resetActionQueues();
    this.hud.setMode('RESULTS');

    let rank = 'B';
    if (victory && this.score >= 12000) rank = 'S';
    else if (victory && this.score >= 7500) rank = 'A';
    else if (!victory && this.waveIndex <= 2) rank = 'C';

    this.hud.showResults({
      victory,
      rank,
      score: this.score,
      wavesCleared: victory ? WAVE_DEFINITIONS.length : Math.max(0, this.waveIndex - 1),
      totalWaves: WAVE_DEFINITIONS.length,
      kills: this.kills,
      parries: this.parries,
      peakCombo: this.peakCombo,
      runTime: this.runTime,
      relics: this.draftManager.collected,
    });
  }

  syncHud() {
    const def = WAVE_DEFINITIONS[Math.max(0, Math.min(WAVE_DEFINITIONS.length - 1, this.waveIndex - 1))];
    const boss = this.enemies.find((e) => e.type === 'boss') || null;
    this.hud.updateCombatHud({
      player: this.player,
      waveIndex: this.waveIndex,
      totalWaves: WAVE_DEFINITIONS.length,
      waveLabel: def.label,
      bossTitle: def.bossTitle,
      waveRemaining: this.enemies.length + this.spawnQueue.length,
      waveTotal: this.waveTotal,
      score: this.score,
      combo: this.combo,
      amber: this.amber,
      relics: this.draftManager.collected,
      boss,
    });
  }
}

window.__HELIOS__ = new HeliosBastionGame();
