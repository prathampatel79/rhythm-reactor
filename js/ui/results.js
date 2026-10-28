/**
 * Rhythm Reactor - Results Screen Controller
 * Displays performance metrics, grade, high score persistence, and replay actions.
 */

class ResultsUI {
  constructor(containerEl, synthEngine, onReplay, onSongSelect) {
    this.container = containerEl;
    this.synth = synthEngine;
    this.onReplay = onReplay;
    this.onSongSelect = onSongSelect;
  }

  show(results) {
    const { song, difficulty, score, accuracy, grade, maxCombo, judgements, isFullCombo, isAllPerfect } = results;

    // Check LocalStorage for previous record
    const recordKey = `rhythm_reactor_${song.id}_${difficulty}`;
    const prevRecord = JSON.parse(localStorage.getItem(recordKey) || 'null');
    let isNewBest = false;

    if (!prevRecord || score > prevRecord.score) {
      isNewBest = true;
      localStorage.setItem(recordKey, JSON.stringify({
        score,
        accuracy,
        grade,
        maxCombo,
        date: new Date().toISOString()
      }));
    }

    this.container.innerHTML = `
      <div class="results-card-glow">
        <div class="results-header">
          <span class="results-subtitle">TRACK COMPLETE</span>
          <h2 class="results-song-title">${song.title}</h2>
          <span class="results-diff-badge diff-${difficulty}">${difficulty.toUpperCase()}</span>
        </div>

        <div class="results-main-row">
          <div class="grade-display-wrapper">
            <div class="grade-letter grade-${grade} grade-pop">${grade}</div>
            <div class="grade-label">GRADE</div>
            ${isAllPerfect ? '<div class="achievement-pill ap-pill">ALL PERFECT</div>' : (isFullCombo ? '<div class="achievement-pill fc-pill">FULL COMBO</div>' : '')}
          </div>

          <div class="score-summary-column">
            ${isNewBest ? '<div class="new-record-banner">★ NEW RECORD! ★</div>' : ''}
            <div class="results-score-label">FINAL SCORE</div>
            <div class="results-score-value" id="results-score-val">0</div>

            <div class="results-accuracy-wrapper">
              <span class="acc-label">ACCURACY:</span>
              <span class="acc-value">${accuracy.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div class="results-stats-grid">
          <div class="stat-box perfect-box">
            <span class="stat-name">PERFECT</span>
            <span class="stat-num">${judgements.perfect}</span>
          </div>
          <div class="stat-box good-box">
            <span class="stat-name">GOOD</span>
            <span class="stat-num">${judgements.good}</span>
          </div>
          <div class="stat-box miss-box">
            <span class="stat-name">MISS</span>
            <span class="stat-num">${judgements.miss}</span>
          </div>
          <div class="stat-box combo-box">
            <span class="stat-name">MAX COMBO</span>
            <span class="stat-num">${maxCombo}</span>
          </div>
        </div>

        <div class="results-actions">
          <button id="btn-results-select" class="btn-secondary">
            ◀ SONG SELECT
          </button>
          <button id="btn-results-replay" class="btn-primary btn-pulse">
            REPLAY TRACK ↺
          </button>
        </div>
      </div>
    `;

    // Animate score rollup
    this._animateScoreRollup(score);

    // Bind action buttons
    const replayBtn = this.container.querySelector('#btn-results-replay');
    replayBtn.addEventListener('click', () => {
      this.synth.playMenuClick();
      if (this.onReplay) this.onReplay(song, difficulty);
    });

    const selectBtn = this.container.querySelector('#btn-results-select');
    selectBtn.addEventListener('click', () => {
      this.synth.playMenuClick();
      if (this.onSongSelect) this.onSongSelect();
    });
  }

  _animateScoreRollup(targetScore) {
    const scoreEl = this.container.querySelector('#results-score-val');
    if (!scoreEl) return;

    const duration = 1200; // ms
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(targetScore * ease);

      scoreEl.textContent = currentVal.toLocaleString();

      if (progress < 1.0) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }
}

window.ResultsUI = ResultsUI;
