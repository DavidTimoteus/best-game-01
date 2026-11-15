// Fixed-Step Simulation World & Wave Orchestrator
import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  POLARITY_CYAN,
  POLARITY_AMBER,
  COLOR_CYAN,
  COLOR_AMBER,
  COLOR_MAGENTA,
  STATE_TITLE,
  STATE_PLAY,
  STATE_VICTORY,
  STATE_GAMEOVER,
} from './config.js';
import { Player, EnergyNode, HazardBarrier, SingularityNexusBoss } from './entities.js';
import { ParticleSystem } from './particles.js';
import { sound } from './audio.js';

export class World {
  constructor() {
    this.player = new Player();
    this.particles = new ParticleSystem();
    this.nodes = [];
    this.barriers = [];
    this.boss = null;
    this.state = STATE_TITLE;
    this.sector = 1;
    this.maxSectors = 4;
    this.waveTimer = 0;
    this.survivalTime = 0;
    this.nodesSpawned = 0;
    this.nodesAbsorbed = 0;
    this.accuracy = 100;
  }

  reset() {
    this.player.reset();
    this.particles.reset();
    this.nodes = [];
    this.barriers = [];
    this.boss = null;
    this.state = STATE_PLAY;
    this.sector = 1;
    this.waveTimer = 0;
    this.survivalTime = 0;
    this.nodesSpawned = 0;
    this.nodesAbsorbed = 0;
    this.accuracy = 100;
    this.initSector(1);
  }

  initSector(sector) {
    this.sector = sector;
    this.nodes = [];
    this.barriers = [];
    this.boss = null;
    this.waveTimer = 0;

    if (sector === 1) {
      // Harmonic Flux: 12 nodes, 2 slow barriers
      for (let i = 0; i < 14; i++) {
        const pol = i % 2 === 0 ? POLARITY_CYAN : POLARITY_AMBER;
        const x = 150 + Math.random() * (VIEW_WIDTH - 300);
        const y = 80 + Math.random() * (VIEW_HEIGHT - 160);
        const vx = (Math.random() - 0.5) * 60;
        const vy = (Math.random() - 0.5) * 60;
        this.nodes.push(new EnergyNode(x, y, pol, vx, vy));
        this.nodesSpawned++;
      }
      this.barriers.push(new HazardBarrier(400, 360, 0, 160, POLARITY_CYAN, 0.6));
      this.barriers.push(new HazardBarrier(880, 360, Math.PI / 2, 160, POLARITY_AMBER, -0.6));
    } else if (sector === 2) {
      // Lattice Overdrive: 18 nodes, rotating perimeter barriers
      for (let i = 0; i < 18; i++) {
        const pol = i % 2 === 0 ? POLARITY_CYAN : POLARITY_AMBER;
        const x = 120 + Math.random() * (VIEW_WIDTH - 240);
        const y = 80 + Math.random() * (VIEW_HEIGHT - 160);
        this.nodes.push(new EnergyNode(x, y, pol, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90));
        this.nodesSpawned++;
      }
      this.barriers.push(new HazardBarrier(640, 200, 0, 200, POLARITY_CYAN, 0.9));
      this.barriers.push(new HazardBarrier(640, 520, Math.PI / 2, 200, POLARITY_AMBER, -0.9));
      this.barriers.push(new HazardBarrier(320, 360, 0.5, 140, 2, 1.2)); // Neutral magenta
    } else if (sector === 3) {
      // Quantum Resonance: High density, fast pacing
      for (let i = 0; i < 22; i++) {
        const pol = i % 2 === 0 ? POLARITY_CYAN : POLARITY_AMBER;
        const x = 100 + Math.random() * (VIEW_WIDTH - 200);
        const y = 70 + Math.random() * (VIEW_HEIGHT - 140);
        this.nodes.push(new EnergyNode(x, y, pol, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120));
        this.nodesSpawned++;
      }
      this.barriers.push(new HazardBarrier(450, 280, 0, 180, POLARITY_CYAN, 1.1));
      this.barriers.push(new HazardBarrier(830, 440, Math.PI / 3, 180, POLARITY_AMBER, -1.1));
      this.barriers.push(new HazardBarrier(640, 360, 0, 240, 2, 0.8));
    } else if (sector === 4) {
      // Singularity Breach: Singularity Nexus Boss encounter
      this.boss = new SingularityNexusBoss(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
      for (let i = 0; i < 16; i++) {
        const pol = i % 2 === 0 ? POLARITY_CYAN : POLARITY_AMBER;
        const angle = (i * Math.PI * 2) / 16;
        const dist = 240;
        const x = VIEW_WIDTH / 2 + Math.cos(angle) * dist;
        const y = VIEW_HEIGHT / 2 + Math.sin(angle) * dist;
        this.nodes.push(new EnergyNode(x, y, pol, -Math.sin(angle) * 70, Math.cos(angle) * 70));
        this.nodesSpawned++;
      }
    }
  }

  update(dt, input) {
    if (this.state !== STATE_PLAY) return;

    this.survivalTime += dt;
    this.waveTimer += dt;
    this.player.update(dt, input);
    this.particles.update(dt);

    if (this.boss) this.boss.update(dt);

    // Update nodes and check bounds
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      n.update(dt);
      if (n.x < 30 || n.x > VIEW_WIDTH - 30) n.vx *= -1;
      if (n.y < 30 || n.y > VIEW_HEIGHT - 30) n.vy *= -1;
    }

    // Update barriers
    for (let i = 0; i < this.barriers.length; i++) {
      this.barriers[i].update(dt);
    }

    // Check Player <-> Node collisions
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dist = Math.hypot(this.player.x - n.x, this.player.y - n.y);
      if (dist < this.player.radius + n.radius) {
        if (this.player.polarity === n.polarity || this.player.isDashing) {
          // Matching polarity or dashing: Absorption!
          this.player.combo++;
          const pts = 100 * this.player.combo;
          this.player.score += pts;
          this.player.shield = Math.min(100, this.player.shield + 4);
          this.player.absorbedCount++;
          this.nodesAbsorbed++;

          const pColor = n.polarity === POLARITY_CYAN ? COLOR_CYAN : COLOR_AMBER;
          this.particles.emit(n.x, n.y, 16, pColor, 180, 0.45);
          sound.playAbsorb(this.player.combo);
          this.nodes.splice(i, 1);
        } else {
          // Mismatched polarity: Shield breach!
          this.player.combo = 0;
          this.player.shield -= 18;
          this.particles.emitShockwave(this.player.x, this.player.y, COLOR_MAGENTA);
          sound.playHit();

          if (this.player.shield <= 0) {
            this.state = STATE_GAMEOVER;
            return;
          }
        }
      }
    }

