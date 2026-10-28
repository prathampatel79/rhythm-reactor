/**
 * Rhythm Reactor - Song Player & Precision Audio Scheduler
 * Uses the Web Audio clock lookahead scheduling technique ("A Tale of Two Clocks").
 * Manages full song playback, pause/resume without desync, and song previews.
 */

class SongPlayer {
  constructor(synthEngine) {
    this.synth = synthEngine;

    this.currentSong = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.isPreviewing = false;

    // Timing tracking
    this.audioStartTime = 0;
    this.pauseOffset = 0; // seconds elapsed prior to pause
    this.latencyOffset = 0; // calibration offset in seconds

    // Scheduler parameters
    this.lookaheadMs = 25; // How frequently to call scheduler (ms)
    this.scheduleAheadSec = 0.12; // How far ahead to schedule Web Audio events (s)
    this.timerId = null;

    this.nextEventIndex = 0;
    this.lastDispatchedSection = null;

    // Callbacks
    this.onSectionChange = null;
    this.onSongEnd = null;
    this.onBeatTick = null;
    this.lastTickedBeat = -1;
  }

  setLatencyOffsetMs(offsetMs) {
    this.latencyOffset = offsetMs / 1000;
  }

  /**
   * Starts playing a song for gameplay from beat 0 (or after a lead-in delay).
   */
  async playSong(song, leadInDelaySec = 0) {
    await this.stop();
    await this.synth.resume();

    this.currentSong = song;
    this.isPlaying = true;
    this.isPaused = false;
    this.isPreviewing = false;
    this.lastDispatchedSection = null;
    this.lastTickedBeat = -1;

    // Lead-in gives countdown time before music notes hit
    this.audioStartTime = this.synth.getCurrentTime() + leadInDelaySec;
    this.pauseOffset = -leadInDelaySec;
    this.nextEventIndex = 0;

    this._startScheduler();
  }

  /**
   * Starts playing a short looping preview for the song selection screen.
   */
  async playPreview(song) {
    await this.stop();
    await this.synth.resume();

    this.currentSong = song;
    this.isPlaying = true;
    this.isPaused = false;
    this.isPreviewing = true;

    const startBeat = song.preview ? song.preview.startBeat : 32;
    const beatDuration = 60 / song.bpm;
    const startSec = startBeat * beatDuration;

    this.pauseOffset = startSec;
    this.audioStartTime = this.synth.getCurrentTime() - startSec;

    // Find starting event index
    this.nextEventIndex = song.events.findIndex(e => e.beat >= startBeat);
    if (this.nextEventIndex === -1) this.nextEventIndex = 0;

    this._startScheduler();
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;

    this.isPaused = true;
    this._stopScheduler();

    // Calculate exact elapsed seconds
    const now = this.synth.getCurrentTime();
    this.pauseOffset = now - this.audioStartTime;

    // Quickly ramp down music gain to silence any lingering sustaining notes
    if (this.synth.musicGain && this.synth.ctx) {
      this.synth.musicGain.gain.setTargetAtTime(0, now, 0.015);
    }
  }

  async resume() {
    if (!this.isPlaying || !this.isPaused) return;

    await this.synth.resume();

    const now = this.synth.getCurrentTime();
    this.audioStartTime = now - this.pauseOffset;
    this.isPaused = false;

    // Restore music gain
    if (this.synth.musicGain && this.synth.ctx) {
      this.synth.musicGain.gain.setTargetAtTime(this.synth.volumes.music, now, 0.02);
    }

    // Advance event pointer to current song time so we don't replay past notes
    const currentSongSec = this.pauseOffset;
    const currentBeat = (currentSongSec * this.currentSong.bpm) / 60;

    this.nextEventIndex = this.currentSong.events.findIndex(e => {
      const eSec = (e.beat * 60) / this.currentSong.bpm;
      return eSec >= currentSongSec;
    });

    if (this.nextEventIndex === -1) {
      this.nextEventIndex = this.currentSong.events.length;
    }

    this._startScheduler();
  }

