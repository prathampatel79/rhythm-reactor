/**
 * Rhythm Reactor - Master Application Controller
 * Manages screen transitions, audio context unlocking, HUD updates,
 * pause menus, and input routing.
 */

class App {
  constructor() {
    // Core systems
    this.synth = new SynthEngine();
    this.player = new SongPlayer(this.synth);
    this.engine = new GameEngine(this.synth, this.player);
    this.input = new InputController();

    // DOM Elements
    this.screens = {
      songSelect: document.getElementById('screen-song-select'),
      gameplay: document.getElementById('screen-gameplay'),
      results: document.getElementById('screen-results')
    };

    this.hud = {
      songTitle: document.getElementById('hud-song-title'),
      bpm: document.getElementById('hud-bpm'),
      section: document.getElementById('hud-section'),
      progressFill: document.getElementById('hud-progress-fill'),
      score: document.getElementById('hud-score'),
      accuracy: document.getElementById('hud-accuracy'),
      combo: document.getElementById('hud-combo'),
      multiplier: document.getElementById('hud-multiplier'),
      countdown: document.getElementById('game-countdown-overlay'),
      pauseModal: document.getElementById('pause-modal')
    };

    this.canvas = document.getElementById('highway-canvas');
    this.visualizer = new HighwayVisualizer(this.canvas, this.synth, this.player, this.engine);

    // Sub-UIs
    this.songSelectUI = null;
    this.resultsUI = null;
    this.settingsUI = null;

    // Autoplay unlock flag
    this.audioUnlocked = false;

    this._init();
  }

