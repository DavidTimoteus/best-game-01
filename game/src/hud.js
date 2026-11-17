import { getBlueprintEmblemSvg } from './draft.js';

export class HudController {
  constructor() {
    this.hudBar = document.getElementById('hud-bar');
    this.hpText = document.getElementById('hud-hp-text');
    this.hpFill = document.getElementById('hud-hp-fill');
    this.pulseText = document.getElementById('hud-pulse-text');
    this.pulseFill = document.getElementById('hud-pulse-fill');
    this.modeTag = document.getElementById('hud-mode-tag');
    this.nightText = document.getElementById('hud-night-text');
    this.waveSub = document.getElementById('hud-wave-sub');
    this.scoreVal = document.getElementById('hud-score');
    this.chainVal = document.getElementById('hud-chain');
    this.mirrorsVal = document.getElementById('hud-mirrors');
    this.relicStrip = document.getElementById('relic-strip');
    this.bossBanner = document.getElementById('boss-banner');
    this.bossName = document.getElementById('boss-name');
    this.bossPhase = document.getElementById('boss-phase');
    this.bossFill = document.getElementById('boss-fill');
    this.nightCallout = document.getElementById('night-callout');
    this.calloutKicker = document.getElementById('callout-kicker');
    this.calloutTitle = document.getElementById('callout-title');
    this.contextHint = document.getElementById('context-hint');

    this.titleOverlay = document.getElementById('title-overlay');
    this.titleBestPill = document.getElementById('title-best-pill');
    this.draftOverlay = document.getElementById('draft-overlay');
    this.draftKicker = document.getElementById('draft-kicker');
    this.draftCards = document.getElementById('draft-cards');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resultsOverlay = document.getElementById('results-overlay');
    this.resultsBadge = document.getElementById('results-badge');
    this.resultsRank = document.getElementById('results-rank');
    this.resultsTitle = document.getElementById('results-title');
    this.resultsSub = document.getElementById('results-sub');
    this.resScore = document.getElementById('res-score');
    this.resNights = document.getElementById('res-nights');
    this.resChain = document.getElementById('res-chain');
    this.resKills = document.getElementById('res-kills');
    this.resRelics = document.getElementById('res-relics');
    this.resBest = document.getElementById('res-best');
    this.btnMute = document.getElementById('btn-mute');
  }

  setScreen(screen) {
    const isTitle = screen === 'TITLE';
    const isDraft = screen === 'DRAFT';
    const isPaused = screen === 'PAUSED';
    const isResults = screen === 'RESULTS';
    const showHud = screen === 'PLAYING' || isPaused;

    this.hudBar.classList.toggle('hidden', !showHud);
    this.relicStrip.classList.toggle('hidden', !showHud);
    this.titleOverlay.classList.toggle('hidden', !isTitle);
    this.draftOverlay.classList.toggle('hidden', !isDraft);
    this.pauseOverlay.classList.toggle('hidden', !isPaused);
    this.resultsOverlay.classList.toggle('hidden', !isResults);
    if (!showHud) {
      this.bossBanner.classList.add('hidden');
      this.nightCallout.classList.add('hidden');
      this.contextHint.classList.add('hidden');
    }
  }

  updateBest(bestScore) {
    this.titleBestPill.textContent = `BEST: ${bestScore.toLocaleString()}`;
  }

  updateMute(soundEnabled) {
    this.btnMute.textContent = soundEnabled ? 'SFX ON' : 'MUTED';
  }

