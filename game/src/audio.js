/**
 * Zero-dependency procedural Web Audio API synthesizer for responsive combat,
 * polarity shifting, harmonic orb chaining, and boss alerts.
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.lastShotAt = 0;
    this.lastZapAt = 0;
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.26;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.26, this.ctx.currentTime);
    }
    return this.muted;
  }

  _tone({ type = 'sine', freq = 440, endFreq = null, duration = 0.12, gain = 0.3, delay = 0 }) {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env);
    env.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playShot(polarity) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastShotAt < 0.06) return;
    this.lastShotAt = t;
    const base = polarity === 'cyan' ? 760 : 540;
    this._tone({ type: 'triangle', freq: base, endFreq: base * 0.42, duration: 0.075, gain: 0.18 });
  }

  playShift(polarity) {
    const start = polarity === 'cyan' ? 420 : 640;
    const end = polarity === 'cyan' ? 840 : 480;
    this._tone({ type: 'sine', freq: start, endFreq: end, duration: 0.11, gain: 0.28 });
    this._tone({ type: 'triangle', freq: end * 1.25, endFreq: end * 1.5, duration: 0.08, gain: 0.15, delay: 0.03 });
  }

  playAbsorb(combo = 1) {
    const step = Math.min(combo, 12);
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66];
    const root = scale[step % scale.length] * (step >= 8 ? 1.25 : 1);
    this._tone({ type: 'sine', freq: root, endFreq: root * 1.5, duration: 0.14, gain: 0.28 });
    this._tone({ type: 'triangle', freq: root * 1.25, endFreq: root * 2, duration: 0.16, gain: 0.14, delay: 0.03 });
  }

  playChainZap() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastZapAt < 0.07) return;
    this.lastZapAt = t;
    this._tone({ type: 'sawtooth', freq: 1120, endFreq: 340, duration: 0.09, gain: 0.16 });
  }

  playKill(isHeavy = false) {
    this._tone({
      type: 'sawtooth',
      freq: isHeavy ? 260 : 380,
      endFreq: 75,
      duration: isHeavy ? 0.26 : 0.14,
      gain: isHeavy ? 0.34 : 0.22,
    });
    this._tone({
      type: 'triangle',
      freq: isHeavy ? 620 : 780,
      endFreq: 180,
      duration: 0.12,
      gain: 0.16,
    });
  }

  playDash() {
    this._tone({ type: 'sine', freq: 290, endFreq: 920, duration: 0.14, gain: 0.28 });
    this._tone({ type: 'triangle', freq: 620, endFreq: 210, duration: 0.16, gain: 0.16, delay: 0.03 });
  }

  playNova() {
    this._tone({ type: 'sawtooth', freq: 140, endFreq: 60, duration: 0.48, gain: 0.42 });
    this._tone({ type: 'sine', freq: 520, endFreq: 1240, duration: 0.36, gain: 0.28 });
    this._tone({ type: 'triangle', freq: 880, endFreq: 220, duration: 0.42, gain: 0.22, delay: 0.06 });
  }

  playHit() {
    this._tone({ type: 'sawtooth', freq: 180, endFreq: 55, duration: 0.22, gain: 0.42 });
    this._tone({ type: 'square', freq: 120, endFreq: 45, duration: 0.18, gain: 0.26, delay: 0.02 });
  }

  playBossAlert() {
    for (let i = 0; i < 3; i++) {
      this._tone({ type: 'sawtooth', freq: 220, endFreq: 330, duration: 0.16, gain: 0.28, delay: i * 0.2 });
    }
  }

  playUpgrade() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this._tone({ type: 'triangle', freq: n, endFreq: n * 1.03, duration: 0.14, gain: 0.22, delay: idx * 0.055 });
    });
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this._tone({ type: 'sine', freq: n, endFreq: n, duration: 0.26, gain: 0.25, delay: idx * 0.08 });
    });
  }
}