  _init() {
    // First user gesture unlocks Web Audio
    const unlockAudio = () => {
      if (!this.audioUnlocked) {
        this.synth.init();
        this.audioUnlocked = true;
        const banner = document.getElementById('audio-unlock-banner');
        if (banner) banner.classList.add('hidden');
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // Initialize UI Modules
    this.songSelectUI = new SongSelectUI(
      this.screens.songSelect,
      this.synth,
      this.player,
      (song, diff) => this.startSong(song, diff)
    );

    this.resultsUI = new ResultsUI(
      this.screens.results,
      this.synth,
      (song, diff) => this.startSong(song, diff),
      () => this.showSongSelect()
    );

    const settingsContainer = document.getElementById('settings-modal-container');
    this.settingsUI = new SettingsUI(settingsContainer, this.synth, this.player, this.engine, this.visualizer);
    window.appSettings = this.settingsUI;

    this._bindInputHandlers();
    this._bindHudHandlers();
    this._bindEngineCallbacks();

    // Start with Song Select
    this.showSongSelect();

    // Global render & update loop
    const masterLoop = () => {
      requestAnimationFrame(masterLoop);
      if (this.engine.state === 'PLAYING' || this.engine.state === 'COUNTDOWN') {
        this.engine.update();
        this._updateHudProgress();
      }
    };
    requestAnimationFrame(masterLoop);
  }

  _bindInputHandlers() {
    this.input.onLanePress = (lane) => {
      this.visualizer.setLaneHeld(lane, true);
      this.engine.handleLaneInput(lane);
    };

    this.input.onLaneRelease = (lane) => {
      this.visualizer.setLaneHeld(lane, false);
    };

    this.input.onPausePress = () => {
      if (this.engine.state === 'PLAYING' || this.engine.state === 'COUNTDOWN') {
        this.pauseGame();
      } else if (this.engine.state === 'PAUSED') {
        this.resumeGame();
      }
    };

    // Direct Canvas Highway Click / Touch Support
    const getLaneFromEvent = (clientX) => {
      const rect = this.canvas.getBoundingClientRect();
      const highwayWidth = Math.min(560, rect.width * 0.94);
      const highwayLeft = (rect.width - highwayWidth) / 2;
      const x = clientX - rect.left - highwayLeft;
      if (x >= 0 && x <= highwayWidth) {
        return Math.min(3, Math.max(0, Math.floor((x / highwayWidth) * 4)));
      }
      return -1;
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const lane = getLaneFromEvent(e.clientX);
      if (lane !== -1) this.input.triggerPress(lane);
    });

    this.canvas.addEventListener('mouseup', () => {
      for (let l = 0; l < 4; l++) this.input.triggerRelease(l);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const lane = getLaneFromEvent(e.changedTouches[i].clientX);
        if (lane !== -1) this.input.triggerPress(lane);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const lane = getLaneFromEvent(e.changedTouches[i].clientX);
        if (lane !== -1) this.input.triggerRelease(lane);
      }
    }, { passive: true });

    // Mobile touch pads setup
    const touchPads = document.querySelectorAll('.mobile-touch-pad');
    touchPads.forEach(pad => {
      const lane = parseInt(pad.getAttribute('data-lane'), 10);
      pad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input.triggerPress(lane);
      }, { passive: false });

      pad.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.input.triggerRelease(lane);
      }, { passive: false });

      pad.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.input.triggerPress(lane);
      });

      pad.addEventListener('mouseup', (e) => {
        e.preventDefault();
        this.input.triggerRelease(lane);
      });
    });

    // Global Key Listener for M (Mute)
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'm' || e.key === 'M') && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        const isMuted = this.synth.toggleMute();
        const muteBtns = document.querySelectorAll('#btn-quick-mute, #btn-hud-mute');
        muteBtns.forEach(btn => {
          btn.textContent = isMuted ? '🔇' : '🔊';
        });
      }
    });
  }

  _bindHudHandlers() {
    // In-game Pause button
    const btnPause = document.getElementById('btn-hud-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (this.engine.state === 'PLAYING') this.pauseGame();
      });
    }

    // In-game Mute button
    const btnHudMute = document.getElementById('btn-hud-mute');
    if (btnHudMute) {
      btnHudMute.addEventListener('click', () => {
        const isMuted = this.synth.toggleMute();
        btnHudMute.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Pause Modal Buttons
    const btnResume = document.getElementById('btn-pause-resume');
    const btnRestart = document.getElementById('btn-pause-restart');
    const btnQuit = document.getElementById('btn-pause-quit');

    if (btnResume) btnResume.addEventListener('click', () => this.resumeGame());
    if (btnRestart) btnRestart.addEventListener('click', () => {
      this.synth.playMenuClick();
      this.hud.pauseModal.classList.remove('visible');
      this.startSong(this.engine.song, this.engine.difficulty);
    });
    if (btnQuit) btnQuit.addEventListener('click', () => {
      this.synth.playMenuClick();
      this.hud.pauseModal.classList.remove('visible');
      this.engine.stop();
      this.showSongSelect();
    });
  }

  _bindEngineCallbacks() {
    this.engine.onJudgement = (judgement, lane, hitOffset) => {
      this.visualizer.triggerHitEffect(judgement, lane, hitOffset);
    };

    this.engine.onScoreUpdate = (stats) => {
      this.hud.score.textContent = stats.score.toLocaleString();
      this.hud.accuracy.textContent = `${stats.accuracy.toFixed(1)}%`;
      this.hud.combo.textContent = stats.combo;
      this.hud.multiplier.textContent = `${stats.multiplier}x`;

      if (stats.combo > 0) {
        this.hud.combo.classList.remove('pulse');
        void this.hud.combo.offsetWidth; // trigger reflow
        this.hud.combo.classList.add('pulse');
      }
    };

    this.engine.onCountdownTick = (text) => {
      if (text) {
        this.hud.countdown.textContent = text;
        this.hud.countdown.classList.add('active');
        this.hud.countdown.classList.remove('pop');
        void this.hud.countdown.offsetWidth;
        this.hud.countdown.classList.add('pop');
      } else {
        this.hud.countdown.classList.remove('active');
      }
    };

    this.engine.onComplete = (results) => {
      this.visualizer.stop();
      this.input.stopListening();
      this.showResults(results);
    };

    this.player.onSectionChange = (sectionName) => {
      this.hud.section.textContent = sectionName;
    };
  }

  showScreen(screenName) {
    Object.keys(this.screens).forEach(key => {
      if (key === screenName) {
        this.screens[key].classList.add('active');
      } else {
        this.screens[key].classList.remove('active');
      }
    });
  }

  showSongSelect() {
    this.visualizer.stop();
    this.input.stopListening();
    this.showScreen('songSelect');
  }

  async startSong(song, difficulty) {
    this.showScreen('gameplay');
    this.visualizer.resize();
    this.visualizer.start();
    this.input.startListening();

    // Populate HUD
    this.hud.songTitle.textContent = song.title;
    this.hud.bpm.textContent = `${song.bpm} BPM`;
    this.hud.section.textContent = 'INTRO';
    this.hud.progressFill.style.width = '0%';
    this.hud.pauseModal.classList.remove('visible');

    await this.engine.startGame(song, difficulty);
  }

  pauseGame() {
    this.engine.pause();
    this.hud.pauseModal.classList.add('visible');
  }

  resumeGame() {
    this.hud.pauseModal.classList.remove('visible');
    this.engine.resume();
  }

  showResults(results) {
    this.showScreen('results');
    this.resultsUI.show(results);
  }

  _updateHudProgress() {
    const progress = this.player.getProgress();
    this.hud.progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.rhythmReactorApp = new App();
});