    // Check Player <-> Barrier collisions
    for (let i = 0; i < this.barriers.length; i++) {
      const b = this.barriers[i];
      const hx = Math.cos(b.angle) * (b.length / 2);
      const hy = Math.sin(b.angle) * (b.length / 2);

      // Distance from player point to barrier line segment
      const x1 = b.x - hx;
      const y1 = b.y - hy;
      const x2 = b.x + hx;
      const y2 = b.y + hy;

      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      const t = Math.max(0, Math.min(1, ((this.player.x - x1) * (x2 - x1) + (this.player.y - y1) * (y2 - y1)) / l2));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      const dist = Math.hypot(this.player.x - projX, this.player.y - projY);

      if (dist < this.player.radius + 6) {
        if (!this.player.isDashing && b.polarity !== this.player.polarity) {
          this.player.combo = 0;
          this.player.shield -= 25 * dt;
          this.particles.emit(projX, projY, 2, COLOR_MAGENTA, 120, 0.2);
          if (this.player.shield <= 0) {
            this.state = STATE_GAMEOVER;
            return;
          }
        }
      }
    }

    // Boss Interaction
    if (this.boss) {
      const bDist = Math.hypot(this.player.x - this.boss.x, this.player.y - this.boss.y);
      if (bDist < this.player.radius + this.boss.radius) {
        if (this.player.isDashing) {
          this.boss.shield -= 15;
          this.particles.emitShockwave(this.boss.x, this.boss.y, COLOR_CYAN);
          if (this.boss.shield <= 0) {
            this.player.score += 10000;
            this.state = STATE_VICTORY;
            return;
          }
        } else {
          this.player.shield -= 30 * dt;
          if (this.player.shield <= 0) {
            this.state = STATE_GAMEOVER;
            return;
          }
        }
      }
    }

    // Check Sector Progression
    if (this.nodes.length === 0 && !this.boss) {
      if (this.sector < this.maxSectors) {
        this.initSector(this.sector + 1);
      } else {
        this.state = STATE_VICTORY;
      }
    }

    // Accuracy
    if (this.nodesSpawned > 0) {
      this.accuracy = Math.round((this.nodesAbsorbed / this.nodesSpawned) * 100);
    }
  }
}
