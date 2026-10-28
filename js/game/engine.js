/**
 * Rhythm Reactor - Core Gameplay Engine
 * Coordinates chart notes, Web Audio clock synchronization, input judgements,
 * scoring multipliers, accuracy, and game lifecycle.
 */

class GameEngine {
  constructor(synthEngine, songPlayer) {
    this.synth = synthEngine;
    this.player = songPlayer;

    // Active session
    this.song = null;
    this.difficulty = 'normal';
    this.chart = null;

    // States: 'IDLE', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'FINISHED'
    this.state = 'IDLE';

    // Scoring & Stats
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.judgements = {
      perfect: 0,
      good: 0,
      miss: 0
    };
    this.accuracy = 100.0;
    this.multiplier = 1;

    // Countdown
    this.countdownTimer = null;
    this.countdownCount = 3;
    this.leadInSeconds = 3.0; // 3 second lead-in before beat 0

    // Timing windows reference
    this.timingWindows = {
      perfect: 0.05,
      good: 0.10,
      miss: 0.17
    };

    // Note scroll settings
    // Approach time (speed): how many seconds a note takes to travel from spawn to hitline
    this.scrollSpeed = 1.0; // speed multiplier (0.8x to 1.5x)
    this.approachTime = 1.6; // seconds visible on highway

    // Callbacks
    this.onStateChange = null;
    this.onJudgement = null;   // (judgement, lane, hitOffset) => void
    this.onScoreUpdate = null; // (stats) => void
    this.onCountdownTick = null; // (text) => void
    this.onComplete = null;    // (results) => void

    // Bind player callbacks
    this.player.onSongEnd = this._handleSongFinished.bind(this);
  }

  setSpeed(speedVal) {
    this.scrollSpeed = Math.max(0.6, Math.min(2.0, speedVal));
    this.approachTime = 1.6 / this.scrollSpeed;
  }

  /**
   * Initializes a new game round.
   */
  async startGame(song, difficulty = 'normal') {
    this.song = song;
    this.difficulty = difficulty;

    // Deterministically generate chart
    this.chart = ChartBuilder.buildChart(song, difficulty);
    this.timingWindows = this.chart.timingWindows;

    // Reset statistics
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.judgements = { perfect: 0, good: 0, miss: 0 };
    this.accuracy = 100.0;
    this.multiplier = 1;

    this._notifyScoreUpdate();

    // Start Countdown sequence
    this.state = 'COUNTDOWN';
    if (this.onStateChange) this.onStateChange(this.state);

    await this._runCountdown();
  }

  _runCountdown() {
    return new Promise(resolve => {
      this.countdownCount = 3;
      if (this.onCountdownTick) this.onCountdownTick('3');
      this.synth.playCountdownBeep(false);

      this.countdownTimer = setInterval(() => {
        this.countdownCount--;

        if (this.countdownCount === 2) {
          if (this.onCountdownTick) this.onCountdownTick('2');
          this.synth.playCountdownBeep(false);
        } else if (this.countdownCount === 1) {
          if (this.onCountdownTick) this.onCountdownTick('1');
          this.synth.playCountdownBeep(false);
        } else if (this.countdownCount === 0) {
          if (this.onCountdownTick) this.onCountdownTick('GO!');
          this.synth.playCountdownBeep(true);
        } else {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          if (this.onCountdownTick) this.onCountdownTick('');

          // Start actual music playback
          this.state = 'PLAYING';
          if (this.onStateChange) this.onStateChange(this.state);
          this.player.playSong(this.song, 0);
          resolve();
        }
      }, 1000);
    });
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.player.pause();
    if (this.onStateChange) this.onStateChange(this.state);
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.player.resume();
    if (this.onStateChange) this.onStateChange(this.state);
  }

