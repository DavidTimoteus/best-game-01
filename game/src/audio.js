export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastScorchTime = 0;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return !this.muted;
  }

  playTone(freq, endFreq, duration, type = 'sine', gainVal = 0.08, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(gainVal, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  playFlareBolt() {
    this.playTone(720, 310, 0.11, 'triangle', 0.07);
    this.playTone(1240, 680, 0.07, 'sine', 0.035);
  }

  playMirrorClick() {
    this.playTone(980, 1420, 0.09, 'sine', 0.065);
    this.playTone(540, 740, 0.08, 'triangle', 0.04);
  }

  playMirrorPlace() {
    this.playTone(320, 520, 0.14, 'triangle', 0.08);
    this.playTone(880, 1320, 0.12, 'sine', 0.05, 0.03);
  }

  playResonancePulse(nodeCount = 1) {
    this.playTone(220, 110, 0.42, 'sawtooth', 0.07);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const count = Math.min(notes.length, Math.max(2, nodeCount));
    for (let i = 0; i < count; i++) {
      this.playTone(notes[i], notes[i] * 1.02, 0.36, 'sine', 0.055, i * 0.045);
    }
  }

  playEnemyPurge(isBoss = false) {
    if (isBoss) {
      this.playTone(180, 48, 0.65, 'sawtooth', 0.14);
      this.playTone(440, 880, 0.45, 'sine', 0.09, 0.05);
      return;
    }
    this.playTone(460, 190, 0.14, 'triangle', 0.06);
    this.playTone(860, 1280, 0.1, 'sine', 0.035);
  }

  playScorchTick() {
    const now = performance.now();
    if (now - this.lastScorchTime < 140) return;
    this.lastScorchTime = now;
    this.playTone(320 + Math.random() * 140, 220, 0.055, 'sine', 0.02);
  }

  playBossHorn() {
    this.playTone(110, 82, 0.65, 'sawtooth', 0.11);
    this.playTone(164.8, 130, 0.62, 'triangle', 0.08, 0.05);
  }

  playWardHit() {
    this.playTone(145, 58, 0.22, 'sawtooth', 0.11);
  }

  playDraftPick() {
    this.playTone(587.33, 880, 0.18, 'sine', 0.075);
    this.playTone(880, 1174.66, 0.24, 'triangle', 0.06, 0.06);
  }
}
