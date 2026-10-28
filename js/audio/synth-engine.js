/**
 * Rhythm Reactor - Audio Synthesis Engine
 * High-precision procedural audio synthesis via Web Audio API.
 * Kick, Snare, Hi-hat, Percussion, Basslines, Chords, Leads & SFX.
 */

class SynthEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Master bus nodes
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.analyser = null;

    // Delay & FX send
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayFilter = null;

    // Pre-rendered noise buffers for percussion
    this.whiteNoiseBuffer = null;
    this.pinkNoiseBuffer = null;

    // Volume settings (0.0 to 1.0)
    this.volumes = {
      master: 0.85,
      music: 0.85,
      sfx: 0.9,
      muted: false
    };

    // Frequency data array for beat visualizer
    this.frequencyData = null;
  }

  /**
   * Initializes the AudioContext upon user gesture.
   */
  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.error('Web Audio API is not supported in this browser.');
      return;
    }

    this.ctx = new AudioContextClass();

    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volumes.muted ? 0 : this.volumes.master, this.ctx.currentTime);

    // Analyser for beat visualizer & reactive backgrounds
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    // Sub-buses
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.volumes.music, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);

    // Delay FX bus for lush spatial depth
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime); // ~120-140bpm dotted eighth

    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);

    // Loop delay feedback
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // Master routing
    this.delayFilter.connect(this.musicGain);
    this.musicGain.connect(this.analyser);
    this.sfxGain.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Generate noise buffers
    this._createNoiseBuffers();

    this.isInitialized = true;

    // Resume if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  async resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  getCurrentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMasterVolume(val) {
    this.volumes.master = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const target = this.volumes.muted ? 0 : this.volumes.master;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  setMusicVolume(val) {
    this.volumes.music = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.volumes.music, this.ctx.currentTime, 0.02);
    }
  }

  setSfxVolume(val) {
    this.volumes.sfx = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.volumes.muted = !this.volumes.muted;
    if (this.masterGain && this.ctx) {
      const target = this.volumes.muted ? 0 : this.volumes.master;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
    return this.volumes.muted;
  }

  getEnergyLevels() {
    if (!this.analyser || !this.frequencyData) {
      return { bass: 0, mid: 0, high: 0, total: 0 };
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    let bassSum = 0, midSum = 0, highSum = 0;
    const count = this.frequencyData.length;

    for (let i = 0; i < 8; i++) bassSum += this.frequencyData[i];
    for (let i = 8; i < 32; i++) midSum += this.frequencyData[i];
    for (let i = 32; i < count; i++) highSum += this.frequencyData[i];

    const bass = bassSum / (8 * 255);
    const mid = midSum / (24 * 255);
    const high = highSum / ((count - 32) * 255);
    const total = (bass * 0.5 + mid * 0.3 + high * 0.2);

    return { bass, mid, high, total };
  }

  _createNoiseBuffers() {
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    // White noise
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Pink noise (1/f)
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const pinkData = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  // ==========================================
  // DRUM SYNTHESIZERS
  // ==========================================

  playKick(time, style = 'electronic', velocity = 1.0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let startFreq = 160;
    let endFreq = 42;
    let decay = 0.32;
    let type = 'sine';

    if (style === 'synthwave') {
      startFreq = 180;
      endFreq = 48;
      decay = 0.38;
    } else if (style === 'chiptune') {
      startFreq = 220;
      endFreq = 50;
      decay = 0.16;
      type = 'triangle';
    } else if (style === 'hardcore') {
      startFreq = 260;
      endFreq = 40;
      decay = 0.42;
      type = 'sawtooth';
    } else if (style === 'chill') {
      startFreq = 120;
      endFreq = 44;
      decay = 0.28;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.08);

    const targetGain = 1.0 * velocity;
    gain.gain.setValueAtTime(targetGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    // Punch click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(style === 'chiptune' ? 440 : 800, time);
    clickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.015);
    clickGain.gain.setValueAtTime(0.4 * velocity, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(this.musicGain);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    clickOsc.start(time);
    osc.stop(time + decay + 0.05);
    clickOsc.stop(time + 0.03);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      clickOsc.disconnect();
      clickGain.disconnect();
    };
  }

  playSnare(time, style = 'electronic', velocity = 0.9) {
    if (!this.ctx || !this.whiteNoiseBuffer) return;

    // Noise component
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.whiteNoiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = style === 'synthwave' ? 'bandpass' : 'highpass';
    noiseFilter.frequency.setValueAtTime(style === 'synthwave' ? 1400 : 1800, time);
    noiseFilter.Q.setValueAtTime(style === 'synthwave' ? 1.5 : 0.8, time);

    const noiseGain = this.ctx.createGain();
    const snareDuration = style === 'synthwave' ? 0.35 : (style === 'chiptune' ? 0.14 : 0.24);
    noiseGain.gain.setValueAtTime(0.8 * velocity, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + snareDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    // Tonal body component
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = style === 'chiptune' ? 'triangle' : 'triangle';
    const startTone = style === 'synthwave' ? 220 : 190;
    bodyOsc.frequency.setValueAtTime(startTone, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(90, time + 0.07);

    bodyGain.gain.setValueAtTime(0.5 * velocity, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.musicGain);

    noiseSource.start(time);
    bodyOsc.start(time);
    noiseSource.stop(time + snareDuration + 0.02);
    bodyOsc.stop(time + 0.14);

    noiseSource.onended = () => {
      noiseSource.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
      bodyOsc.disconnect();
      bodyGain.disconnect();
    };
  }

  playHiHat(time, isOpen = false, style = 'electronic', velocity = 0.6) {
    if (!this.ctx || !this.whiteNoiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(style === 'chiptune' ? 6000 : 8500, time);

    const gain = this.ctx.createGain();
    const duration = isOpen ? 0.28 : 0.045;
    const vol = (isOpen ? 0.6 : 0.45) * velocity;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    source.start(time);
    source.stop(time + duration + 0.01);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playClap(time, velocity = 0.8) {
    if (!this.ctx || !this.whiteNoiseBuffer) return;

    // A clap consists of 3 micro-bursts followed by a tail
    const bursts = [0, 0.011, 0.024];
    bursts.forEach((offset, idx) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, time + offset);
      filter.Q.setValueAtTime(1.8, time + offset);

      const gain = this.ctx.createGain();
      const dur = idx === 2 ? 0.22 : 0.018;
      const vol = (idx === 2 ? 0.75 : 0.45) * velocity;

      gain.gain.setValueAtTime(vol, time + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, time + offset + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      src.start(time + offset);
      src.stop(time + offset + dur + 0.01);

      src.onended = () => {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    });
  }

  // ==========================================
  // MELODIC & HARMONIC INSTRUMENTS
  // ==========================================

  playBassNote(time, freq, duration, style = 'electronic', velocity = 0.8) {
    if (!this.ctx || !freq) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (style === 'synthwave') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc2.detune.setValueAtTime(-5, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, time);
      filter.frequency.exponentialRampToValueAtTime(350, time + duration * 0.8);
      filter.Q.setValueAtTime(4.0, time);
    } else if (style === 'chiptune') {
      osc1.type = 'triangle';
      osc2.type = 'square';
      osc2.detune.setValueAtTime(0, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3500, time);
      filter.Q.setValueAtTime(1.0, time);
    } else if (style === 'hardcore') {
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc2.detune.setValueAtTime(8, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, time);
      filter.frequency.exponentialRampToValueAtTime(600, time + duration * 0.7);
      filter.Q.setValueAtTime(6.0, time);
    } else { // chill / electronic
      osc1.type = 'triangle';
      osc2.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, time);
      filter.frequency.exponentialRampToValueAtTime(280, time + duration * 0.9);
      filter.Q.setValueAtTime(2.0, time);
    }

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time);

    const targetGain = 0.65 * velocity;
    gain.gain.setValueAtTime(targetGain, time);
    gain.gain.setValueAtTime(targetGain, time + duration * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);

    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playLeadNote(time, freq, duration, style = 'electronic', velocity = 0.75) {
    if (!this.ctx || !freq) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (style === 'chiptune') {
      osc1.type = 'square';
      osc2.type = 'square';
      osc2.detune.setValueAtTime(4, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(6000, time);
    } else if (style === 'synthwave') {
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc2.detune.setValueAtTime(10, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, time);
      filter.Q.setValueAtTime(3.5, time);
    } else if (style === 'hardcore') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc2.detune.setValueAtTime(-12, time);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, time);
      filter.Q.setValueAtTime(2.0, time);
    } else { // electronic / chill
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc2.detune.setValueAtTime(6, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, time);
      filter.Q.setValueAtTime(2.5, time);
    }

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time);

    // Subtle pitch vibrato for organic expressiveness
    const vibrato = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(5.5, time);
    vibGain.gain.setValueAtTime(freq * 0.012, time);
    vibrato.connect(vibGain);
    vibGain.connect(osc1.frequency);
    vibGain.connect(osc2.frequency);
    vibrato.start(time);
    vibrato.stop(time + duration + 0.1);

    const targetGain = 0.5 * velocity;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(targetGain, time + 0.02);
    gain.gain.setValueAtTime(targetGain, time + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    // Send to delay
    if (this.delayNode) {
      const sendGain = this.ctx.createGain();
      sendGain.gain.setValueAtTime(0.25, time);
      gain.connect(sendGain);
      sendGain.connect(this.delayNode);
      setTimeout(() => sendGain.disconnect(), (duration + 1.5) * 1000);
    }

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);

    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      vibrato.disconnect();
      vibGain.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playChord(time, freqs, duration, style = 'electronic', velocity = 0.6) {
    if (!this.ctx || !freqs || !freqs.length) return;

    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      if (style === 'synthwave') {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, time);
        filter.Q.setValueAtTime(2.0, time);
      } else if (style === 'chiptune') {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, time);
      } else if (style === 'chill') {
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);
      } else {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, time);
      }

      osc.frequency.setValueAtTime(freq, time);

      const targetGain = (0.28 / freqs.length) * velocity;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(targetGain, time + 0.05);
      gain.gain.setValueAtTime(targetGain, time + duration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration + 0.08);

      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    });
  }

  playArpNote(time, freq, duration, style = 'electronic', velocity = 0.65) {
    if (!this.ctx || !freq) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = style === 'chiptune' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(style === 'chiptune' ? 4000 : 2600, time);
    filter.Q.setValueAtTime(3.0, time);

    const targetGain = 0.35 * velocity;
    gain.gain.setValueAtTime(targetGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  // ==========================================
  // GAMEPLAY SOUND EFFECTS (SFX)
  // ==========================================

  playHitSound(judgement) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (judgement === 'PERFECT') {
      // Crisp neon bell chime (dual high harmonics)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.08);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.18);
      osc2.stop(now + 0.18);
      osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); };
    } else if (judgement === 'GOOD') {
      // Milder pleasant click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.14);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } else { // MISS
      // Low dull thud / buzz
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.16);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
  }

  playCountdownBeep(isFinal = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isFinal ? 880 : 440;
    osc.frequency.setValueAtTime(freq, now);

    const dur = isFinal ? 0.35 : 0.18;
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur + 0.05);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playMenuClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}

// Export singleton instance or class
window.SynthEngine = SynthEngine;
