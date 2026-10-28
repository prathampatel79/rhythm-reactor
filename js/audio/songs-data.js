/**
 * Rhythm Reactor - Songs & Compositions Data
 * 5 Original procedural multi-track compositions:
 * 1. Neon Pulse (110 BPM - Electronic)
 * 2. Cyber Rush (140 BPM - Fast Synthwave)
 * 3. Pixel Dreams (100 BPM - Cheerful Chiptune)
 * 4. Midnight Drive (120 BPM - Atmospheric Electronic)
 * 5. Boss Beat (160 BPM - Intense Arcade Hardcore)
 */

(function () {
  // Pitch helper: Note names to frequencies (A4 = 440 Hz)
  const NOTE_MAP = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };

  function f(noteStr) {
    if (!noteStr) return 0;
    const match = noteStr.match(/^([A-G][#b]?)([0-8])$/);
    if (!match) return 440;
    const [, name, oct] = match;
    const semitones = NOTE_MAP[name] + (parseInt(oct, 10) + 1) * 12;
    return 440 * Math.pow(2, (semitones - 69) / 12);
  }

  // =========================================================================
  // SONG 1: NEON PULSE (110 BPM, Electronic / Cyber Club)
  // Scale: D Minor (D, E, F, G, A, Bb, C)
  // =========================================================================
  function buildNeonPulse() {
    const bpm = 110;
    const totalBars = 32;
    const events = [];

    // Sections:
    // Bars 0-3 (Intro, 16 beats): Atmospheric chords, kick on beat 8, filtered lead
    // Bars 4-11 (Main, 32 beats): Full driving electro kick, snare on 2 & 4, 16th hats, punchy bass, melodic hook
    // Bars 12-19 (Variation, 32 beats): Syncopated bassline, clap syncopations, soaring counter-lead
    // Bars 20-27 (Climax, 32 beats): High octane arp + lead + double-time snare fills + heavy chords
    // Bars 28-31 (Outro, 16 beats): Decaying groove, resolving final chord

    // Chord progressions per 4 bars:
    // Dm (D3, F3, A3) -> Bb (Bb2, D3, F3) -> Gm (G2, Bb2, D3) -> A (A2, C#3, E3)
    const chordProgressions = [
      [f('D3'), f('F3'), f('A3')],
      [f('Bb2'), f('D3'), f('F3')],
      [f('G2'), f('Bb2'), f('D3')],
      [f('A2'), f('C#3'), f('E3')]
    ];

    const bassNotes = [f('D2'), f('Bb1'), f('G1'), f('A1')];

    // Build timeline beat by beat
    for (let bar = 0; bar < totalBars; bar++) {
      const barBeat = bar * 4;
      const progIdx = bar % 4;
      const currentChord = chordProgressions[progIdx];
      const rootBass = bassNotes[progIdx];

      // Pad / Chords on every bar start
      if (bar < 28) {
        events.push({ beat: barBeat, type: 'chord', freqs: currentChord, dur: 3.8, vel: 0.6, lane: (bar % 2 === 0) ? 0 : 3 });
      }

      // --- INTRO (Bars 0-3) ---
      if (bar < 4) {
        // Kick comes in on bar 2
        if (bar >= 2) {
          events.push({ beat: barBeat, type: 'kick', vel: 0.85, lane: 0 });
          events.push({ beat: barBeat + 2, type: 'kick', vel: 0.8, lane: 0 });
        }
        // Hihats bar 3
        if (bar === 3) {
          for (let s = 0; s < 4; s++) {
            events.push({ beat: barBeat + s + 0.5, type: 'hihat', vel: 0.5, lane: 2 });
          }
        }
        // Soft lead motif
        const introMelody = [f('A4'), f('F4'), f('D4'), f('E4')];
        events.push({ beat: barBeat + 1, type: 'lead', freq: introMelody[progIdx], dur: 1.5, vel: 0.6, lane: 1 });
      }

      // --- MAIN GROOVE (Bars 4-11) ---
      else if (bar >= 4 && bar < 12) {
        // 4-on-the-floor kick
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 0.95, lane: 0 });
        }
        // Snare / Clap on 2 and 4
        events.push({ beat: barBeat + 1, type: 'snare', vel: 0.85, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 0.9, lane: 2 });

        // 16th Hi-hats
        for (let s = 0; s < 8; s++) {
          const isOffbeat = (s % 2 === 1);
          events.push({
            beat: barBeat + s * 0.5,
            type: isOffbeat ? 'openhat' : 'hihat',
            vel: isOffbeat ? 0.65 : 0.4,
            lane: isOffbeat ? 3 : 1
          });
        }

        // Rolling Electro Bass (8th notes)
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b + 0.5, type: 'bass', freq: rootBass, dur: 0.4, vel: 0.85, lane: 1 });
        }

        // Catchy Lead Hook
        const hookNotes = [
          [f('D5'), f('F5'), f('A5'), f('G5')],
          [f('F5'), f('D5'), f('E5'), f('F5')],
          [f('G5'), f('Bb5'), f('A5'), f('F5')],
          [f('E5'), f('F5'), f('E5'), f('C#5')]
        ][progIdx];

        events.push({ beat: barBeat, type: 'lead', freq: hookNotes[0], dur: 0.8, vel: 0.75, lane: 1 });
        events.push({ beat: barBeat + 1.5, type: 'lead', freq: hookNotes[1], dur: 0.6, vel: 0.7, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: hookNotes[2], dur: 0.7, vel: 0.8, lane: 3 });
        events.push({ beat: barBeat + 3.25, type: 'lead', freq: hookNotes[3], dur: 0.6, vel: 0.75, lane: 2 });
      }

      // --- VARIATION (Bars 12-19) ---
      else if (bar >= 12 && bar < 20) {
        // Syncopated kick: 0, 1.75, 2.5, 3.5
        events.push({ beat: barBeat, type: 'kick', vel: 1.0, lane: 0 });
        events.push({ beat: barBeat + 1.75, type: 'kick', vel: 0.85, lane: 0 });
        events.push({ beat: barBeat + 2.5, type: 'kick', vel: 0.9, lane: 0 });

        // Clap on 2 and 4 + offbeat accent
        events.push({ beat: barBeat + 1, type: 'clap', vel: 0.85, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'clap', vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 3.75, type: 'clap', vel: 0.6, lane: 3 });

        // Hihat rhythm
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b + 0.5, type: 'openhat', vel: 0.7, lane: 3 });
        }

        // Funky Bassline with octave jumps
        events.push({ beat: barBeat, type: 'bass', freq: rootBass, dur: 0.4, vel: 0.9, lane: 1 });
        events.push({ beat: barBeat + 0.75, type: 'bass', freq: rootBass * 2, dur: 0.3, vel: 0.75, lane: 2 });
        events.push({ beat: barBeat + 1.5, type: 'bass', freq: rootBass, dur: 0.4, vel: 0.85, lane: 1 });
        events.push({ beat: barBeat + 2.5, type: 'bass', freq: rootBass * 2, dur: 0.35, vel: 0.8, lane: 2 });

        // Rapid 16th Arp runs
        const arpScale = [rootBass * 4, rootBass * 5, rootBass * 6, rootBass * 8];
        for (let a = 0; a < 8; a++) {
          events.push({
            beat: barBeat + a * 0.5,
            type: 'arp',
            freq: arpScale[a % 4],
            dur: 0.2,
            vel: 0.6,
            lane: (a % 2 === 0) ? 1 : 2
          });
        }
      }

      // --- CLIMAX DROP (Bars 20-27) ---
      else if (bar >= 20 && bar < 28) {
        // High-energy 4-on-floor + snare double
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 1.0, lane: 0 });
          events.push({ beat: barBeat + b + 0.5, type: 'openhat', vel: 0.8, lane: 3 });
        }
        events.push({ beat: barBeat + 1, type: 'snare', vel: 1.0, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 1.0, lane: 2 });

        // Fill on every 4th bar of climax
        if (bar % 4 === 3) {
          events.push({ beat: barBeat + 2.5, type: 'snare', vel: 0.8, lane: 2 });
          events.push({ beat: barBeat + 3.25, type: 'snare', vel: 0.85, lane: 1 });
          events.push({ beat: barBeat + 3.5, type: 'snare', vel: 0.9, lane: 2 });
          events.push({ beat: barBeat + 3.75, type: 'snare', vel: 1.0, lane: 3 });
        }

        // Full Octave Bass Drive
        for (let b = 0; b < 8; b++) {
          events.push({
            beat: barBeat + b * 0.5,
            type: 'bass',
            freq: (b % 2 === 0) ? rootBass : rootBass * 2,
            dur: 0.35,
            vel: 0.88,
            lane: (b % 2 === 0) ? 0 : 1
          });
        }

        // Soaring High Climax Melody
        const climNotes = [
          [f('D5'), f('A5'), f('F5'), f('D6')],
          [f('Bb5'), f('A5'), f('G5'), f('F5')],
          [f('G5'), f('D6'), f('C6'), f('Bb5')],
          [f('A5'), f('E6'), f('D6'), f('C#6')]
        ][progIdx];

        events.push({ beat: barBeat, type: 'lead', freq: climNotes[0], dur: 0.9, vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 1, type: 'lead', freq: climNotes[1], dur: 0.9, vel: 0.85, lane: 3 });
        events.push({ beat: barBeat + 2, type: 'lead', freq: climNotes[2], dur: 0.9, vel: 0.9, lane: 1 });
        events.push({ beat: barBeat + 3, type: 'lead', freq: climNotes[3], dur: 0.9, vel: 0.95, lane: 2 });
      }

      // --- OUTRO (Bars 28-31) ---
      else {
        // Half-tempo resolving hits
        events.push({ beat: barBeat, type: 'kick', vel: 0.8, lane: 0 });
        if (bar < 30) {
          events.push({ beat: barBeat + 2, type: 'snare', vel: 0.7, lane: 2 });
        }
        events.push({ beat: barBeat + 1, type: 'lead', freq: f('D4'), dur: 2.0, vel: 0.6, lane: 1 });
      }
    }

    // Grand final hit
    events.push({ beat: 128, type: 'kick', vel: 1.0, lane: 0 });
    events.push({ beat: 128, type: 'chord', freqs: [f('D3'), f('A3'), f('D4'), f('F4')], dur: 4.0, vel: 0.9, lane: 3 });

    events.sort((a, b) => a.beat - b.beat);

    return {
      id: 'neon-pulse',
      title: 'Neon Pulse',
      genre: 'Electronic',
      style: 'electronic',
      bpm,
      totalBars,
      totalBeats: totalBars * 4,
      duration: '1:10',
      difficultyRating: { easy: 2, normal: 5, hard: 8 },
      theme: {
        primary: '#00f0ff',
        secondary: '#ff007f',
        accent: '#ffe600',
        bgDark: '#070a16',
        gridColor: 'rgba(0, 240, 255, 0.22)',
        coverType: 'neon-pulse'
      },
      preview: { startBeat: 80, endBeat: 104 },
      sections: [
        { name: 'INTRO', startBar: 0, bars: 4 },
        { name: 'MAIN GROOVE', startBar: 4, bars: 8 },
        { name: 'VARIATION', startBar: 12, bars: 8 },
        { name: 'CLIMAX DROP', startBar: 20, bars: 8 },
        { name: 'OUTRO', startBar: 28, bars: 4 }
      ],
      events
    };
  }

  // =========================================================================
  // SONG 2: CYBER RUSH (140 BPM, Fast Synthwave / Outrun)
  // Scale: A Minor (A, B, C, D, E, F, G)
  // =========================================================================
  function buildCyberRush() {
    const bpm = 140;
    const totalBars = 32;
    const events = [];

    // Chords: Am (A2, C3, E3) -> F (F2, A2, C3) -> C (C3, E3, G3) -> G (G2, B2, D3)
    const chords = [
      [f('A2'), f('C3'), f('E3')],
      [f('F2'), f('A2'), f('C3')],
      [f('C3'), f('E3'), f('G3')],
      [f('G2'), f('B2'), f('D3')]
    ];
    const bassline = [f('A1'), f('F1'), f('C2'), f('G1')];

    for (let bar = 0; bar < totalBars; bar++) {
      const barBeat = bar * 4;
      const progIdx = bar % 4;
      const rootBass = bassline[progIdx];
      const curChord = chords[progIdx];

      // Sustained synth pads
      if (bar < 28) {
        events.push({ beat: barBeat, type: 'chord', freqs: curChord, dur: 3.8, vel: 0.6, lane: 0 });
      }

      // --- INTRO (Bars 0-3) ---
      if (bar < 4) {
        // Galloping 16th Synthwave Bass starting bar 1
        if (bar >= 1) {
          for (let s = 0; s < 16; s++) {
            events.push({ beat: barBeat + s * 0.25, type: 'bass', freq: rootBass, dur: 0.2, vel: 0.7, lane: s % 2 === 0 ? 0 : 1 });
          }
        }
        if (bar >= 2) {
          events.push({ beat: barBeat, type: 'kick', vel: 0.9, lane: 0 });
          events.push({ beat: barBeat + 2, type: 'kick', vel: 0.9, lane: 0 });
        }
        if (bar === 3) {
          events.push({ beat: barBeat + 3, type: 'snare', vel: 0.9, lane: 2 });
          events.push({ beat: barBeat + 3.5, type: 'snare', vel: 0.9, lane: 2 });
        }
      }

      // --- MAIN DRIVE (Bars 4-11) ---
      else if (bar >= 4 && bar < 12) {
        // 4-on-the-floor kick
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 0.95, lane: 0 });
        }
        // Gated Reverb Snare on 2 and 4
        events.push({ beat: barBeat + 1, type: 'snare', vel: 0.95, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 0.95, lane: 2 });

        // Rapid 16th Outrun Arpeggio
        const arpPattern = [f('E4'), f('A4'), f('C5'), f('E5')];
        for (let s = 0; s < 16; s++) {
          events.push({
            beat: barBeat + s * 0.25,
            type: 'arp',
            freq: arpPattern[s % 4],
            dur: 0.18,
            vel: 0.55,
            lane: s % 4
          });
        }

        // Outrun Brass Lead Hook
        const leadPhrases = [
          [f('A4'), f('C5'), f('B4'), f('A4')],
          [f('F4'), f('A4'), f('G4'), f('E4')],
          [f('C5'), f('E5'), f('D5'), f('C5')],
          [f('B4'), f('D5'), f('C5'), f('B4')]
        ][progIdx];

        events.push({ beat: barBeat, type: 'lead', freq: leadPhrases[0], dur: 0.9, vel: 0.85, lane: 1 });
        events.push({ beat: barBeat + 1.5, type: 'lead', freq: leadPhrases[1], dur: 0.8, vel: 0.8, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: leadPhrases[2], dur: 0.6, vel: 0.85, lane: 3 });
        events.push({ beat: barBeat + 3.25, type: 'lead', freq: leadPhrases[3], dur: 0.65, vel: 0.8, lane: 1 });
      }

      // --- HIGHWAY PURSUIT / VARIATION (Bars 12-19) ---
      else if (bar >= 12 && bar < 20) {
        // Syncopated kick: 0, 1.5, 3
        events.push({ beat: barBeat, type: 'kick', vel: 1.0, lane: 0 });
        events.push({ beat: barBeat + 1.5, type: 'kick', vel: 0.9, lane: 0 });
        events.push({ beat: barBeat + 3, type: 'kick', vel: 0.95, lane: 0 });

        // Double snare hits
        events.push({ beat: barBeat + 1, type: 'snare', vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 0.95, lane: 2 });
        events.push({ beat: barBeat + 3.5, type: 'snare', vel: 0.75, lane: 1 });

        // Open hat syncopation
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b + 0.5, type: 'openhat', vel: 0.7, lane: 3 });
        }

        // Soaring Synthwave Lead melody (Octave higher)
        const soloNotes = [f('A5'), f('E5'), f('G5'), f('F5'), f('E5'), f('D5')];
        events.push({ beat: barBeat, type: 'lead', freq: soloNotes[bar % 6], dur: 1.2, vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 1.5, type: 'lead', freq: soloNotes[(bar + 2) % 6], dur: 0.8, vel: 0.85, lane: 3 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: soloNotes[(bar + 4) % 6], dur: 1.2, vel: 0.9, lane: 1 });
      }

      // --- TURBO CLIMAX (Bars 20-27) ---
      else if (bar >= 20 && bar < 28) {
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 1.0, lane: 0 });
          events.push({ beat: barBeat + b + 0.5, type: 'openhat', vel: 0.85, lane: 3 });
        }
        events.push({ beat: barBeat + 1, type: 'snare', vel: 1.0, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 1.0, lane: 2 });

        // Fast arpeggiated bursts
        const rapidNotes = [f('A4'), f('C5'), f('E5'), f('A5'), f('G5'), f('E5'), f('D5'), f('B4')];
        for (let r = 0; r < 8; r++) {
          events.push({
            beat: barBeat + r * 0.5,
            type: 'arp',
            freq: rapidNotes[r],
            dur: 0.25,
            vel: 0.7,
            lane: r % 4
          });
        }

        // Powerful Climax Chord Stabs
        events.push({ beat: barBeat, type: 'chord', freqs: curChord, dur: 0.45, vel: 0.9, lane: 1 });
        events.push({ beat: barBeat + 2, type: 'chord', freqs: curChord, dur: 0.45, vel: 0.9, lane: 2 });
      }

      // --- OUTRO (Bars 28-31) ---
      else {
        events.push({ beat: barBeat, type: 'kick', vel: 0.8, lane: 0 });
        if (bar < 31) events.push({ beat: barBeat + 2, type: 'snare', vel: 0.7, lane: 2 });
        events.push({ beat: barBeat + 1, type: 'lead', freq: f('A4'), dur: 2.5, vel: 0.65, lane: 1 });
      }
    }

    // Finale
    events.push({ beat: 128, type: 'kick', vel: 1.0, lane: 0 });
    events.push({ beat: 128, type: 'snare', vel: 1.0, lane: 2 });
    events.push({ beat: 128, type: 'chord', freqs: [f('A2'), f('E3'), f('A3'), f('C4'), f('E4')], dur: 4.0, vel: 0.95, lane: 3 });

    events.sort((a, b) => a.beat - b.beat);

    return {
      id: 'cyber-rush',
      title: 'Cyber Rush',
      genre: 'Fast Synthwave',
      style: 'synthwave',
      bpm,
      totalBars,
      totalBeats: totalBars * 4,
      duration: '0:55',
      difficultyRating: { easy: 3, normal: 6, hard: 9 },
      theme: {
        primary: '#ff0055',
        secondary: '#9d00ff',
        accent: '#ffaa00',
        bgDark: '#0e0419',
        gridColor: 'rgba(255, 0, 85, 0.25)',
        coverType: 'cyber-rush'
      },
      preview: { startBeat: 80, endBeat: 104 },
      sections: [
        { name: 'WARM UP', startBar: 0, bars: 4 },
        { name: 'NEON CRUISE', startBar: 4, bars: 8 },
        { name: 'HIGHWAY DRIFT', startBar: 12, bars: 8 },
        { name: 'OVERDRIVE', startBar: 20, bars: 8 },
        { name: 'COOLDOWN', startBar: 28, bars: 4 }
      ],
      events
    };
  }

  // =========================================================================
  // SONG 3: PIXEL DREAMS (100 BPM, Cheerful Chiptune)
  // Scale: C Major (C, D, E, F, G, A, B)
  // =========================================================================
  function buildPixelDreams() {
    const bpm = 100;
    const totalBars = 28; // ~67s
    const events = [];

    // C Major -> Am -> F -> G progression (classic cheerful NES soundtrack)
    const chords = [
      [f('C3'), f('E3'), f('G3')],
      [f('A2'), f('C3'), f('E3')],
      [f('F2'), f('A2'), f('C3')],
      [f('G2'), f('B2'), f('D3')]
    ];
    const bassline = [f('C2'), f('A1'), f('F1'), f('G1')];

    for (let bar = 0; bar < totalBars; bar++) {
      const barBeat = bar * 4;
      const progIdx = bar % 4;
      const rootBass = bassline[progIdx];

      // --- INTRO (Bars 0-3) ---
      if (bar < 4) {
        // Bouncy 8-bit blip arpeggio
        const introBlips = [f('C4'), f('E4'), f('G4'), f('C5')];
        for (let s = 0; s < 8; s++) {
          events.push({
            beat: barBeat + s * 0.5,
            type: 'arp',
            freq: introBlips[s % 4],
            dur: 0.18,
            vel: 0.6,
            lane: s % 4
          });
        }
        if (bar >= 2) {
          events.push({ beat: barBeat, type: 'kick', vel: 0.8, lane: 0 });
          events.push({ beat: barBeat + 2, type: 'snare', vel: 0.7, lane: 2 });
        }
      }

      // --- MAIN THEME (Bars 4-11) ---
      else if (bar >= 4 && bar < 12) {
        // Bouncy chiptune drum pattern: Kick on 0, 2; Snare on 1, 3
        events.push({ beat: barBeat, type: 'kick', vel: 0.9, lane: 0 });
        events.push({ beat: barBeat + 1, type: 'snare', vel: 0.85, lane: 2 });
        events.push({ beat: barBeat + 2, type: 'kick', vel: 0.9, lane: 0 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 0.85, lane: 2 });

        // 8-bit Noise Hi-hats
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b + 0.5, type: 'hihat', vel: 0.55, lane: 3 });
        }

        // Bouncy Triangle Bassline (Walk pattern)
        events.push({ beat: barBeat, type: 'bass', freq: rootBass, dur: 0.35, vel: 0.85, lane: 1 });
        events.push({ beat: barBeat + 1, type: 'bass', freq: rootBass * 1.5, dur: 0.35, vel: 0.75, lane: 2 });
        events.push({ beat: barBeat + 2, type: 'bass', freq: rootBass, dur: 0.35, vel: 0.85, lane: 1 });
        events.push({ beat: barBeat + 3, type: 'bass', freq: rootBass * 1.25, dur: 0.35, vel: 0.75, lane: 2 });

        // Cheerful Melody Lead (NES Square wave hook)
        const melodyMap = [
          [f('C5'), f('E5'), f('G5'), f('A5'), f('G5')],
          [f('A5'), f('G5'), f('E5'), f('D5'), f('C5')],
          [f('F5'), f('A5'), f('C6'), f('A5'), f('F5')],
          [f('G5'), f('B5'), f('D6'), f('C6'), f('B5')]
        ][progIdx];

        events.push({ beat: barBeat, type: 'lead', freq: melodyMap[0], dur: 0.4, vel: 0.85, lane: 0 });
        events.push({ beat: barBeat + 0.75, type: 'lead', freq: melodyMap[1], dur: 0.4, vel: 0.8, lane: 1 });
        events.push({ beat: barBeat + 1.5, type: 'lead', freq: melodyMap[2], dur: 0.5, vel: 0.85, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: melodyMap[3], dur: 0.5, vel: 0.8, lane: 3 });
        events.push({ beat: barBeat + 3.25, type: 'lead', freq: melodyMap[4], dur: 0.6, vel: 0.85, lane: 2 });
      }

      // --- UNDERGROUND CAVE / VARIATION (Bars 12-19) ---
      else if (bar >= 12 && bar < 20) {
        // Syncopated chiptune swing
        events.push({ beat: barBeat, type: 'kick', vel: 0.95, lane: 0 });
        events.push({ beat: barBeat + 1.5, type: 'kick', vel: 0.85, lane: 0 });
        events.push({ beat: barBeat + 2, type: 'snare', vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 3.5, type: 'snare', vel: 0.8, lane: 3 });

        // Fast chiptune arpeggios (16th note flutter)
        const caveArp = [f('E4'), f('G4'), f('C5'), f('E5'), f('G5'), f('E5'), f('C5'), f('G4')];
        for (let s = 0; s < 8; s++) {
          events.push({
            beat: barBeat + s * 0.5,
            type: 'arp',
            freq: caveArp[s],
            dur: 0.22,
            vel: 0.65,
            lane: s % 4
          });
        }

        // Harmony blips
        events.push({ beat: barBeat + 0.5, type: 'lead', freq: f('C6'), dur: 0.4, vel: 0.75, lane: 3 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: f('A5'), dur: 0.4, vel: 0.75, lane: 1 });
      }

      // --- CLIMAX: POWER-UP FRENZY (Bars 20-25) ---
      else if (bar >= 20 && bar < 26) {
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 1.0, lane: 0 });
          events.push({ beat: barBeat + b + 0.5, type: 'hihat', vel: 0.75, lane: 3 });
        }
        events.push({ beat: barBeat + 1, type: 'snare', vel: 0.95, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 1.0, lane: 2 });

        // Rapid octave melody
        const powerNotes = [f('C5'), f('C6'), f('E5'), f('E6'), f('G5'), f('G6'), f('C6'), f('C7')];
        for (let p = 0; p < 8; p++) {
          events.push({
            beat: barBeat + p * 0.5,
            type: 'lead',
            freq: powerNotes[p],
            dur: 0.35,
            vel: 0.85,
            lane: p % 4
          });
        }
      }

      // --- OUTRO (Bars 26-27) ---
      else {
        events.push({ beat: barBeat, type: 'kick', vel: 0.8, lane: 0 });
        events.push({ beat: barBeat + 2, type: 'snare', vel: 0.7, lane: 2 });
        events.push({ beat: barBeat, type: 'lead', freq: f('C5'), dur: 1.5, vel: 0.7, lane: 1 });
      }
    }

    // Victory flourish
    events.push({ beat: 112, type: 'kick', vel: 1.0, lane: 0 });
    events.push({ beat: 112, type: 'snare', vel: 1.0, lane: 2 });
    events.push({ beat: 112, type: 'lead', freq: f('C6'), dur: 3.0, vel: 0.9, lane: 3 });

    events.sort((a, b) => a.beat - b.beat);

    return {
      id: 'pixel-dreams',
      title: 'Pixel Dreams',
      genre: 'Cheerful Chiptune',
      style: 'chiptune',
      bpm,
      totalBars,
      totalBeats: totalBars * 4,
      duration: '1:07',
      difficultyRating: { easy: 1, normal: 4, hard: 7 },
      theme: {
        primary: '#39ff14',
        secondary: '#ffff00',
        accent: '#00ffff',
        bgDark: '#041407',
        gridColor: 'rgba(57, 255, 20, 0.22)',
        coverType: 'pixel-dreams'
      },
      preview: { startBeat: 48, endBeat: 72 },
      sections: [
        { name: 'LEVEL 1', startBar: 0, bars: 4 },
        { name: 'OVERWORLD', startBar: 4, bars: 8 },
        { name: 'SECRET CAVE', startBar: 12, bars: 8 },
        { name: 'BOSS FIGHT', startBar: 20, bars: 6 },
        { name: 'VICTORY JINGLE', startBar: 26, bars: 2 }
      ],
      events
    };
  }

  // =========================================================================
  // SONG 4: MIDNIGHT DRIVE (120 BPM, Atmospheric Electronic / Chillwave)
  // Scale: E Minor (E, F#, G, A, B, C, D)
  // =========================================================================
  function buildMidnightDrive() {
    const bpm = 120;
    const totalBars = 32;
    const events = [];

    // Chords: Em7 (E2, G2, B2, D3) -> Cmaj7 (C2, E2, G2, B2) -> Am7 (A1, C2, E2, G2) -> Bm7 (B1, D2, F#2, A2)
    const chords = [
      [f('E2'), f('G2'), f('B2'), f('D3')],
      [f('C2'), f('E2'), f('G2'), f('B2')],
      [f('A1'), f('C2'), f('E2'), f('G2')],
      [f('B1'), f('D2'), f('F#2'), f('A2')]
    ];
    const bassline = [f('E1'), f('C1'), f('A0'), f('B0')];

    for (let bar = 0; bar < totalBars; bar++) {
      const barBeat = bar * 4;
      const progIdx = bar % 4;
      const rootBass = bassline[progIdx];
      const curChord = chords[progIdx];

      // Dreamy warm synth pads on every bar
      if (bar < 28) {
        events.push({ beat: barBeat, type: 'chord', freqs: curChord, dur: 3.9, vel: 0.65, lane: 0 });
      }

      // --- INTRO (Bars 0-3) ---
      if (bar < 4) {
        if (bar >= 1) {
          // Warm sub-bass pulse
          events.push({ beat: barBeat, type: 'bass', freq: rootBass, dur: 1.8, vel: 0.7, lane: 1 });
          events.push({ beat: barBeat + 2, type: 'bass', freq: rootBass, dur: 1.8, vel: 0.65, lane: 1 });
        }
        if (bar >= 2) {
          events.push({ beat: barBeat, type: 'kick', vel: 0.75, lane: 0 });
          events.push({ beat: barBeat + 2, type: 'snare', vel: 0.6, lane: 2 });
        }
      }

      // --- MAIN GLOW (Bars 4-11) ---
      else if (bar >= 4 && bar < 12) {
        // Deep round kick on 0 and 2.5
        events.push({ beat: barBeat, type: 'kick', vel: 0.85, lane: 0 });
        events.push({ beat: barBeat + 2.5, type: 'kick', vel: 0.8, lane: 0 });

        // Soft rim / clap on 2
        events.push({ beat: barBeat + 2, type: 'clap', vel: 0.75, lane: 2 });

        // Smooth brushed hi-hats (8th notes)
        for (let b = 0; b < 8; b++) {
          events.push({
            beat: barBeat + b * 0.5,
            type: 'hihat',
            vel: (b % 2 === 1) ? 0.55 : 0.35,
            lane: (b % 2 === 1) ? 3 : 1
          });
        }

        // Warm Sub-Bass line
        events.push({ beat: barBeat, type: 'bass', freq: rootBass, dur: 1.4, vel: 0.8, lane: 1 });
        events.push({ beat: barBeat + 1.5, type: 'bass', freq: rootBass * 1.5, dur: 0.8, vel: 0.7, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'bass', freq: rootBass, dur: 1.3, vel: 0.8, lane: 1 });

        // Lush Pentatonic Lead Melody
        const melNotes = [
          [f('E4'), f('G4'), f('B4'), f('A4')],
          [f('G4'), f('B4'), f('D5'), f('C5')],
          [f('C5'), f('B4'), f('A4'), f('G4')],
          [f('F#4'), f('A4'), f('B4'), f('E4')]
        ][progIdx];

        events.push({ beat: barBeat + 0.5, type: 'lead', freq: melNotes[0], dur: 1.2, vel: 0.75, lane: 1 });
        events.push({ beat: barBeat + 2, type: 'lead', freq: melNotes[1], dur: 0.8, vel: 0.7, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'lead', freq: melNotes[2], dur: 0.8, vel: 0.75, lane: 3 });
      }

      // --- CITY LIGHTS / VARIATION (Bars 12-19) ---
      else if (bar >= 12 && bar < 20) {
        // Four on the floor subtle groove
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 0.8, lane: 0 });
        }
        events.push({ beat: barBeat + 1, type: 'clap', vel: 0.8, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'clap', vel: 0.85, lane: 2 });

        // High shimmer arpeggio
        const shimmer = [f('B4'), f('E5'), f('G5'), f('B5')];
        for (let s = 0; s < 8; s++) {
          events.push({
            beat: barBeat + s * 0.5,
            type: 'arp',
            freq: shimmer[s % 4],
            dur: 0.35,
            vel: 0.5,
            lane: s % 4
          });
        }

        // Smooth counter melody
        events.push({ beat: barBeat + 0.5, type: 'lead', freq: f('E5'), dur: 1.5, vel: 0.8, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: f('D5'), dur: 1.2, vel: 0.75, lane: 3 });
      }

      // --- SKYLINE VISTA / CLIMAX (Bars 20-27) ---
      else if (bar >= 20 && bar < 28) {
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 0.9, lane: 0 });
          events.push({ beat: barBeat + b + 0.5, type: 'openhat', vel: 0.65, lane: 3 });
        }
        events.push({ beat: barBeat + 1, type: 'clap', vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'clap', vel: 0.95, lane: 2 });

        // Soaring climax chords
        events.push({ beat: barBeat, type: 'chord', freqs: curChord, dur: 1.8, vel: 0.8, lane: 1 });
        events.push({ beat: barBeat + 2, type: 'chord', freqs: curChord, dur: 1.8, vel: 0.85, lane: 2 });

        // High expressive lead
        const highMel = [f('B5'), f('A5'), f('G5'), f('E5')];
        events.push({ beat: barBeat + 0.5, type: 'lead', freq: highMel[progIdx], dur: 1.5, vel: 0.85, lane: 3 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: highMel[(progIdx + 1) % 4], dur: 1.2, vel: 0.8, lane: 1 });
      }

      // --- OUTRO (Bars 28-31) ---
      else {
        events.push({ beat: barBeat, type: 'kick', vel: 0.65, lane: 0 });
        events.push({ beat: barBeat + 2, type: 'clap', vel: 0.5, lane: 2 });
        events.push({ beat: barBeat + 1, type: 'lead', freq: f('E4'), dur: 2.5, vel: 0.6, lane: 1 });
      }
    }

    // Final Chord
    events.push({ beat: 128, type: 'kick', vel: 0.85, lane: 0 });
    events.push({ beat: 128, type: 'chord', freqs: [f('E2'), f('B2'), f('E3'), f('G3'), f('B3')], dur: 4.5, vel: 0.85, lane: 2 });

    events.sort((a, b) => a.beat - b.beat);

    return {
      id: 'midnight-drive',
      title: 'Midnight Drive',
      genre: 'Atmospheric Electronic',
      style: 'chill',
      bpm,
      totalBars,
      totalBeats: totalBars * 4,
      duration: '1:04',
      difficultyRating: { easy: 2, normal: 5, hard: 7 },
      theme: {
        primary: '#7928ca',
        secondary: '#0070f3',
        accent: '#50e3c2',
        bgDark: '#070919',
        gridColor: 'rgba(121, 40, 202, 0.22)',
        coverType: 'midnight-drive'
      },
      preview: { startBeat: 80, endBeat: 104 },
      sections: [
        { name: 'DEPARTURE', startBar: 0, bars: 4 },
        { name: 'NIGHT CRUISE', startBar: 4, bars: 8 },
        { name: 'TUNNEL ECHO', startBar: 12, bars: 8 },
        { name: 'SKYLINE SUMMIT', startBar: 20, bars: 8 },
        { name: 'HORIZON', startBar: 28, bars: 4 }
      ],
      events
    };
  }

  // =========================================================================
  // SONG 5: BOSS BEAT (160 BPM, Intense Arcade Hardcore / Industrial Rave)
  // Scale: F Minor (F, G, Ab, Bb, C, Db, Eb)
  // =========================================================================
  function buildBossBeat() {
    const bpm = 160;
    const totalBars = 36; // ~54s
    const events = [];

    // Aggressive F minor progression
    const bassline = [f('F1'), f('Ab1'), f('Db1'), f('C1')];
    const chords = [
      [f('F2'), f('Ab2'), f('C3')],
      [f('Ab2'), f('C3'), f('Eb3')],
      [f('Db2'), f('F2'), f('Ab2')],
      [f('C2'), f('E2'), f('G2')]
    ];

    for (let bar = 0; bar < totalBars; bar++) {
      const barBeat = bar * 4;
      const progIdx = bar % 4;
      const rootBass = bassline[progIdx];
      const curChord = chords[progIdx];

      // --- INTRO: SIREN & WARNING BUILD (Bars 0-3) ---
      if (bar < 4) {
        // High tension siren lead
        events.push({ beat: barBeat, type: 'lead', freq: f('F5'), dur: 0.8, vel: 0.8, lane: 0 });
        events.push({ beat: barBeat + 1, type: 'lead', freq: f('F#5'), dur: 0.8, vel: 0.85, lane: 3 });
        events.push({ beat: barBeat + 2, type: 'lead', freq: f('F5'), dur: 0.8, vel: 0.8, lane: 0 });
        events.push({ beat: barBeat + 3, type: 'lead', freq: f('F#5'), dur: 0.8, vel: 0.9, lane: 3 });

        if (bar >= 2) {
          // Rapid snare roll build-up
          for (let s = 0; s < 8; s++) {
            events.push({ beat: barBeat + s * 0.5, type: 'snare', vel: 0.4 + (s * 0.08), lane: s % 4 });
          }
        }
      }

      // --- MAIN ASSAULT (Bars 4-11) ---
      else if (bar >= 4 && bar < 12) {
        // Heavy Hardcore 4-on-the-floor kick
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 1.0, lane: 0 });
        }
        // Cracking Snare on 2 and 4
        events.push({ beat: barBeat + 1, type: 'snare', vel: 1.0, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 1.0, lane: 2 });

        // Searing Hi-hat 16ths
        for (let s = 0; s < 8; s++) {
          events.push({
            beat: barBeat + s * 0.5,
            type: (s % 2 === 1) ? 'openhat' : 'hihat',
            vel: 0.75,
            lane: (s % 2 === 1) ? 3 : 1
          });
        }

        // Distorted Acid Bassline (16th pump)
        for (let s = 0; s < 8; s++) {
          events.push({
            beat: barBeat + s * 0.5,
            type: 'bass',
            freq: (s % 2 === 0) ? rootBass : rootBass * 2,
            dur: 0.22,
            vel: 0.9,
            lane: (s % 2 === 0) ? 0 : 1
          });
        }

        // Aggressive Arcade Rave Stabs
        events.push({ beat: barBeat, type: 'chord', freqs: curChord, dur: 0.35, vel: 0.95, lane: 1 });
        events.push({ beat: barBeat + 1.5, type: 'chord', freqs: curChord, dur: 0.35, vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'chord', freqs: curChord, dur: 0.35, vel: 0.95, lane: 3 });
        events.push({ beat: barBeat + 3.25, type: 'chord', freqs: curChord, dur: 0.35, vel: 0.9, lane: 2 });
      }

      // --- PHASE 2: CRITICAL OVERLOAD (Bars 12-19) ---
      else if (bar >= 12 && bar < 20) {
        // Syncopated breakbeat kick: 0, 0.75, 2, 2.75
        events.push({ beat: barBeat, type: 'kick', vel: 1.0, lane: 0 });
        events.push({ beat: barBeat + 0.75, type: 'kick', vel: 0.95, lane: 1 });
        events.push({ beat: barBeat + 2, type: 'kick', vel: 1.0, lane: 0 });
        events.push({ beat: barBeat + 2.75, type: 'kick', vel: 0.95, lane: 1 });

        // Snare on 1 and 3 + fill
        events.push({ beat: barBeat + 1, type: 'snare', vel: 1.0, lane: 2 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 1.0, lane: 2 });
        events.push({ beat: barBeat + 3.5, type: 'snare', vel: 0.9, lane: 3 });

        // Fast Acid Sequence
        const acidNotes = [f('F3'), f('Ab3'), f('C4'), f('F4'), f('Eb4'), f('C4'), f('Ab3'), f('G3')];
        for (let a = 0; a < 8; a++) {
          events.push({
            beat: barBeat + a * 0.5,
            type: 'arp',
            freq: acidNotes[a],
            dur: 0.22,
            vel: 0.8,
            lane: a % 4
          });
        }
      }

      // --- PHASE 3: FINAL DESPERATION RAVE (Bars 20-31) ---
      else if (bar >= 20 && bar < 32) {
        // Double-time assault: 4 kicks + offbeat snares
        for (let b = 0; b < 4; b++) {
          events.push({ beat: barBeat + b, type: 'kick', vel: 1.0, lane: 0 });
          events.push({ beat: barBeat + b + 0.5, type: 'openhat', vel: 0.85, lane: 3 });
        }
        events.push({ beat: barBeat + 1, type: 'snare', vel: 1.0, lane: 2 });
        events.push({ beat: barBeat + 2.5, type: 'snare', vel: 0.9, lane: 1 });
        events.push({ beat: barBeat + 3, type: 'snare', vel: 1.0, lane: 2 });

        // Hardcore Arcade Lead (High Octave Solo)
        const bossMelody = [
          [f('F5'), f('Ab5'), f('C6'), f('Db6')],
          [f('Eb6'), f('C6'), f('Ab5'), f('G5')],
          [f('Db6'), f('F6'), f('Eb6'), f('C6')],
          [f('C6'), f('Db6'), f('C6'), f('Bb5')]
        ][progIdx];

        events.push({ beat: barBeat, type: 'lead', freq: bossMelody[0], dur: 0.45, vel: 0.95, lane: 1 });
        events.push({ beat: barBeat + 0.5, type: 'lead', freq: bossMelody[1], dur: 0.45, vel: 0.9, lane: 2 });
        events.push({ beat: barBeat + 1.5, type: 'lead', freq: bossMelody[2], dur: 0.7, vel: 0.95, lane: 3 });
        events.push({ beat: barBeat + 2.5, type: 'lead', freq: bossMelody[3], dur: 0.9, vel: 1.0, lane: 2 });

        // Heavy Chord Impact on bar start
        events.push({ beat: barBeat, type: 'chord', freqs: curChord, dur: 0.5, vel: 1.0, lane: 0 });
        events.push({ beat: barBeat + 2, type: 'chord', freqs: curChord, dur: 0.5, vel: 0.95, lane: 3 });
      }

      // --- OUTRO / SYSTEM CRITICAL (Bars 32-35) ---
      else {
        events.push({ beat: barBeat, type: 'kick', vel: 0.9, lane: 0 });
        if (bar < 35) events.push({ beat: barBeat + 2, type: 'snare', vel: 0.8, lane: 2 });
        events.push({ beat: barBeat + 1, type: 'lead', freq: f('F4'), dur: 1.5, vel: 0.75, lane: 1 });
      }
    }

    // Final Destruction Chord
    events.push({ beat: 144, type: 'kick', vel: 1.0, lane: 0 });
    events.push({ beat: 144, type: 'snare', vel: 1.0, lane: 2 });
    events.push({ beat: 144, type: 'chord', freqs: [f('F1'), f('C2'), f('F2'), f('Ab2'), f('C3'), f('F3')], dur: 4.5, vel: 1.0, lane: 3 });

    events.sort((a, b) => a.beat - b.beat);

    return {
      id: 'boss-beat',
      title: 'Boss Beat',
      genre: 'Arcade Hardcore',
      style: 'hardcore',
      bpm,
      totalBars,
      totalBeats: totalBars * 4,
      duration: '0:54',
      difficultyRating: { easy: 4, normal: 7, hard: 10 },
      theme: {
        primary: '#ff003c',
        secondary: '#ffae00',
        accent: '#ffffff',
        bgDark: '#140005',
        gridColor: 'rgba(255, 0, 60, 0.28)',
        coverType: 'boss-beat'
      },
      preview: { startBeat: 80, endBeat: 108 },
      sections: [
        { name: 'SECURITY BREACH', startBar: 0, bars: 4 },
        { name: 'SYSTEM ASSAULT', startBar: 4, bars: 8 },
        { name: 'CRITICAL OVERLOAD', startBar: 12, bars: 8 },
        { name: 'MELTDOWN PHASE', startBar: 20, bars: 12 },
        { name: 'SYSTEM SHUTDOWN', startBar: 32, bars: 4 }
      ],
      events
    };
  }

  // Pre-generate all 5 tracks
  const SONGS = [
    buildNeonPulse(),
    buildCyberRush(),
    buildPixelDreams(),
    buildMidnightDrive(),
    buildBossBeat()
  ];

  window.SONGS_DATA = SONGS;
})();