  async stop() {
    this._stopScheduler();

    if (this.isPlaying && this.synth.ctx) {
      const now = this.synth.getCurrentTime();
      if (this.synth.musicGain) {
        // Quick ramp to avoid pop
        this.synth.musicGain.gain.setValueAtTime(this.synth.musicGain.gain.value, now);
        this.synth.musicGain.gain.linearRampToValueAtTime(0, now + 0.05);
      }
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.isPreviewing = false;
    this.currentSong = null;
    this.nextEventIndex = 0;
    this.pauseOffset = 0;

    // Reset music volume after brief fade
    setTimeout(() => {
      if (this.synth.musicGain && this.synth.ctx) {
        this.synth.musicGain.gain.setValueAtTime(this.synth.volumes.music, this.synth.getCurrentTime());
      }
    }, 60);
  }

  _startScheduler() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => this._scheduleLoop(), this.lookaheadMs);
  }

  _stopScheduler() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  _scheduleLoop() {
    if (!this.isPlaying || this.isPaused || !this.currentSong) return;

    const now = this.synth.getCurrentTime();
    const scheduleUntilTime = now + this.scheduleAheadSec;

    const bpm = this.currentSong.bpm;
    const secPerBeat = 60 / bpm;
    const style = this.currentSong.style || 'electronic';

    // In preview mode: handle looping between preview start and end beats
    if (this.isPreviewing && this.currentSong.preview) {
      const { startBeat, endBeat } = this.currentSong.preview;
      const previewEndSec = (endBeat * 60) / bpm;
      const currentSongSec = now - this.audioStartTime;

      if (currentSongSec >= previewEndSec) {
        // Loop back to startBeat
        const previewStartSec = (startBeat * 60) / bpm;
        this.audioStartTime = now - previewStartSec;
        this.nextEventIndex = this.currentSong.events.findIndex(e => e.beat >= startBeat);
        if (this.nextEventIndex === -1) this.nextEventIndex = 0;
      }
    }

    // Schedule all events that fall within the lookahead window
    while (this.nextEventIndex < this.currentSong.events.length) {
      const event = this.currentSong.events[this.nextEventIndex];
      const eventTime = this.audioStartTime + (event.beat * secPerBeat);

      if (eventTime > scheduleUntilTime) {
        // Too far in future, wait for next tick
        break;
      }

      // Schedule event if it has not passed
      if (eventTime >= now - 0.05) {
        this._dispatchAudioEvent(event, eventTime, style, secPerBeat);
      }

      this.nextEventIndex++;
    }

    // Check beat tick for visual pulse
    const currentSongTime = this.getSongTime();
    if (currentSongTime >= 0) {
      const currentBeat = Math.floor((currentSongTime * bpm) / 60);
      if (currentBeat !== this.lastTickedBeat) {
        this.lastTickedBeat = currentBeat;
        if (this.onBeatTick) this.onBeatTick(currentBeat);
      }
    }

    // Check section change
    this._checkSectionUpdate();

    // Check song completion
    if (!this.isPreviewing && currentSongTime >= (this.currentSong.totalBeats * secPerBeat) + 1.5) {
      this._handleSongComplete();
    }
  }

  _dispatchAudioEvent(event, eventTime, style, secPerBeat) {
    const durSec = (event.dur || 1.0) * secPerBeat;
    const vel = event.vel !== undefined ? event.vel : 0.8;

    switch (event.type) {
      case 'kick':
        this.synth.playKick(eventTime, style, vel);
        break;
      case 'snare':
        this.synth.playSnare(eventTime, style, vel);
        break;
      case 'clap':
        this.synth.playClap(eventTime, vel);
        break;
      case 'hihat':
        this.synth.playHiHat(eventTime, false, style, vel);
        break;
      case 'openhat':
        this.synth.playHiHat(eventTime, true, style, vel);
        break;
      case 'bass':
        this.synth.playBassNote(eventTime, event.freq, durSec, style, vel);
        break;
      case 'lead':
        this.synth.playLeadNote(eventTime, event.freq, durSec, style, vel);
        break;
      case 'chord':
        this.synth.playChord(eventTime, event.freqs, durSec, style, vel);
        break;
      case 'arp':
        this.synth.playArpNote(eventTime, event.freq, durSec, style, vel);
        break;
    }
  }

  _checkSectionUpdate() {
    if (!this.currentSong || !this.currentSong.sections) return;
    const currentBeat = this.getCurrentBeat();
    const currentBar = Math.floor(currentBeat / 4);

    const section = this.currentSong.sections.slice().reverse().find(s => currentBar >= s.startBar);
    if (section && section.name !== this.lastDispatchedSection) {
      this.lastDispatchedSection = section.name;
      if (this.onSectionChange) {
        this.onSectionChange(section.name);
      }
    }
  }

  _handleSongComplete() {
    this._stopScheduler();
    this.isPlaying = false;
    if (this.onSongEnd) {
      this.onSongEnd();
    }
  }

  /**
   * Returns current song playback time in seconds (0 = song start beat 0).
   * Negative values mean we are currently in lead-in / countdown.
   */
  getSongTime() {
    if (!this.isPlaying || !this.synth.ctx) return 0;
    if (this.isPaused) return this.pauseOffset;
    return (this.synth.getCurrentTime() - this.audioStartTime) + this.latencyOffset;
  }

  /**
   * Returns current beat position (float).
   */
  getCurrentBeat() {
    if (!this.currentSong) return 0;
    const songTime = this.getSongTime();
    return (songTime * this.currentSong.bpm) / 60;
  }

  /**
   * Progress from 0.0 to 1.0.
   */
  getProgress() {
    if (!this.currentSong) return 0;
    const songTime = Math.max(0, this.getSongTime());
    const totalSec = (this.currentSong.totalBeats * 60) / this.currentSong.bpm;
    return Math.min(1.0, songTime / totalSec);
  }
}

window.SongPlayer = SongPlayer;
