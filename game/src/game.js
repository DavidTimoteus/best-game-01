import { SoundEngine } from './audio.js';
import {
  BEACON_POS,
  BLUEPRINT_CATALOG,
  FIXED_DT,
  GAME_HEIGHT,
  GAME_WIDTH,
  NIGHT_SCRIPTS,
  STORAGE_KEY,
} from './constants.js';
import { rollDraftChoices } from './draft.js';
import { EffectsManager } from './effects.js';
import { createInitialNodes, createKeeper, findNearestNode, spawnEnemy } from './entities.js';
import { BastionEnvironment } from './environment.js';
import { HudController } from './hud.js';
import { aimMirrorTowardPoint, pointToSegmentDistance, solveOpticalNetwork } from './optics.js';
import { GameRenderer } from './renderer.js';
import { clamp, clampToBastion, createRng, dist, normalizeAngle, rotateToward } from './rng.js';

export class PrismharborGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.env = new BastionEnvironment();
    this.renderer = new GameRenderer(this.canvas, this.env);
    this.hud = new HudController();
    this.audio = new SoundEngine();
    this.effects = new EffectsManager();

    this.mode = 'vigil';
    this.screen = 'TITLE';
    this.rng = createRng(20261117);
    this.bestScore = this.loadBestScore();

    this.keys = new Set();
    this.mouse = { x: 780, y: 270, downLeft: false };
    this.time = 0;
    this.accumulator = 0;
    this.lastFrameTs = 0;

    this.resetRunState();
    this.bindEvents();
    this.hud.updateBest(this.bestScore);
    this.hud.updateMute(!this.audio.muted);
    this.hud.setScreen('TITLE');
    this.exposeApi();
  }

  loadBestScore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  saveBestScore(score) {
    if (score <= this.bestScore) return;
    this.bestScore = score;
    this.hud.updateBest(this.bestScore);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(score));
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }

  resetRunState() {
    this.rng = createRng(20261117 + (this.mode === 'endless' ? 991 : 0));
    this.keeper = createKeeper();
    this.nodes = createInitialNodes();
    this.enemies = [];
    this.flareBolts = [];
    this.enemyProjectiles = [];
    this.telegraphs = [];
    this.effects.clear();

    this.beaconAngle = -0.38;
    this.hp = 100;
    this.maxHp = 100;
    this.score = 0;
    this.kills = 0;
    this.night = 1;
    this.nightsCleared = 0;
    this.peakChain = 1;
    this.relicCount = 0;
    this.ownedRelics = {};
    this.draftChoices = [];

    this.mods = {
      baseBeamDps: 88,
      beamWidthMult: 1.0,
      bounceBonus: 0,
      crossfireBonus: 0,
      maxBounces: 6,
      flareRateMult: 1.0,
      flarePierce: 0,
      overchargeDuration: 3.2,
      pulseCooldownMax: 4.8,
      pulseRadiusMult: 1.0,
      damageTakenMult: 1.0,
      chillSlow: false,
      gyroTrack: false,
      capacitorTrigger: false,
    };

    this.spawnQueue = [];
    this.spawnTimer = 0.6;
    this.spawnInterval = 1.1;
    this.calloutTimer = 0;
    this.calloutKicker = '';
    this.calloutTitle = '';
    this.optics = solveOpticalNetwork(this.beaconAngle, this.nodes, this.getOpticsOptions());
  }

  getOpticsOptions() {
    return {
      maxBounces: this.mods.maxBounces,
      maxRays: 20,
      mirrorHalfLen: 31 + (this.ownedRelics.portable_mirror || 0) * 4,
      baseWidth: this.mods.beamWidthMult,
    };
  }

  bindEvents() {
    const updatePointer = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * GAME_WIDTH;
      this.mouse.y = ((clientY - rect.top) / rect.height) * GAME_HEIGHT;
    };

    this.canvas.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY));
    this.canvas.addEventListener('mousedown', (e) => {
      updatePointer(e.clientX, e.clientY);
      this.audio.ensureContext();
      if (this.screen !== 'PLAYING') return;
      if (e.button === 0) {
        this.mouse.downLeft = true;
        this.tryFireFlareBolt();
      } else if (e.button === 2) {
        this.aimNearestNodeToCursor();
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.downLeft = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        if (this.screen === 'PLAYING' || this.screen === 'DRAFT') {
          e.preventDefault();
        }
      }
      this.keys.add(code);

      if (code === 'KeyM') {
        const enabled = this.audio.toggleMute();
        this.hud.updateMute(enabled);
        return;
      }

      if (this.screen === 'PLAYING') {
        if (code === 'KeyE') this.toggleCarryPortableMirror();
        else if (code === 'Space') this.triggerResonancePulse();
        else if (code === 'KeyP' || code === 'Escape') this.togglePause();
      } else if (this.screen === 'PAUSED') {
        if (code === 'KeyP' || code === 'Escape') this.togglePause();
        else if (code === 'KeyR') this.startNewRun();
      } else if (this.screen === 'DRAFT') {
        if (code === 'Digit1') this.selectDraft(0);
        else if (code === 'Digit2') this.selectDraft(1);
        else if (code === 'Digit3') this.selectDraft(2);
      } else if (this.screen === 'RESULTS') {
        if (code === 'KeyR') this.startNewRun();
      } else if (this.screen === 'TITLE') {
        if (code === 'Enter') this.startNewRun();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    document.getElementById('mode-vigil').addEventListener('click', () => this.setMode('vigil'));
    document.getElementById('mode-endless').addEventListener('click', () => this.setMode('endless'));
    document.getElementById('btn-start').addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-mute').addEventListener('click', () => {
      this.hud.updateMute(this.audio.toggleMute());
    });
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart-pause').addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-quit-title').addEventListener('click', () => this.returnToTitle());
    document.getElementById('btn-play-again').addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-results-title').addEventListener('click', () => this.returnToTitle());
  }

  setMode(mode) {
    this.mode = mode === 'endless' ? 'endless' : 'vigil';
    document.getElementById('mode-vigil').classList.toggle('active', this.mode === 'vigil');
    document.getElementById('mode-endless').classList.toggle('active', this.mode === 'endless');
  }

  startNewRun() {
    this.audio.ensureContext();
    this.resetRunState();
    this.screen = 'PLAYING';
    this.hud.setScreen('PLAYING');
    this.hud.renderRelicStrip([]);
    this.beginNight(1);
  }

  returnToTitle() {
    this.screen = 'TITLE';
    this.resetRunState();
    this.hud.setScreen('TITLE');
  }

  togglePause() {
    if (this.screen === 'PLAYING') {
      this.screen = 'PAUSED';
      this.hud.setScreen('PAUSED');
    } else if (this.screen === 'PAUSED') {
      this.screen = 'PLAYING';
      this.hud.setScreen('PLAYING');
    }
  }

  beginNight(nightNumber) {
    this.night = nightNumber;
    this.spawnQueue.length = 0;

    if (nightNumber <= NIGHT_SCRIPTS.length) {
      const script = NIGHT_SCRIPTS[nightNumber - 1];
      this.spawnInterval = script.interval;
      this.calloutKicker = script.kicker;
      this.calloutTitle = script.title;
      for (const group of script.groups) {
        for (let i = 0; i < group.count; i++) {
          this.spawnQueue.push(group.type);
        }
      }
      if (script.boss) {
        const mid = Math.floor(this.spawnQueue.length * 0.5);
        this.spawnQueue.splice(mid, 0, script.boss);
      }
    } else {
      const extra = nightNumber - 7;
      this.spawnInterval = Math.max(0.45, 0.78 - extra * 0.04);
      this.calloutKicker = 'ABYSSAL SURGE';
      this.calloutTitle = `NIGHT ${nightNumber} — ENDLESS TIDE`;
      const counts = {
        crawler: 12 + extra * 2,
        stalker: 9 + extra * 2,
        mortar: 4 + Math.floor(extra * 0.8),
        siren: 4 + Math.floor(extra * 0.7),
      };
      for (const [type, cnt] of Object.entries(counts)) {
        for (let i = 0; i < cnt; i++) this.spawnQueue.push(type);
      }
      if (nightNumber % 3 === 1) {
        this.spawnQueue.splice(Math.floor(this.spawnQueue.length * 0.5), 0, 'reaver');
      } else if (nightNumber % 3 === 0) {
        this.spawnQueue.splice(Math.floor(this.spawnQueue.length * 0.5), 0, 'sovereign');
      }
    }

    // Interleave queue deterministically
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      const tmp = this.spawnQueue[i];
      this.spawnQueue[i] = this.spawnQueue[j];
      this.spawnQueue[j] = tmp;
    }

    this.spawnTimer = 0.65;
    this.calloutTimer = 2.6;
  }

  aimNearestNodeToCursor() {
    const node = findNearestNode(this.nodes, this.mouse.x, this.mouse.y, 260);
    if (!node) return;
    aimMirrorTowardPoint(node, this.mouse.x, this.mouse.y);
    this.audio.playMirrorClick();
    this.effects.spawnRing(node.x, node.y, 44, '#ffd571', 2.4, 0.25);
  }

  toggleCarryPortableMirror() {
    if (this.keeper.carryingNodeId) {
      const carried = this.nodes.find((n) => n.id === this.keeper.carryingNodeId);
      if (carried) {
        let drop = clampToBastion(this.keeper.x, this.keeper.y, 34);
        if (dist(drop.x, drop.y, BEACON_POS.x, BEACON_POS.y) < BEACON_POS.radius + 42) {
          const ang = Math.atan2(drop.y - BEACON_POS.y, drop.x - BEACON_POS.x);
          drop = {
            x: BEACON_POS.x + Math.cos(ang) * (BEACON_POS.radius + 46),
            y: BEACON_POS.y + Math.sin(ang) * (BEACON_POS.radius + 46),
          };
        }
        carried.x = drop.x;
        carried.y = drop.y;
        carried.carried = false;
        aimMirrorTowardPoint(carried, this.mouse.x, this.mouse.y);
        this.keeper.carryingNodeId = null;
        this.audio.playMirrorPlace();
        this.effects.spawnRing(carried.x, carried.y, 52, '#57f2ff', 2.8, 0.3);
      }
      return;
    }

    const portable = findNearestNode(
      this.nodes,
      this.keeper.x,
      this.keeper.y,
      96,
      (n) => n.portable
    );
    if (portable) {
      portable.carried = true;
      this.keeper.carryingNodeId = portable.id;
      this.audio.playMirrorClick();
      this.effects.spawnBurst(portable.x, portable.y, '#57f2ff', 8, 30, 95, 2.5);
    }
  }

  tryFireFlareBolt() {
    if (this.keeper.fireCooldown > 0) return;
    this.keeper.fireCooldown = 0.28 / this.mods.flareRateMult;
    const ang = Math.atan2(this.mouse.y - this.keeper.y, this.mouse.x - this.keeper.x);
    this.flareBolts.push({
      x: this.keeper.x + Math.cos(ang) * 18,
      y: this.keeper.y + Math.sin(ang) * 18,
      vx: Math.cos(ang) * 580,
      vy: Math.sin(ang) * 580,
      damage: 28,
      pierceLeft: this.mods.flarePierce,
      life: 1.5,
      hitIds: new Set(),
      chargedNodes: new Set(),
    });
    this.audio.playFlareBolt();
  }

  triggerResonancePulse() {
    if (this.keeper.pulseCooldown > 0) return;
    this.keeper.pulseCooldown = this.mods.pulseCooldownMax;
    const radius = Math.round(135 * this.mods.pulseRadiusMult);

    const sources = [{ x: this.keeper.x, y: this.keeper.y, color: '#ffd571' }];
    for (const node of this.nodes) {
      if (!node.carried && node.lit) {
        sources.push({ x: node.x, y: node.y, color: '#57f2ff' });
      }
    }

    const pulseDamage = 42 + sources.length * 9;
    this.executeShockwaves(sources, radius, pulseDamage);
    this.audio.playResonancePulse(sources.length);
    this.effects.addShake(6, 0.22);
    this.effects.addHitstop(0.035);
  }

  executeShockwaves(sources, radius, damage) {
    for (const src of sources) {
      this.effects.spawnRing(src.x, src.y, radius, src.color, 4.2, 0.44);
      this.effects.spawnBurst(src.x, src.y, src.color, 10, 60, 190, 3);

      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = this.enemyProjectiles[i];
        if (dist(src.x, src.y, ep.x, ep.y) <= radius) {
          this.effects.spawnBurst(ep.x, ep.y, '#57f2ff', 6, 30, 100, 2.2);
          this.enemyProjectiles.splice(i, 1);
        }
      }

      for (const enemy of this.enemies) {
        const d = dist(src.x, src.y, enemy.x, enemy.y);
        if (d <= radius + enemy.radius) {
          this.applyEnemyDamage(enemy, damage, '#7fe8ff', true);
          const pushAng = Math.atan2(enemy.y - src.y, enemy.x - src.x);
          const knock = enemy.isBoss ? 14 : 46;
          enemy.x += Math.cos(pushAng) * knock;
          enemy.y += Math.sin(pushAng) * knock;
        }
      }
    }
  }

  applyEnemyDamage(enemy, amount, popupColor = '#fff2b2', forcePopup = false) {
    enemy.hp -= amount;
    enemy.hitFlash = 0.09;
    enemy.burnAccum = (enemy.burnAccum || 0) + amount;
    enemy.burnPopTimer = (enemy.burnPopTimer || 0);

    if (forcePopup || enemy.burnPopTimer <= 0) {
      const shown = forcePopup ? Math.round(amount) : Math.round(enemy.burnAccum);
      if (shown >= 4) {
        this.effects.spawnPopup(
          enemy.x + (Math.random() - 0.5) * 14,
          enemy.y - enemy.radius - 10,
          `-${shown}`,
          popupColor,
          forcePopup ? 1.15 : 0.95
        );
      }
      enemy.burnAccum = 0;
      enemy.burnPopTimer = 0.28;
    }
  }

  selectDraft(idx) {
    if (this.screen !== 'DRAFT' || !this.draftChoices[idx]) return;
    const bp = this.draftChoices[idx];
    this.applyBlueprint(bp);
    this.audio.playDraftPick();
    this.screen = 'PLAYING';
    this.hud.setScreen('PLAYING');
    this.beginNight(this.night + 1);
  }

  applyBlueprint(bp) {
    this.ownedRelics[bp.id] = (this.ownedRelics[bp.id] || 0) + 1;
    this.relicCount += 1;

    switch (bp.id) {
      case 'ruby_splitter': {
        const slotIndex = this.ownedRelics.ruby_splitter || 1;
        const pos = slotIndex === 1 ? { x: 640, y: 215 } : { x: 825, y: 460 };
        this.nodes.push({
          id: `ruby_splitter_${slotIndex}`,
          kind: 'splitter',
          x: pos.x,
          y: pos.y,
          angle: Math.PI / 2,
          portable: false,
          carried: false,
          lit: false,
          incomingAngle: null,
          overchargeTimer: 0,
          prismTint: 'crimson',
          scale: 1,
          hitCount: 0,
        });
        break;
      }
      case 'portable_mirror': {
        const count = this.ownedRelics.portable_mirror || 1;
        this.nodes.push({
          id: `mirror_portable_${count + 1}`,
          kind: 'mirror',
          x: 820,
          y: 455,
          angle: -2.4,
          portable: true,
          carried: false,
          lit: false,
          incomingAngle: null,
          overchargeTimer: 0,
          scale: 1.12,
          hitCount: 0,
        });
        break;
      }
      case 'chromatic_dispersion':
        this.mods.bounceBonus += 0.38;
        break;
      case 'solar_concentrator':
        this.mods.baseBeamDps *= 1.32;
        this.mods.beamWidthMult += 0.25;
        break;
      case 'lantern_supercharger':
        this.mods.flareRateMult += 0.3;
        this.mods.flarePierce += 1;
        this.mods.overchargeDuration = 5.0;
        break;
      case 'harmonic_bell':
        this.mods.pulseCooldownMax *= 0.7;
        this.mods.pulseRadiusMult += 0.35;
        break;
      case 'solar_capacitor':
        this.mods.crossfireBonus += 0.5;
        this.mods.capacitorTrigger = true;
        break;
      case 'bastion_runestone':
        this.maxHp += 25;
        this.hp = Math.min(this.maxHp, this.hp + 35);
        this.mods.damageTakenMult *= 0.8;
        break;
      case 'gyro_tracking':
        this.mods.gyroTrack = true;
        this.mods.maxBounces += 1;
        break;
      case 'tidebreaker_lens':
        this.mods.chillSlow = true;
        break;
    }

    const list = Object.entries(this.ownedRelics).map(([id, count]) => {
      const def = BLUEPRINT_CATALOG.find((item) => item.id === id);
      return { id, name: def.name, color: def.color, count };
    });
    this.hud.renderRelicStrip(list);
  }

  finishRun(victory) {
    this.screen = 'RESULTS';
    this.saveBestScore(this.score);
    const rank =
      victory && this.hp >= 75
        ? 'S'
        : victory
          ? 'A'
          : this.nightsCleared >= 4
            ? 'B'
            : 'C';

    this.hud.setScreen('RESULTS');
    this.hud.showResults({
      victory,
      rank,
      score: this.score,
      nightsCleared: this.nightsCleared,
      nightsReached: this.night,
      peakChain: this.peakChain,
      kills: this.kills,
      relicCount: this.relicCount,
      bestScore: this.bestScore,
      mode: this.mode,
    });
  }

  step(dt) {
    this.time += dt;

    if (this.screen === 'TITLE') {
      this.beaconAngle = normalizeAngle(Math.PI / 2 + Math.sin(this.time * 0.9) * 0.11);
      this.optics = solveOpticalNetwork(this.beaconAngle, this.nodes, this.getOpticsOptions());
      return;
    }

    if (this.screen !== 'PLAYING') return;

    if (this.effects.hitstop > 0) {
      this.effects.hitstop = Math.max(0, this.effects.hitstop - dt);
      this.effects.update(dt * 0.25);
      return;
    }

    this.calloutTimer = Math.max(0, this.calloutTimer - dt);

    // 1. Update Keeper Movement & Aim
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.keeper.walkPhase += dt * 1.4;
    }

    this.keeper.vx = mx * this.keeper.speed;
    this.keeper.vy = my * this.keeper.speed;
    const nextPos = clampToBastion(
      this.keeper.x + this.keeper.vx * dt,
      this.keeper.y + this.keeper.vy * dt,
      24
    );
    this.keeper.x = nextPos.x;
    this.keeper.y = nextPos.y;

    // Keep Keeper outside Lighthouse Plinth
    const dBeacon = dist(this.keeper.x, this.keeper.y, BEACON_POS.x, BEACON_POS.y);
    const minKeepDist = BEACON_POS.radius + this.keeper.radius + 8;
    if (dBeacon < minKeepDist && dBeacon > 0.01) {
      const ang = Math.atan2(this.keeper.y - BEACON_POS.y, this.keeper.x - BEACON_POS.x);
      this.keeper.x = BEACON_POS.x + Math.cos(ang) * minKeepDist;
      this.keeper.y = BEACON_POS.y + Math.sin(ang) * minKeepDist;
    }

    this.keeper.aimAngle = Math.atan2(this.mouse.y - this.keeper.y, this.mouse.x - this.keeper.x);
    this.keeper.fireCooldown = Math.max(0, this.keeper.fireCooldown - dt);
    this.keeper.pulseCooldown = Math.max(0, this.keeper.pulseCooldown - dt);
    this.keeper.invulnTimer = Math.max(0, this.keeper.invulnTimer - dt);

    if (this.mouse.downLeft) {
      this.tryFireFlareBolt();
    }

    // Rotate nearest mirror smoothly with Q
    if (this.keys.has('KeyQ')) {
      const near = findNearestNode(this.nodes, this.mouse.x, this.mouse.y, 280);
      if (near) {
        const dir = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? -1 : 1;
        near.angle = normalizeAngle(near.angle + dir * 2.1 * dt);
      }
    }

    // Smoothly sweep Lighthouse Beacon toward cursor
    const targetBeaconAngle = Math.atan2(
      this.mouse.y - BEACON_POS.y,
      this.mouse.x - BEACON_POS.x
    );
    this.beaconAngle = rotateToward(this.beaconAngle, targetBeaconAngle, 3.6 * dt);

    // Tick node overcharge timers & optional gyro tracking
    for (const node of this.nodes) {
      if (node.overchargeTimer > 0) {
        node.overchargeTimer = Math.max(0, node.overchargeTimer - dt);
      }
      if (this.mods.gyroTrack && node.lit && !node.carried && this.enemies.length > 0) {
        let closestEnemy = null;
        let minD = 320;
        for (const e of this.enemies) {
          const d = dist(node.x, node.y, e.x, e.y);
          if (d < minD) {
            minD = d;
            closestEnemy = e;
          }
        }
        if (closestEnemy) {
          const desired = Math.atan2(closestEnemy.y - node.y, closestEnemy.x - node.x);
          if (node.kind === 'splitter') {
            node.angle = rotateToward(node.angle, desired, 0.65 * dt);
          } else if (node.incomingAngle !== null) {
            const bx = -Math.cos(node.incomingAngle) + Math.cos(desired);
            const by = -Math.sin(node.incomingAngle) + Math.sin(desired);
            if (Math.hypot(bx, by) > 0.1) {
              node.angle = rotateToward(node.angle, Math.atan2(by, bx), 0.55 * dt);
            }
          }
        }
      }
    }

    // 2. Solve Real-Time Optical Network
    this.optics = solveOpticalNetwork(this.beaconAngle, this.nodes, this.getOpticsOptions());
    if (this.optics.peakBounce > this.peakChain) {
      this.peakChain = this.optics.peakBounce;
    }

    // 3. Spawn Enemies
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const nextType = this.spawnQueue.shift();
        const spawned = spawnEnemy(nextType, this.night, this.rng);
        this.enemies.push(spawned);
        this.effects.spawnBurst(spawned.x, spawned.y, '#7fe8ff', 8, 25, 80, 2.4);
        if (spawned.isBoss) {
          this.audio.playBossHorn();
          this.effects.addShake(7, 0.3);
        }
        this.spawnTimer = this.spawnInterval;
      }
    }

    // 4. Update Flare Bolts
    for (let i = this.flareBolts.length - 1; i >= 0; i--) {
      const b = this.flareBolts[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.life <= 0 || b.x < -30 || b.x > GAME_WIDTH + 30 || b.y < -30 || b.y > GAME_HEIGHT + 30) {
        this.flareBolts.splice(i, 1);
        continue;
      }

      // Supercharge mirrors/splitters crossed
      for (const node of this.nodes) {
        if (node.carried || b.chargedNodes.has(node.id)) continue;
        if (dist(b.x, b.y, node.x, node.y) <= 28) {
          b.chargedNodes.add(node.id);
          node.overchargeTimer = this.mods.overchargeDuration;
          this.audio.playMirrorClick();
          this.effects.spawnBurst(node.x, node.y, '#ffe885', 8, 35, 110, 2.5);
          this.effects.spawnPopup(node.x, node.y - 26, 'OVERCHARGE!', '#ffe885', 0.9);
        }
      }

      // Hit enemies
      for (const enemy of this.enemies) {
        if (b.hitIds.has(enemy.id)) continue;
        if (dist(b.x, b.y, enemy.x, enemy.y) <= enemy.radius + 7) {
          b.hitIds.add(enemy.id);
          this.applyEnemyDamage(enemy, b.damage, '#ffe885', true);
          this.effects.spawnBurst(b.x, b.y, '#ffd571', 6, 40, 120, 2.2);
          if (b.pierceLeft > 0) {
            b.pierceLeft -= 1;
          } else {
            b.life = 0;
            break;
          }
        }
      }
    }

    // 5. Update Enemies, Beam Damage & AI
    this.updateEnemies(dt);

    // 6. Update Enemy Projectiles & Telegraphs
    this.updateHazards(dt);

    // 7. Purge Dead Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) {
        this.kills += 1;
        this.score += Math.round(e.score * (1 + (this.peakChain - 1) * 0.08));
        this.saveBestScore(this.score);
        this.effects.spawnBurst(e.x, e.y, e.accent, e.isBoss ? 28 : 12, 45, 220, e.isBoss ? 4.2 : 2.8);
        this.effects.spawnScorch(e.x, e.y, e.isBoss ? 36 : 16);
        this.audio.playEnemyPurge(e.isBoss);
        if (e.isBoss) {
          this.effects.addShake(11, 0.35);
          this.effects.addHitstop(0.06);
        } else if (this.mods.capacitorTrigger && this.kills % 6 === 0) {
          this.executeShockwaves(
            [{ x: BEACON_POS.x, y: BEACON_POS.y, color: '#c678ff' }],
            190,
            40
          );
        }
        this.enemies.splice(i, 1);
      }
    }

    this.effects.update(dt);

    // 8. Check Defeat or Night Completion
    if (this.hp <= 0) {
      this.hp = 0;
      this.finishRun(false);
      return;
    }

    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.nightsCleared = this.night;
      this.score += 180 * this.night;
      this.saveBestScore(this.score);

      if (this.mode === 'vigil' && this.night >= 7) {
        this.finishRun(true);
        return;
      }

      this.draftChoices = rollDraftChoices(this.rng, this.ownedRelics);
      this.screen = 'DRAFT';
      this.hud.setScreen('DRAFT');
      this.hud.renderDraft(this.night, this.draftChoices, (idx) => this.selectDraft(idx));
    }
  }

  updateEnemies(dt) {
    const sirens = this.enemies.filter((e) => e.type === 'siren');

    for (const e of this.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      e.burnPopTimer = Math.max(0, (e.burnPopTimer || 0) - dt);
      e.litThisFrame = false;
      e.beamHits = 0;

      // Check optical ray hits
      let rayPowerSum = 0;
      let maxBounceHit = 0;
      for (const seg of this.optics.segments) {
        const hitDist = pointToSegmentDistance(e.x, e.y, seg.x1, seg.y1, seg.x2, seg.y2);
        if (hitDist <= e.radius + 9 * (seg.widthScale || 1)) {
          e.litThisFrame = true;
          e.beamHits += 1;
          maxBounceHit = Math.max(maxBounceHit, seg.bounce);
          rayPowerSum += seg.power * (1 + seg.bounce * (0.22 + this.mods.bounceBonus));
        }
      }

      if (e.litThisFrame) {
        if (this.mods.chillSlow) e.slowTimer = 0.65;
        let crossfireMult = 1 + (e.beamHits - 1) * (0.65 + this.mods.crossfireBonus);
        let shroudMult = 1.0;
        if (e.type !== 'siren') {
          for (const s of sirens) {
            if (dist(e.x, e.y, s.x, s.y) < 112) {
              shroudMult = 0.72;
              break;
            }
          }
        }
        const weakMult = e.shadowWeakness || 1.0;
        const dps = this.mods.baseBeamDps * rayPowerSum * crossfireMult * weakMult * shroudMult;
        this.applyEnemyDamage(
          e,
          dps * dt,
          e.beamHits >= 2 ? '#57f2ff' : maxBounceHit > 0 ? '#ffd571' : '#fff4c2',
          false
        );
        if (Math.random() < 0.28) {
          this.effects.spawnBeamSpark(e.x, e.y, e.beamHits >= 2 ? '#57f2ff' : '#ffd571');
        }
        this.audio.playScorchTick();
      }

      // Movement & Archetype AI
      const speedMult = e.slowTimer > 0 ? 0.6 : 1.0;
      let targetX = BEACON_POS.x;
      let targetY = BEACON_POS.y;

      if (e.type === 'stalker') {
        targetX = this.keeper.x;
        targetY = this.keeper.y;
      } else if (e.type === 'mortar') {
        targetX = e.anchorPoint.x;
        targetY = e.anchorPoint.y;
        e.actionTimer -= dt;
        if (e.actionTimer <= 0 && dist(e.x, e.y, e.anchorPoint.x, e.anchorPoint.y) < 42) {
          e.actionTimer = 3.2;
          this.telegraphs.push({
            x: this.keeper.x + (Math.random() - 0.5) * 32,
            y: this.keeper.y + (Math.random() - 0.5) * 32,
            radius: 52,
            timer: 1.35,
            duration: 1.35,
            damage: 14,
          });
        }
      } else if (e.type === 'siren') {
        const ang = Math.atan2(e.y - BEACON_POS.y, e.x - BEACON_POS.x) + 0.55 * dt;
        targetX = BEACON_POS.x + Math.cos(ang) * 235;
        targetY = BEACON_POS.y + Math.sin(ang) * 145;
      } else if (e.isBoss) {
        this.updateBossBehavior(e, dt);
      }

      const dTarget = dist(e.x, e.y, targetX, targetY);
      if (dTarget > 6) {
        const ang = Math.atan2(targetY - e.y, targetX - e.x);
        e.vx = Math.cos(ang) * e.speed * speedMult;
        e.vy = Math.sin(ang) * e.speed * speedMult;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else {
        e.vx = 0;
        e.vy = 0;
      }

      // Collision vs Keeper
      if (
        this.keeper.invulnTimer <= 0 &&
        dist(e.x, e.y, this.keeper.x, this.keeper.y) < e.radius + this.keeper.radius
      ) {
        this.damageBastion(e.damage);
        this.keeper.invulnTimer = 0.75;
        const pushAng = Math.atan2(this.keeper.y - e.y, this.keeper.x - e.x);
        this.keeper.x += Math.cos(pushAng) * 22;
        this.keeper.y += Math.sin(pushAng) * 22;
      }

      // Collision vs Central Beacon Plinth
      if (dist(e.x, e.y, BEACON_POS.x, BEACON_POS.y) < e.radius + BEACON_POS.radius + 8) {
        this.damageBastion(e.damage);
        if (e.isBoss) {
          const backAng = Math.atan2(e.y - BEACON_POS.y, e.x - BEACON_POS.x);
          e.x = BEACON_POS.x + Math.cos(backAng) * 130;
          e.y = BEACON_POS.y + Math.sin(backAng) * 130;
        } else {
          e.hp = 0;
        }
      }
    }
  }

  updateBossBehavior(boss, dt) {
    const hpRatio = boss.hp / boss.maxHp;
    if (boss.type === 'reaver') {
      if (hpRatio <= 0.5 && !boss.hasSummonedPhase2) {
        boss.hasSummonedPhase2 = true;
        boss.phase = 2;
        boss.speed *= 1.3;
        this.effects.spawnRing(boss.x, boss.y, 120, '#ff587a', 4, 0.45);
        this.enemies.push(spawnEnemy('stalker', this.night, this.rng));
        this.enemies.push(spawnEnemy('stalker', this.night, this.rng));
      }
      boss.actionTimer -= dt;
      if (boss.actionTimer <= 0) {
        boss.actionTimer = boss.phase === 2 ? 2.1 : 2.9;
        this.telegraphs.push({
          x: this.keeper.x,
          y: this.keeper.y,
          radius: 82,
          timer: 1.25,
          duration: 1.25,
          damage: 18,
        });
        const aim = Math.atan2(this.keeper.y - boss.y, this.keeper.x - boss.x);
        for (const off of [-0.25, 0, 0.25]) {
          this.enemyProjectiles.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(aim + off) * 215,
            vy: Math.sin(aim + off) * 215,
            radius: 7,
            damage: 12,
            life: 3.2,
          });
        }
      }
    } else if (boss.type === 'sovereign') {
      if (hpRatio <= 0.66 && !boss.hasSummonedPhase2) {
        boss.hasSummonedPhase2 = true;
        boss.phase = 2;
        this.effects.spawnRing(boss.x, boss.y, 150, '#ff63b1', 4.5, 0.5);
        this.enemies.push(spawnEnemy('siren', this.night, this.rng));
        this.enemies.push(spawnEnemy('stalker', this.night, this.rng));
      }
      if (hpRatio <= 0.33 && !boss.hasSummonedPhase3) {
        boss.hasSummonedPhase3 = true;
        boss.phase = 3;
        boss.speed *= 1.25;
        this.effects.spawnRing(boss.x, boss.y, 180, '#ffd571', 5, 0.55);
        this.enemies.push(spawnEnemy('crawler', this.night, this.rng));
        this.enemies.push(spawnEnemy('stalker', this.night, this.rng));
      }

      boss.actionTimer -= dt;
      if (boss.actionTimer <= 0) {
        boss.actionTimer = boss.phase === 3 ? 1.7 : boss.phase === 2 ? 2.15 : 2.65;
        this.telegraphs.push({
          x: this.keeper.x,
          y: this.keeper.y,
          radius: 88,
          timer: 1.2,
          duration: 1.2,
          damage: 20,
        });
        const count = boss.phase === 3 ? 7 : 5;
        const aim = Math.atan2(this.keeper.y - boss.y, this.keeper.x - boss.x);
        for (let k = 0; k < count; k++) {
          const ang = aim + (k - (count - 1) * 0.5) * 0.22;
          this.enemyProjectiles.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(ang) * 235,
            vy: Math.sin(ang) * 235,
            radius: 7.5,
            damage: 14,
            life: 3.4,
          });
        }
      }
    }
  }

  updateHazards(dt) {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tel = this.telegraphs[i];
      tel.timer -= dt;
      if (tel.timer <= 0) {
        this.effects.spawnRing(tel.x, tel.y, tel.radius, '#ff587a', 3.5, 0.32);
        this.effects.spawnBurst(tel.x, tel.y, '#ff7a98', 12, 40, 140, 2.8);
        if (
          this.keeper.invulnTimer <= 0 &&
          dist(tel.x, tel.y, this.keeper.x, this.keeper.y) <= tel.radius
        ) {
          this.damageBastion(tel.damage);
          this.keeper.invulnTimer = 0.7;
        }
        this.telegraphs.splice(i, 1);
      }
    }

    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.life -= dt;
      ep.x += ep.vx * dt;
      ep.y += ep.vy * dt;
      if (
        ep.life <= 0 ||
        ep.x < -30 ||
        ep.x > GAME_WIDTH + 30 ||
        ep.y < -30 ||
        ep.y > GAME_HEIGHT + 30
      ) {
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (
        this.keeper.invulnTimer <= 0 &&
        dist(ep.x, ep.y, this.keeper.x, this.keeper.y) <= ep.radius + this.keeper.radius
      ) {
        this.damageBastion(ep.damage);
        this.keeper.invulnTimer = 0.65;
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  damageBastion(rawAmount) {
    const dmg = Math.max(1, Math.round(rawAmount * this.mods.damageTakenMult));
    this.hp = Math.max(0, this.hp - dmg);
    this.audio.playWardHit();
    this.effects.addShake(8, 0.22);
    this.effects.spawnPopup(this.keeper.x, this.keeper.y - 24, `-${dmg} WARD`, '#ff6b8d', 1.15);
  }

  computeContextHint() {
    if (this.keeper.carryingNodeId) {
      return 'Carrying Portable Mirror — Press [E] to drop & aim toward cursor';
    }
    const nearPortable = findNearestNode(
      this.nodes,
      this.keeper.x,
      this.keeper.y,
      96,
      (n) => n.portable
    );
    if (nearPortable) {
      return 'Press [E] to pick up Portable Mirror · [RMB] or [Q] to aim nearest mirror';
    }
    return '';
  }

  syncHud() {
    if (this.screen !== 'PLAYING' && this.screen !== 'PAUSED') return;
    const boss = this.enemies.find((e) => e.isBoss) || null;
    this.hud.updatePlayHud({
      hp: this.hp,
      maxHp: this.maxHp,
      pulseCooldown: this.keeper.pulseCooldown,
      pulseMaxCooldown: this.mods.pulseCooldownMax,
      mode: this.mode,
      night: this.night,
      remaining: this.spawnQueue.length + this.enemies.length,
      score: this.score,
      peakChain: this.peakChain,
      mirrorCount: this.nodes.length,
      boss,
      calloutTimer: this.calloutTimer,
      calloutKicker: this.calloutKicker,
      calloutTitle: this.calloutTitle,
      hintText: this.computeContextHint(),
    });
  }

  loop = (timestamp) => {
    if (!this.lastFrameTs) this.lastFrameTs = timestamp;
    const rawDt = Math.min(0.1, (timestamp - this.lastFrameTs) / 1000);
    this.lastFrameTs = timestamp;

    this.accumulator += rawDt;
    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    const hovered = findNearestNode(this.nodes, this.mouse.x, this.mouse.y, 260);
    this.renderer.render({
      time: this.time,
      keeper: this.screen === 'TITLE' ? null : this.keeper,
      nodes: this.nodes,
      enemies: this.enemies,
      flareBolts: this.flareBolts,
      enemyProjectiles: this.enemyProjectiles,
      telegraphs: this.telegraphs,
      optics: this.optics,
      effects: this.effects,
      beaconAngle: this.beaconAngle,
      hoveredNodeId: hovered ? hovered.id : null,
    });
    this.syncHud();
    requestAnimationFrame(this.loop);
  };

  start() {
    requestAnimationFrame(this.loop);
  }

  exposeApi() {
    window.__PRISMHARBOR__ = {
      getState: () => ({
        screen: this.screen,
        mode: this.mode,
        night: this.night,
        hp: this.hp,
        score: this.score,
        peakChain: this.peakChain,
        enemies: this.enemies.length,
        beams: this.optics.segments.length,
      }),
      forceStageForPreview: (stage) => {
        if (stage === 'boss_combat') {
          this.startNewRun();
          this.beginNight(4);
          this.calloutTimer = 0;
          this.spawnQueue.length = 0;
          this.applyBlueprint(BLUEPRINT_CATALOG[0]);
          this.applyBlueprint(BLUEPRINT_CATALOG[2]);
          this.applyBlueprint(BLUEPRINT_CATALOG[5]);
          const boss = spawnEnemy('reaver', 4, this.rng);
          boss.x = 845;
          boss.y = 335;
          boss.hp = Math.round(boss.maxHp * 0.58);
          const c1 = spawnEnemy('crawler', 4, this.rng);
          c1.x = 775;
          c1.y = 445;
          const c2 = spawnEnemy('stalker', 4, this.rng);
          c2.x = 500;
          c2.y = 290;
          const m1 = spawnEnemy('mortar', 4, this.rng);
          m1.x = 410;
          m1.y = 415;
          this.enemies = [boss, c1, c2, m1];
          const ruby = this.nodes.find((n) => n.id === 'ruby_splitter_1');
          if (ruby) {
            ruby.x = 640;
            ruby.y = 220;
            ruby.angle = 0.25;
            ruby.overchargeTimer = 3.0;
          }
          const mNe = this.nodes.find((n) => n.id === 'mirror_ne');
          if (mNe) {
            mNe.angle = 2.05;
            mNe.overchargeTimer = 3.0;
          }
          this.mouse.x = 640;
          this.mouse.y = 492;
          this.beaconAngle = Math.PI / 2;
          this.keeper.x = 540;
          this.keeper.y = 405;
          this.score = 3420;
          this.kills = 48;
          this.telegraphs.push({ x: 480, y: 365, radius: 74, timer: 0.6, duration: 1.25, damage: 18 });
          this.triggerResonancePulse();
          for (let k = 0; k < 5; k++) this.step(FIXED_DT);
          this.effects.spawnPopup(boss.x, boss.y - 54, '-184', '#57f2ff', 1.25);
          this.effects.spawnPopup(c1.x, c1.y - 26, '-92', '#ffd571', 1.05);
        } else if (stage === 'draft') {
          this.draftChoices = [BLUEPRINT_CATALOG[0], BLUEPRINT_CATALOG[2], BLUEPRINT_CATALOG[5]];
          this.screen = 'DRAFT';
          this.hud.setScreen('DRAFT');
          this.hud.renderDraft(4, this.draftChoices, (idx) => this.selectDraft(idx));
          this.step(FIXED_DT);
        } else if (stage === 'victory') {
          this.nightsCleared = 7;
          this.night = 7;
          this.score = 12840;
          this.kills = 142;
          this.peakChain = 5;
          this.relicCount = 6;
          this.hp = 88;
          this.finishRun(true);
        }
      },
    };
  }
}

const game = new PrismharborGame();
game.start();