  updatePlayHud(snap) {
    const hpPct = Math.max(0, Math.min(100, (snap.hp / snap.maxHp) * 100));
    this.hpText.textContent = `${Math.ceil(snap.hp)} / ${snap.maxHp}`;
    this.hpFill.style.width = `${hpPct.toFixed(1)}%`;

    const pulseReady = snap.pulseCooldown <= 0;
    const pulsePct = pulseReady
      ? 100
      : Math.max(0, Math.min(100, (1 - snap.pulseCooldown / snap.pulseMaxCooldown) * 100));
    this.pulseFill.style.width = `${pulsePct.toFixed(1)}%`;
    this.pulseText.textContent = pulseReady ? 'READY' : `${snap.pulseCooldown.toFixed(1)}s`;

    this.modeTag.textContent = snap.mode === 'endless' ? 'ENDLESS' : 'VIGIL';
    this.nightText.textContent =
      snap.mode === 'endless' ? `NIGHT ${snap.night}` : `NIGHT ${snap.night} / 7`;
    this.waveSub.textContent = `${snap.remaining} Terror${snap.remaining === 1 ? '' : 's'} Remaining`;
    this.scoreVal.textContent = snap.score.toLocaleString();
    this.chainVal.textContent = `${snap.peakChain}x`;
    this.mirrorsVal.textContent = `${snap.mirrorCount}`;

    if (snap.boss) {
      this.bossBanner.classList.remove('hidden');
      this.bossName.textContent = snap.boss.name.toUpperCase();
      this.bossPhase.textContent =
        snap.boss.phase === 3 ? 'PHASE III · MAELSTROM' : snap.boss.phase === 2 ? 'PHASE II · ENRAGED' : 'PHASE I';
      const bp = Math.max(0, Math.min(100, (snap.boss.hp / snap.boss.maxHp) * 100));
      this.bossFill.style.width = `${bp.toFixed(1)}%`;
    } else {
      this.bossBanner.classList.add('hidden');
    }

    if (snap.calloutTimer > 0) {
      this.nightCallout.classList.remove('hidden');
      this.calloutKicker.textContent = snap.calloutKicker;
      this.calloutTitle.textContent = snap.calloutTitle;
    } else {
      this.nightCallout.classList.add('hidden');
    }

    if (snap.hintText) {
      this.contextHint.classList.remove('hidden');
      this.contextHint.textContent = snap.hintText;
    } else {
      this.contextHint.classList.add('hidden');
    }
  }

  renderRelicStrip(relics) {
    this.relicStrip.innerHTML = '';
    for (const item of relics) {
      const chip = document.createElement('div');
      chip.className = 'relic-chip';
      const dot = document.createElement('span');
      dot.className = 'relic-chip-dot';
      dot.style.background = item.color;
      const label = document.createElement('span');
      label.textContent = item.count > 1 ? `${item.name} x${item.count}` : item.name;
      chip.append(dot, label);
      this.relicStrip.appendChild(chip);
    }
  }

  renderDraft(nightCleared, choices, onSelect) {
    this.draftKicker.textContent = `NIGHT ${nightCleared} CLEARED · OPTICAL FORGE`;
    this.draftCards.innerHTML = '';
    choices.forEach((bp, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'blueprint-card';
      card.innerHTML = `
        <span class="card-hotkey">${idx + 1}</span>
        <span class="card-category" style="color:${bp.color}">${bp.category}</span>
        <div class="card-emblem">${getBlueprintEmblemSvg(bp.emblem)}</div>
        <h3 class="card-name">${bp.name}</h3>
        <p class="card-desc">${bp.desc}</p>
        <div class="card-bonus">${bp.bonus}</div>
      `;
      card.addEventListener('click', () => onSelect(idx));
      this.draftCards.appendChild(card);
    });
  }

  showResults(summary) {
    const won = summary.victory;
    this.resultsBadge.textContent = won ? 'SANCTUM PRESERVED' : 'BEACON EXTINGUISHED';
    this.resultsRank.textContent = summary.rank;
    this.resultsTitle.textContent = won
      ? 'VICTORY — HARBOR ILLUMINATED'
      : 'DEFEAT — THE TIDE PREVAILED';
    this.resultsSub.textContent = won
      ? 'The Solar Beacon shattered the Abyssal Sovereign and held the harbor until dawn.'
      : `The Bastion Ward fell on Night ${summary.nightsReached}. Sculpt tighter mirror crossfires next vigil.`;

    this.resScore.textContent = summary.score.toLocaleString();
    this.resNights.textContent =
      summary.mode === 'endless' ? `${summary.nightsCleared}` : `${summary.nightsCleared} / 7`;
    this.resChain.textContent = `${summary.peakChain}x`;
    this.resKills.textContent = `${summary.kills}`;
    this.resRelics.textContent = `${summary.relicCount}`;
    this.resBest.textContent = summary.bestScore.toLocaleString();
  }
}