  stop() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.player.stop();
    this.state = 'IDLE';
    if (this.onStateChange) this.onStateChange(this.state);
  }

  /**
   * Called every frame to evaluate missed notes.
   * Frame rate drops will NOT cause missed judgements because we compare against audio time!
   */
  update() {
    if (this.state !== 'PLAYING' || !this.chart) return;

    const currentSongTime = this.player.getSongTime();

    // Check for notes that passed beyond the Good/Miss window without being hit
    for (let i = 0; i < this.chart.notes.length; i++) {
      const note = this.chart.notes[i];
      if (note.judged) continue;

      // If the note target time is in the future or within window, wait
      if (note.targetTime > currentSongTime - this.timingWindows.miss) {
        // Since notes are sorted by time, future notes haven't missed yet
        // However, simultaneous chords or close notes might appear, so we check carefully
        continue;
      }

      // Note has passed the late window without player input => Auto MISS
      note.judged = true;
      note.hitResult = 'MISS';
      note.hitOffset = currentSongTime - note.targetTime;

      this._applyJudgement('MISS', note.lane, note.hitOffset);
    }
  }

  /**
   * Handles user tapping or pressing a lane (D, F, J, K or touch pad).
   * Implements strict anti-double-hit logic by judging ONLY the single closest unhit note.
   */
  handleLaneInput(laneIndex) {
    if (this.state !== 'PLAYING' || !this.chart) return;

    const currentSongTime = this.player.getSongTime();
    let closestNote = null;
    let minTimeDiff = Infinity;

    // Search for the closest unjudged note in this lane
    for (let i = 0; i < this.chart.notes.length; i++) {
      const note = this.chart.notes[i];
      if (note.judged || note.lane !== laneIndex) continue;

      const diff = Math.abs(currentSongTime - note.targetTime);

      // Only consider notes reasonably close to current time
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        closestNote = note;
      }

      // Optimization: if note target time is far ahead in the future, break
      if (note.targetTime > currentSongTime + this.timingWindows.miss + 0.2) {
        break;
      }
    }

    if (!closestNote) {
      // No note in this lane near the hitline
      return;
    }

    const timeDiff = currentSongTime - closestNote.targetTime;
    const absDiff = Math.abs(timeDiff);

    let judgement = null;

    if (absDiff <= this.timingWindows.perfect) {
      judgement = 'PERFECT';
    } else if (absDiff <= this.timingWindows.good) {
      judgement = 'GOOD';
    } else if (absDiff <= this.timingWindows.miss) {
      judgement = 'MISS';
    } else {
      // Tap was outside the active timing window. Ignore to avoid penalizing early anticipations.
      return;
    }

    // Mark note judged
    closestNote.judged = true;
    closestNote.hitResult = judgement;
    closestNote.hitOffset = timeDiff;

    this._applyJudgement(judgement, laneIndex, timeDiff);
  }

  _applyJudgement(judgement, laneIndex, hitOffset) {
    if (judgement === 'PERFECT') {
      this.combo++;
      this.judgements.perfect++;
      this.score += 300 + (50 * this.multiplier);
      this.synth.playHitSound('PERFECT');
    } else if (judgement === 'GOOD') {
      this.combo++;
      this.judgements.good++;
      this.score += 150 + (25 * this.multiplier);
      this.synth.playHitSound('GOOD');
    } else { // MISS
      this.combo = 0;
      this.judgements.miss++;
      this.synth.playHitSound('MISS');
    }

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Update combo multiplier
    if (this.combo >= 40) this.multiplier = 4;
    else if (this.combo >= 20) this.multiplier = 3;
    else if (this.combo >= 10) this.multiplier = 2;
    else this.multiplier = 1;

    // Recalculate accuracy
    const totalJudged = this.judgements.perfect + this.judgements.good + this.judgements.miss;
    if (totalJudged > 0) {
      const accuracyScore = (this.judgements.perfect * 100) + (this.judgements.good * 50);
      this.accuracy = +(accuracyScore / (totalJudged * 100) * 100).toFixed(1);
    } else {
      this.accuracy = 100.0;
    }

    if (this.onJudgement) {
      this.onJudgement(judgement, laneIndex, hitOffset);
    }

    this._notifyScoreUpdate();
  }

  _notifyScoreUpdate() {
    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        score: this.score,
        combo: this.combo,
        maxCombo: this.maxCombo,
        multiplier: this.multiplier,
        accuracy: this.accuracy,
        judgements: { ...this.judgements }
      });
    }
  }

  _handleSongFinished() {
    if (this.state !== 'PLAYING') return;

    this.state = 'FINISHED';
    if (this.onStateChange) this.onStateChange(this.state);

    // Calculate Grade:
    // S: accuracy >= 95%
    // A: accuracy >= 90%
    // B: accuracy >= 80%
    // C: accuracy >= 70%
    // D: accuracy < 70%
    let grade = 'D';
    if (this.accuracy >= 95) grade = 'S';
    else if (this.accuracy >= 90) grade = 'A';
    else if (this.accuracy >= 80) grade = 'B';
    else if (this.accuracy >= 70) grade = 'C';

    const isFullCombo = (this.judgements.miss === 0 && this.chart.notes.length > 0);
    const isAllPerfect = (this.judgements.perfect === this.chart.notes.length && this.chart.notes.length > 0);

    const results = {
      song: this.song,
      difficulty: this.difficulty,
      score: this.score,
      accuracy: this.accuracy,
      grade,
      maxCombo: this.maxCombo,
      judgements: { ...this.judgements },
      totalNotes: this.chart.notes.length,
      isFullCombo,
      isAllPerfect
    };

    if (this.onComplete) {
      this.onComplete(results);
    }
  }
}

window.GameEngine = GameEngine;
