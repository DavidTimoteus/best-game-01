export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, endFreq, duration, type = 'triangle', gainPeak = 0.14, delay = 0) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playShoot(heavy = false) {
    this.playTone(heavy ? 420 : 620, heavy ? 170 : 260, heavy ? 0.14 : 0.09, 'triangle', heavy ? 0.14 : 0.09);
    this.playTone(heavy ? 840 : 1120, 480, 0.06, 'sine', 0.05);
  }

  playHit(isCrit = false) {
    this.playTone(isCrit ? 340 : 220, 95, 0.08, 'sawtooth', isCrit ? 0.12 : 0.08);
  }

  playParry() {
    this.playTone(784, 1568, 0.22, 'sine', 0.18, 0);
    this.playTone(1174, 1760, 0.24, 'triangle', 0.12, 0.03);
  }

  playDash() {
    this.playTone(320, 110, 0.14, 'sine', 0.12);
  }

  playNova() {
    this.playTone(220, 660, 0.28, 'sawtooth', 0.14, 0);
    this.playTone(523.25, 1046.5, 0.34, 'triangle', 0.14, 0.04);
  }

  playHurt() {
    this.playTone(170, 58, 0.24, 'sawtooth', 0.18);
  }

  playKill() {
    this.playTone(440, 660, 0.12, 'triangle', 0.1);
  }

  playWaveClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.01, 0.22, 'triangle', 0.12, idx * 0.07);
    });
  }

  playBossHorn() {
    this.playTone(110, 82, 0.65, 'sawtooth', 0.17, 0);
    this.playTone(164.8, 123.5, 0.6, 'triangle', 0.13, 0.05);
  }

  playDraftPick() {
    this.playTone(587.33, 880, 0.18, 'sine', 0.13, 0);
    this.playTone(880, 1174.66, 0.22, 'triangle', 0.12, 0.06);
  }
}
