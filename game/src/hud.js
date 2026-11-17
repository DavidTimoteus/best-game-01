import { renderRelicSvg } from './upgrades.js';

export class HudController {
  constructor(handlers) {
    this.handlers = handlers;
    this.el = {
      combatHud: document.getElementById('combat-hud'),
      hearts: document.getElementById('hud-hearts'),
      dashChip: document.getElementById('ability-dash'),
      dashFill: document.getElementById('dash-fill'),
      novaChip: document.getElementById('ability-nova'),
      novaFill: document.getElementById('nova-fill'),
      waveTitle: document.getElementById('hud-wave-title'),
      waveBar: document.getElementById('hud-wave-bar'),
      enemiesLeft: document.getElementById('hud-enemies-left'),
      score: document.getElementById('hud-score'),
      combo: document.getElementById('hud-combo'),
      amber: document.getElementById('hud-amber'),
      relics: document.getElementById('hud-relics'),
      muteBtn: document.getElementById('btn-mute'),
      bossBanner: document.getElementById('boss-banner'),
      bossName: document.getElementById('boss-name'),
      bossPhase: document.getElementById('boss-phase'),
      bossHpFill: document.getElementById('boss-hp-fill'),
      titleOverlay: document.getElementById('title-overlay'),
      draftOverlay: document.getElementById('draft-overlay'),
      draftWaveBadge: document.getElementById('draft-wave-badge'),
      draftCards: document.getElementById('draft-cards'),
      pauseOverlay: document.getElementById('pause-overlay'),
      resultsOverlay: document.getElementById('results-overlay'),
      resultsSeal: document.getElementById('results-seal'),
      resultsEyebrow: document.getElementById('results-eyebrow'),
      resultsTitle: document.getElementById('results-title'),
      resScore: document.getElementById('res-score'),
      resWaves: document.getElementById('res-waves'),
      resKills: document.getElementById('res-kills'),
      resParries: document.getElementById('res-parries'),
      resCombo: document.getElementById('res-combo'),
      resTime: document.getElementById('res-time'),
      resRelics: document.getElementById('res-relics'),
    };

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btn-start').addEventListener('click', () => this.handlers.onStart());
    document.getElementById('btn-resume').addEventListener('click', () => this.handlers.onResume());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.handlers.onRestart());
    document.getElementById('btn-restart').addEventListener('click', () => this.handlers.onRestart());
    document.getElementById('btn-menu').addEventListener('click', () => this.handlers.onTitle());
    this.el.muteBtn.addEventListener('click', () => this.handlers.onToggleMute());

