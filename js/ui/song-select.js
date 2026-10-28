/**
 * Rhythm Reactor - Song Selection Screen Controller
 * Renders song cards, procedural animated covers, preview audio controls,
 * difficulty selectors, and local record badges.
 */

class SongSelectUI {
  constructor(containerEl, synthEngine, songPlayer, onSongSelected) {
    this.container = containerEl;
    this.synth = synthEngine;
    this.player = songPlayer;
    this.onSongSelected = onSongSelected;

    this.songs = window.SONGS_DATA || [];
    this.selectedSongIndex = 0;
    this.selectedDifficulty = 'normal'; // 'easy' | 'normal' | 'hard'

    this.previewActive = false;
    this.coverAnimators = [];
    this.animFrameId = null;

    this._initDOM();
  }

  _initDOM() {
    this.container.innerHTML = `
      <div class="song-select-header">
        <div class="header-left">
          <h1 class="logo-text">RHYTHM <span class="accent-glow">REACTOR</span></h1>
          <p class="tagline">SELECT YOUR TRACK & ENTER THE GRID</p>
        </div>
        <div class="header-right">
          <button id="btn-open-settings" class="btn-icon" title="Settings & Latency Calibration">⚙️</button>
          <button id="btn-quick-mute" class="btn-icon" title="Mute/Unmute (M)">🔊</button>
        </div>
      </div>

      <div class="song-carousel-container">
        <div class="song-cards-grid" id="song-cards-grid"></div>
      </div>

      <div class="song-select-bottom-bar">
        <div class="diff-selector-container">
          <span class="control-label">DIFFICULTY:</span>
          <div class="difficulty-toggle-group">
            <button class="diff-btn" data-diff="easy">EASY</button>
            <button class="diff-btn active" data-diff="normal">NORMAL</button>
            <button class="diff-btn" data-diff="hard">HARD</button>
          </div>
        </div>

        <div class="action-buttons-group">
          <button id="btn-toggle-preview" class="btn-secondary">
            <span class="btn-icon-text">▶</span> <span id="preview-text">PREVIEW TRACK</span>
          </button>
          <button id="btn-play-song" class="btn-primary btn-pulse">
            START GAME <span class="arrow-icon">➔</span>
          </button>
        </div>
      </div>
    `;

    this._bindControls();
    this._renderSongCards();
    this._startCoverAnimationLoop();
  }

