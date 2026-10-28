/**
 * Rhythm Reactor - Settings & Audio/Input Latency Calibration Modal
 * Manages Master/Music/SFX volumes, reduced-effects mode, note speed,
 * and an interactive tap-calibration metronome tool.
 */

class SettingsUI {
  constructor(modalContainerEl, synthEngine, songPlayer, gameEngine, visualizer) {
    this.container = modalContainerEl;
    this.synth = synthEngine;
    this.player = songPlayer;
    this.engine = gameEngine;
    this.visualizer = visualizer;

    this.settings = {
      masterVol: 0.85,
      musicVol: 0.85,
      sfxVol: 0.9,
      latencyMs: 0,
      scrollSpeed: 1.0,
      reducedEffects: false
    };

    // Calibration tool state
    this.isCalibrating = false;
    this.calibTimer = null;
    this.calibNextBeatTime = 0;
    this.calibTaps = [];

    this._loadSettings();
    this._renderModal();
    this._applySettings();
  }

  _loadSettings() {
    const saved = localStorage.getItem('rhythm_reactor_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse saved settings', e);
      }
    }
  }

  _saveSettings() {
    localStorage.setItem('rhythm_reactor_settings', JSON.stringify(this.settings));
  }

  _applySettings() {
    this.synth.setMasterVolume(this.settings.masterVol);
    this.synth.setMusicVolume(this.settings.musicVol);
    this.synth.setSfxVolume(this.settings.sfxVol);
    this.player.setLatencyOffsetMs(this.settings.latencyMs);
    this.engine.setSpeed(this.settings.scrollSpeed);
    this.visualizer.reducedEffects = this.settings.reducedEffects;
  }

  _renderModal() {
    this.container.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-content settings-modal">
          <div class="modal-header">
            <h2>SYSTEM CONFIGURATION</h2>
            <button class="btn-close-modal" id="btn-close-settings">&times;</button>
          </div>

          <div class="modal-body">
            <!-- AUDIO VOLUMES -->
            <div class="setting-group">
              <h3>AUDIO CONTROLS</h3>
              
              <div class="setting-row">
                <label for="vol-master">Master Volume</label>
                <input type="range" id="vol-master" min="0" max="1" step="0.01" value="${this.settings.masterVol}">
                <span class="setting-value" id="val-master">${Math.round(this.settings.masterVol * 100)}%</span>
              </div>

              <div class="setting-row">
                <label for="vol-music">Music Volume</label>
                <input type="range" id="vol-music" min="0" max="1" step="0.01" value="${this.settings.musicVol}">
                <span class="setting-value" id="val-music">${Math.round(this.settings.musicVol * 100)}%</span>
              </div>

              <div class="setting-row">
                <label for="vol-sfx">SFX Volume</label>
                <input type="range" id="vol-sfx" min="0" max="1" step="0.01" value="${this.settings.sfxVol}">
                <span class="setting-value" id="val-sfx">${Math.round(this.settings.sfxVol * 100)}%</span>
              </div>
            </div>

            <!-- GAMEPLAY SETTINGS -->
            <div class="setting-group">
              <h3>GAMEPLAY & DISPLAY</h3>

              <div class="setting-row">
                <label for="opt-scroll-speed">Note Scroll Speed</label>
                <input type="range" id="opt-scroll-speed" min="0.7" max="1.8" step="0.1" value="${this.settings.scrollSpeed}">
                <span class="setting-value" id="val-scroll-speed">${this.settings.scrollSpeed.toFixed(1)}x</span>
              </div>

              <div class="setting-row">
                <label for="opt-reduced-fx">Reduced Effects Mode</label>
                <input type="checkbox" id="opt-reduced-fx" ${this.settings.reducedEffects ? 'checked' : ''}>
                <span class="setting-help">Optimizes performance for lower-powered devices</span>
              </div>
            </div>

            <!-- LATENCY CALIBRATION -->
            <div class="setting-group">
              <h3>AUDIO / INPUT LATENCY CALIBRATION</h3>
              
              <div class="setting-row">
                <label for="opt-latency">Latency Offset</label>
                <input type="range" id="opt-latency" min="-150" max="150" step="1" value="${this.settings.latencyMs}">
                <span class="setting-value" id="val-latency">${this.settings.latencyMs > 0 ? '+' : ''}${this.settings.latencyMs} ms</span>
              </div>

              <div class="calibration-box">
                <p class="calib-desc">Tap the button (or Space) in sync with the audio metronome to auto-calculate latency:</p>
                <div class="calib-controls">
                  <button id="btn-toggle-calib" class="btn-secondary">START METRONOME</button>
                  <button id="btn-tap-calib" class="btn-primary" disabled>TAP TO THE BEAT</button>
                </div>
                <div class="calib-feedback" id="calib-feedback">Ready to calibrate</div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-reset-scores" class="btn-danger-outline">Clear High Scores</button>
            <button id="btn-save-settings" class="btn-primary">CLOSE & SAVE</button>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const modalBackdrop = this.container.querySelector('#modal-backdrop');
    const closeBtn = this.container.querySelector('#btn-close-settings');
    const saveBtn = this.container.querySelector('#btn-save-settings');

    const closeModal = () => {
      this._stopCalibration();
      this.closeModal();
    };

    closeBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', closeModal);

    // Click backdrop outside content to close
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Volume Sliders
    const masterSlider = this.container.querySelector('#vol-master');
    const masterVal = this.container.querySelector('#val-master');
    masterSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.settings.masterVol = v;
      masterVal.textContent = `${Math.round(v * 100)}%`;
      this.synth.setMasterVolume(v);
      this._saveSettings();
    });

    const musicSlider = this.container.querySelector('#vol-music');
    const musicVal = this.container.querySelector('#val-music');
    musicSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.settings.musicVol = v;
      musicVal.textContent = `${Math.round(v * 100)}%`;
      this.synth.setMusicVolume(v);
      this._saveSettings();
    });

    const sfxSlider = this.container.querySelector('#vol-sfx');
    const sfxVal = this.container.querySelector('#val-sfx');
    sfxSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.settings.sfxVol = v;
      sfxVal.textContent = `${Math.round(v * 100)}%`;
      this.synth.setSfxVolume(v);
      this._saveSettings();
    });

    // Scroll Speed
    const speedSlider = this.container.querySelector('#opt-scroll-speed');
    const speedVal = this.container.querySelector('#val-scroll-speed');
    speedSlider.addEventListener('input', (e) => {
      const s = parseFloat(e.target.value);
      this.settings.scrollSpeed = s;
      speedVal.textContent = `${s.toFixed(1)}x`;
      this.engine.setSpeed(s);
      this._saveSettings();
    });

    // Reduced Effects
    const reducedFxCheck = this.container.querySelector('#opt-reduced-fx');
    reducedFxCheck.addEventListener('change', (e) => {
      this.settings.reducedEffects = e.target.checked;
      this.visualizer.reducedEffects = this.settings.reducedEffects;
      this._saveSettings();
    });

    // Latency Slider
    const latencySlider = this.container.querySelector('#opt-latency');
    const latencyVal = this.container.querySelector('#val-latency');
    latencySlider.addEventListener('input', (e) => {
      const l = parseInt(e.target.value, 10);
      this.settings.latencyMs = l;
      latencyVal.textContent = `${l > 0 ? '+' : ''}${l} ms`;
      this.player.setLatencyOffsetMs(l);
      this._saveSettings();
    });

    // Calibration Metronome buttons
    const toggleCalibBtn = this.container.querySelector('#btn-toggle-calib');
    const tapCalibBtn = this.container.querySelector('#btn-tap-calib');
    const calibFeedback = this.container.querySelector('#calib-feedback');

    toggleCalibBtn.addEventListener('click', () => {
      if (this.isCalibrating) {
        this._stopCalibration();
      } else {
        this._startCalibration();
      }
    });

    tapCalibBtn.addEventListener('click', () => {
      this._registerCalibrationTap();
    });

    // Reset scores
    const resetScoresBtn = this.container.querySelector('#btn-reset-scores');
    resetScoresBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all high scores and grades?')) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('rhythm_reactor_')) {
            localStorage.removeItem(key);
            i--;
          }
        }
        alert('High scores cleared!');
        location.reload();
      }
    });
  }

  openModal() {
    this.container.classList.add('visible');
  }

  closeModal() {
    this.container.classList.remove('visible');
    this._stopCalibration();
  }

  _startCalibration() {
    this.synth.resume();
    this.isCalibrating = true;
    this.calibTaps = [];

    const toggleCalibBtn = this.container.querySelector('#btn-toggle-calib');
    const tapCalibBtn = this.container.querySelector('#btn-tap-calib');
    const calibFeedback = this.container.querySelector('#calib-feedback');

    toggleCalibBtn.textContent = 'STOP METRONOME';
    toggleCalibBtn.classList.add('active');
    tapCalibBtn.disabled = false;
    calibFeedback.textContent = 'Listen to the beat and tap "TAP TO THE BEAT" (8 taps)';

    const beatInterval = 0.5; // 120 BPM = 500ms
    let nextTime = this.synth.getCurrentTime() + 0.1;
    this.calibNextBeatTime = nextTime;

    this.calibTimer = setInterval(() => {
      const now = this.synth.getCurrentTime();
      while (this.calibNextBeatTime < now + 0.1) {
        this.synth.playCountdownBeep(false);
        this.calibNextBeatTime += beatInterval;
      }
    }, 40);
  }

  _registerCalibrationTap() {
    if (!this.isCalibrating) return;

    const tapAudioTime = this.synth.getCurrentTime();
    const beatInterval = 0.5;

    // Find closest beat
    const timeSinceFirst = tapAudioTime;
    const beatIndex = Math.round(timeSinceFirst / beatInterval);
    const closestBeatTime = beatIndex * beatInterval;
    const deltaMs = Math.round((tapAudioTime - closestBeatTime) * 1000);

    // Keep delta in sensible range (-250ms to +250ms)
    let boundedDelta = ((deltaMs + 250) % 500) - 250;
    this.calibTaps.push(boundedDelta);

    const calibFeedback = this.container.querySelector('#calib-feedback');
    const tapsLeft = 8 - this.calibTaps.length;

    if (tapsLeft > 0) {
      calibFeedback.textContent = `Tap registered (${boundedDelta}ms). ${tapsLeft} more taps needed...`;
    } else {
      // Calculate average
      const avg = Math.round(this.calibTaps.reduce((a, b) => a + b, 0) / this.calibTaps.length);
      this.settings.latencyMs = avg;
      this.player.setLatencyOffsetMs(avg);

      const latencySlider = this.container.querySelector('#opt-latency');
      const latencyVal = this.container.querySelector('#val-latency');
      if (latencySlider && latencyVal) {
        latencySlider.value = avg;
        latencyVal.textContent = `${avg > 0 ? '+' : ''}${avg} ms`;
      }

      calibFeedback.textContent = `Calibration complete! New offset set to ${avg} ms.`;
      this._saveSettings();
      this._stopCalibration();
    }
  }

  _stopCalibration() {
    if (!this.isCalibrating) return;
    this.isCalibrating = false;
    if (this.calibTimer) {
      clearInterval(this.calibTimer);
      this.calibTimer = null;
    }

    const toggleCalibBtn = this.container.querySelector('#btn-toggle-calib');
    const tapCalibBtn = this.container.querySelector('#btn-tap-calib');
    if (toggleCalibBtn) {
      toggleCalibBtn.textContent = 'START METRONOME';
      toggleCalibBtn.classList.remove('active');
    }
    if (tapCalibBtn) {
      tapCalibBtn.disabled = true;
    }
  }
}

window.SettingsUI = SettingsUI;