    document.querySelectorAll('.diff-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.handlers.onDifficultyChange(btn.dataset.diff);
      });
    });
  }

  setMuteLabel(muted) {
    this.el.muteBtn.textContent = muted ? 'SFX OFF' : 'SFX ON';
  }

  setMode(mode) {
    this.el.titleOverlay.classList.toggle('hidden', mode !== 'TITLE');
    this.el.draftOverlay.classList.toggle('hidden', mode !== 'DRAFT');
    this.el.pauseOverlay.classList.toggle('hidden', mode !== 'PAUSED');
    this.el.resultsOverlay.classList.toggle('hidden', mode !== 'RESULTS');
    this.el.combatHud.classList.toggle('hidden', mode === 'TITLE' || mode === 'RESULTS');
    if (mode !== 'PLAYING') {
      this.el.bossBanner.classList.add('hidden');
    }
  }

  updateCombatHud(snapshot) {
    const { player, waveIndex, totalWaves, waveLabel, waveRemaining, waveTotal, score, combo, amber, relics, boss } = snapshot;

    // Hearts
    let heartsHtml = '';
    for (let i = 0; i < player.maxHp; i++) {
      heartsHtml += `<span class="heart-pip ${i < player.hp ? '' : 'empty'}"></span>`;
    }
    this.el.hearts.innerHTML = heartsHtml;

    // Ability cooldown meters
    const dashPct = 1 - Math.min(1, player.dashCooldown / player.dashCooldownMax);
    const novaPct = 1 - Math.min(1, player.novaCooldown / player.novaCooldownMax);
    this.el.dashFill.style.width = `${Math.round(dashPct * 100)}%`;
    this.el.novaFill.style.width = `${Math.round(novaPct * 100)}%`;
    this.el.dashChip.classList.toggle('ready', dashPct >= 0.99);
    this.el.novaChip.classList.toggle('ready', novaPct >= 0.99);

    // Wave status
    this.el.waveTitle.textContent = `WAVE ${waveIndex} / ${totalWaves} · ${waveLabel}`;
    const progressPct = waveTotal > 0 ? Math.max(0, Math.min(100, (waveRemaining / waveTotal) * 100)) : 0;
    this.el.waveBar.style.width = `${progressPct}%`;
    this.el.enemiesLeft.textContent = `${waveRemaining} FOE${waveRemaining === 1 ? '' : 'S'} REMAINING`;

    // Score & Combo
    this.el.score.textContent = String(Math.floor(score)).padStart(5, '0');
    this.el.combo.textContent = `x${combo.toFixed(1)}`;
    this.el.amber.textContent = String(amber);

    // Mini relic strip
    this.el.relics.innerHTML = relics
      .map((r) => `<span class="mini-relic-badge" title="${r.name}">${renderRelicSvg(r.glyph)}</span>`)
      .join('');

    // Boss bar
    if (boss) {
      this.el.bossBanner.classList.remove('hidden');
      this.el.bossName.textContent = snapshot.bossTitle || 'ARCHON KRONOS, THE ECLIPSE ENGINE';
      this.el.bossPhase.textContent = boss.phase === 2 ? 'PHASE II · ECLIPSE' : 'PHASE I';
      this.el.bossHpFill.style.width = `${Math.max(0, Math.round((boss.hp / boss.maxHp) * 100))}%`;
    } else {
      this.el.bossBanner.classList.add('hidden');
    }
  }

  showDraftChoices(waveCleared, choices, onSelect) {
    this.el.draftWaveBadge.textContent = `WAVE ${waveCleared} CLEARED`;
    this.el.draftCards.innerHTML = '';

    choices.forEach((relic, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'relic-card';
      card.dataset.index = String(idx);
      card.innerHTML = `
        <span class="relic-hotkey">${idx + 1}</span>
        <span class="relic-tag tag-${relic.tag}">${relic.tag}</span>
        <div class="relic-emblem">${renderRelicSvg(relic.glyph)}</div>
        <h3 class="relic-name">${relic.name}</h3>
        <div class="relic-stat">${relic.stat}</div>
        <p class="relic-desc">${relic.desc}</p>
      `;
      card.addEventListener('click', () => onSelect(idx));
      this.el.draftCards.appendChild(card);
    });
  }

  showResults(summary) {
    const victory = summary.victory;
    this.el.resultsEyebrow.textContent = victory ? 'SUNDIAL CITADEL RECLAIMED' : 'THE BASTION FELL';
    this.el.resultsTitle.textContent = victory ? 'VICTORY' : 'EXPEDITION ENDED';
    this.el.resultsSeal.textContent = summary.rank;
    this.el.resScore.textContent = Math.floor(summary.score).toLocaleString('en-US');
    this.el.resWaves.textContent = `${summary.wavesCleared} / ${summary.totalWaves}`;
    this.el.resKills.textContent = String(summary.kills);
    this.el.resParries.textContent = String(summary.parries);
    this.el.resCombo.textContent = `x${summary.peakCombo.toFixed(1)}`;

    const mins = Math.floor(summary.runTime / 60);
    const secs = Math.floor(summary.runTime % 60);
    this.el.resTime.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

    if (summary.relics.length === 0) {
      this.el.resRelics.innerHTML = '<span class="result-relic-pill">No Relics Forged</span>';
    } else {
      this.el.resRelics.innerHTML = summary.relics
        .map((r) => `<span class="result-relic-pill">${r.name}</span>`)
        .join('');
    }
  }
}