  _bindControls() {
    // Difficulty toggle
    const diffButtons = this.container.querySelectorAll('.diff-btn');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedDifficulty = btn.getAttribute('data-diff');
        this.synth.playMenuClick();
        this._updateSongCardStats();
      });
    });

    // Preview button
    const previewBtn = this.container.querySelector('#btn-toggle-preview');
    previewBtn.addEventListener('click', () => {
      this._togglePreview();
    });

    // Play button
    const playBtn = this.container.querySelector('#btn-play-song');
    playBtn.addEventListener('click', () => {
      this._launchSelectedSong();
    });

    // Quick mute button
    const muteBtn = this.container.querySelector('#btn-quick-mute');
    muteBtn.addEventListener('click', () => {
      const isMuted = this.synth.toggleMute();
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    // Settings button
    const settingsBtn = this.container.querySelector('#btn-open-settings');
    settingsBtn.addEventListener('click', () => {
      this.synth.playMenuClick();
      if (window.appSettings) {
        window.appSettings.openModal();
      }
    });
  }

  _renderSongCards() {
    const grid = this.container.querySelector('#song-cards-grid');
    grid.innerHTML = '';
    this.coverAnimators = [];

    this.songs.forEach((song, idx) => {
      const card = document.createElement('div');
      card.className = `song-card ${idx === this.selectedSongIndex ? 'active' : ''}`;
      card.setAttribute('data-index', idx);

      const recordKey = `rhythm_reactor_${song.id}_${this.selectedDifficulty}`;
      const recordData = JSON.parse(localStorage.getItem(recordKey) || 'null');
      const gradeHtml = recordData ? `<div class="record-badge grade-${recordData.grade}">${recordData.grade}</div>` : '';

      card.innerHTML = `
        <div class="card-cover-wrapper">
          <canvas class="cover-canvas" width="280" height="150" data-cover="${song.theme.coverType}"></canvas>
          <div class="duration-badge">${song.duration}</div>
          <div class="bpm-badge">${song.bpm} BPM</div>
          ${gradeHtml}
        </div>
        <div class="card-body">
          <h3 class="card-title">${song.title}</h3>
          <span class="card-genre">${song.genre}</span>
          <div class="card-stats">
            <span class="rating-stars">${'★'.repeat(song.difficultyRating[this.selectedDifficulty])}${'☆'.repeat(10 - song.difficultyRating[this.selectedDifficulty])}</span>
            <span class="high-score-text">${recordData ? `BEST: ${recordData.score.toLocaleString()}` : 'NO RECORD'}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (this.selectedSongIndex !== idx) {
          this.selectedSongIndex = idx;
          this.synth.playMenuClick();
          this._selectCard(idx);
          if (this.previewActive) {
            this._startPreviewForCurrent();
          }
        }
      });

      card.addEventListener('dblclick', () => {
        this.selectedSongIndex = idx;
        this._launchSelectedSong();
      });

      grid.appendChild(card);

      // Register canvas cover animator
      const canvas = card.querySelector('.cover-canvas');
      this.coverAnimators.push(this._createCoverAnimator(canvas, song));
    });
  }

  _selectCard(index) {
    const cards = this.container.querySelectorAll('.song-card');
    cards.forEach((c, idx) => {
      c.classList.toggle('active', idx === index);
      if (idx === index) {
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  _updateSongCardStats() {
    const cards = this.container.querySelectorAll('.song-card');
    cards.forEach((card, idx) => {
      const song = this.songs[idx];
      const recordKey = `rhythm_reactor_${song.id}_${this.selectedDifficulty}`;
      const recordData = JSON.parse(localStorage.getItem(recordKey) || 'null');

      const ratingStars = card.querySelector('.rating-stars');
      if (ratingStars) {
        const rating = song.difficultyRating[this.selectedDifficulty];
        ratingStars.textContent = '★'.repeat(rating) + '☆'.repeat(10 - rating);
      }

      const scoreText = card.querySelector('.high-score-text');
      if (scoreText) {
        scoreText.textContent = recordData ? `BEST: ${recordData.score.toLocaleString()}` : 'NO RECORD';
      }

      // Update grade badge
      let badge = card.querySelector('.record-badge');
      if (recordData) {
        if (!badge) {
          badge = document.createElement('div');
          card.querySelector('.card-cover-wrapper').appendChild(badge);
        }
        badge.className = `record-badge grade-${recordData.grade}`;
        badge.textContent = recordData.grade;
      } else if (badge) {
        badge.remove();
      }
    });
  }

  async _togglePreview() {
    if (this.previewActive) {
      await this.player.stop();
      this.previewActive = false;
      this._updatePreviewButtonUI();
    } else {
      await this._startPreviewForCurrent();
    }
  }

  async _startPreviewForCurrent() {
    const song = this.songs[this.selectedSongIndex];
    if (!song) return;

    this.previewActive = true;
    this._updatePreviewButtonUI();
    await this.player.playPreview(song);
  }

  _updatePreviewButtonUI() {
    const previewBtn = this.container.querySelector('#btn-toggle-preview');
    const previewText = this.container.querySelector('#preview-text');
    const icon = previewBtn.querySelector('.btn-icon-text');

    if (this.previewActive) {
      previewBtn.classList.add('playing');
      previewText.textContent = 'STOP PREVIEW';
      icon.textContent = '■';
    } else {
      previewBtn.classList.remove('playing');
      previewText.textContent = 'PREVIEW TRACK';
      icon.textContent = '▶';
    }
  }

  _launchSelectedSong() {
    const song = this.songs[this.selectedSongIndex];
    if (!song) return;

    if (this.previewActive) {
      this.player.stop();
      this.previewActive = false;
      this._updatePreviewButtonUI();
    }

    this.synth.playMenuClick();
    if (this.onSongSelected) {
      this.onSongSelected(song, this.selectedDifficulty);
    }
  }

  // ==========================================
  // PROCEDURAL ANIMATED COVER GENERATORS
  // ==========================================

  _createCoverAnimator(canvas, song) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const type = song.theme.coverType;

    return {
      canvas,
      render: (t) => {
        ctx.clearRect(0, 0, w, h);

        if (type === 'neon-pulse') {
          // Concentric pulsing cyber rings + radial rays
          ctx.fillStyle = '#060a16';
          ctx.fillRect(0, 0, w, h);

          const cx = w / 2, cy = h / 2;
          for (let r = 1; r <= 4; r++) {
            const rad = (r * 22 + (t * 25) % 30);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.8 - (rad / 120)})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Rotating polygon
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.8);
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 3;
          ctx.strokeRect(-18, -18, 36, 36);
          ctx.restore();
        } else if (type === 'cyber-rush') {
          // Outrun synthwave sun + perspective horizon lines
          ctx.fillStyle = '#0e0419';
          ctx.fillRect(0, 0, w, h);

          // Big neon sun
          const sunGrad = ctx.createLinearGradient(0, 20, 0, 90);
          sunGrad.addColorStop(0, '#ffff00');
          sunGrad.addColorStop(0.6, '#ff0055');
          sunGrad.addColorStop(1, '#9d00ff');
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(w / 2, 70, 36, 0, Math.PI * 2);
          ctx.fill();

          // Sun stripes
          ctx.fillStyle = '#0e0419';
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(w / 2 - 40, 62 + i * 7, 80, 2 + i * 0.8);
          }

          // Road grid moving fast
          const roadOffset = (t * 80) % 25;
          ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
          for (let gy = 85 + roadOffset; gy < h; gy += 14) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }
        } else if (type === 'pixel-dreams') {
          // 8-bit retro stars + pixel heart
          ctx.fillStyle = '#051608';
          ctx.fillRect(0, 0, w, h);

          // Twinkling stars
          for (let s = 0; s < 18; s++) {
            const sx = (s * 47 + Math.sin(t + s) * 10) % w;
            const sy = (s * 31 + Math.cos(t * 0.7 + s) * 8) % h;
            ctx.fillStyle = (s % 2 === 0) ? '#39ff14' : '#00ffff';
            ctx.fillRect(sx, sy, 3, 3);
          }

          // Bouncing pixel block
          const bounceY = Math.abs(Math.sin(t * 3)) * 18;
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(w / 2 - 12, h / 2 - 12 - bounceY, 24, 24);
          ctx.fillStyle = '#051608';
          ctx.fillRect(w / 2 - 7, h / 2 - 7 - bounceY, 4, 4);
          ctx.fillRect(w / 2 + 3, h / 2 - 7 - bounceY, 4, 4);
        } else if (type === 'midnight-drive') {
          // Midnight skyline + moon + road taillights
          ctx.fillStyle = '#050718';
          ctx.fillRect(0, 0, w, h);

          // Moon
          ctx.fillStyle = '#7928ca';
          ctx.beginPath();
          ctx.arc(w * 0.8, 40, 22, 0, Math.PI * 2);
          ctx.fill();

          // Skyline buildings
          ctx.fillStyle = '#0b112c';
          const buildings = [
            [20, 50, 25], [50, 70, 30], [85, 40, 20], [110, 60, 35],
            [150, 45, 25], [180, 75, 30], [215, 55, 25], [245, 65, 30]
          ];
          buildings.forEach(([bx, bh, bw]) => {
            ctx.fillRect(bx, h - bh - 20, bw, bh);
          });

          // Moving taillights
          const carX = (t * 70) % (w + 40) - 20;
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 8;
          ctx.fillRect(carX, h - 14, 12, 4);
          ctx.shadowBlur = 0;
        } else if (type === 'boss-beat') {
          // Crimson hazard warning + rotating hazard diamond
          ctx.fillStyle = '#160005';
          ctx.fillRect(0, 0, w, h);

          // Hazard diagonal stripes at bottom
          ctx.fillStyle = 'rgba(255, 0, 60, 0.2)';
          for (let s = -40; s < w + 40; s += 24) {
            ctx.beginPath();
            ctx.moveTo(s + (t * 20 % 24), h);
            ctx.lineTo(s + 12 + (t * 20 % 24), h);
            ctx.lineTo(s + 24 + 12 + (t * 20 % 24), h - 18);
            ctx.lineTo(s + 24 + (t * 20 % 24), h - 18);
            ctx.fill();
          }

          // Rotating caution skull diamond
          ctx.save();
          ctx.translate(w / 2, h / 2 - 6);
          ctx.rotate(t * 1.5);
          ctx.strokeStyle = '#ff003c';
          ctx.lineWidth = 3;
          ctx.strokeRect(-24, -24, 48, 48);
          ctx.restore();

          // Warning flash text
          if (Math.sin(t * 6) > 0) {
            ctx.fillStyle = '#ffae00';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CRITICAL CORE', w / 2, h / 2 - 2);
          }
        }
      }
    };
  }

  _startCoverAnimationLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const t = performance.now() / 1000;
      this.coverAnimators.forEach(anim => anim.render(t));
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.previewActive) {
      this.player.stop();
    }
  }
}

window.SongSelectUI = SongSelectUI;
