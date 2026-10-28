/**
 * Rhythm Reactor - Deterministic Chart Builder
 * Generates note charts directly from the music's rhythmic grid and stem events.
 * Provides distinct, tailored charts for Easy, Normal, and Hard difficulties.
 */

class ChartBuilder {
  /**
   * Builds note chart deterministically for a given song and difficulty.
   * @param {Object} song
   * @param {'easy'|'normal'|'hard'} difficulty
   * @returns {Object} Chart object containing notes array, timing windows, and metadata
   */
  static buildChart(song, difficulty = 'normal') {
    const bpm = song.bpm;
    const secPerBeat = 60 / bpm;
    const diff = difficulty.toLowerCase();

    // Timing Windows (seconds)
    const timingWindows = {
      easy: {
        perfect: 0.070, // ±70ms
        good: 0.140,    // ±140ms
        miss: 0.220     // hit window limit
      },
      normal: {
        perfect: 0.050, // ±50ms
        good: 0.100,    // ±100ms
        miss: 0.170
      },
      hard: {
        perfect: 0.035, // ±35ms
        good: 0.075,    // ±75ms
        miss: 0.130
      }
    }[diff] || timingWindows.normal;

    const rawNotes = [];
    let noteIdCounter = 0;

    // Filter and pick notes according to difficulty rules
    if (diff === 'easy') {
      // EASY: Only strong downbeats, kicks, and prominent snares.
      // Minimum gap between notes: 1.0 beat (or 0.5 in climax)
      let lastBeat = -999;
      for (const ev of song.events) {
        // Only accept kicks and snares on whole beats or half beats
        const isWholeBeat = Math.abs(ev.beat - Math.round(ev.beat)) < 0.01;
        const isSignificantDrum = (ev.type === 'kick' || ev.type === 'snare');

        if (isSignificantDrum && isWholeBeat) {
          if (ev.beat - lastBeat >= 1.0) {
            // Lane mapping: kicks go to lane 0 or 1, snares to 2 or 3
            let lane = ev.type === 'kick' ? 0 : 2;
            if (Math.round(ev.beat) % 2 === 1) lane += 1;

            rawNotes.push({
              beat: ev.beat,
              lane: lane % 4,
              type: ev.type
            });
            lastBeat = ev.beat;
          }
        }
      }
    } else if (diff === 'normal') {
      // NORMAL: Kicks, snares, claps, and key melodic accents.
      // Downbeats, offbeats (eighth notes), occasional alternating patterns.
      let lastBeatPerLane = [-999, -999, -999, -999];
      let lastGlobalBeat = -999;

      for (const ev of song.events) {
        const isQuarterOrEighth = Math.abs((ev.beat * 2) - Math.round(ev.beat * 2)) < 0.01;
        if (!isQuarterOrEighth) continue;

        let shouldInclude = false;
        let lane = ev.lane !== undefined ? ev.lane : 0;

        if (ev.type === 'kick') {
          lane = (Math.round(ev.beat) % 2 === 0) ? 0 : 1;
          shouldInclude = true;
        } else if (ev.type === 'snare' || ev.type === 'clap') {
          lane = (Math.round(ev.beat) % 2 === 0) ? 2 : 3;
          shouldInclude = true;
        } else if (ev.type === 'lead' && (ev.beat - lastGlobalBeat >= 0.5)) {
          lane = (ev.lane !== undefined) ? ev.lane : 2;
          shouldInclude = true;
        }

        if (shouldInclude && (ev.beat - lastBeatPerLane[lane] >= 0.45)) {
          rawNotes.push({
            beat: ev.beat,
            lane: lane,
            type: ev.type
          });
          lastBeatPerLane[lane] = ev.beat;
          lastGlobalBeat = ev.beat;
        }
      }
    } else {
      // HARD: High rhythm density, 16th subdivisions, chords (simultaneous notes)
      let lastBeatPerLane = [-999, -999, -999, -999];

      for (const ev of song.events) {
        let lane = (ev.lane !== undefined) ? ev.lane : 0;
        let shouldInclude = false;

        if (ev.type === 'kick') {
          lane = (ev.lane !== undefined) ? ev.lane : 0;
          shouldInclude = true;
        } else if (ev.type === 'snare' || ev.type === 'clap') {
          lane = (ev.lane !== undefined) ? ev.lane : 2;
          shouldInclude = true;
        } else if (ev.type === 'lead' || ev.type === 'arp') {
          lane = ev.lane % 4;
          shouldInclude = true;
        } else if (ev.type === 'chord') {
          // In Hard, chords create 2 simultaneous notes!
          const chordLanes = [(ev.lane) % 4, (ev.lane + 2) % 4];
          chordLanes.forEach(l => {
            if (ev.beat - lastBeatPerLane[l] >= 0.2) {
              rawNotes.push({ beat: ev.beat, lane: l, type: 'chord' });
              lastBeatPerLane[l] = ev.beat;
            }
          });
          continue;
        }

        if (shouldInclude && (ev.beat - lastBeatPerLane[lane] >= 0.2)) {
          rawNotes.push({
            beat: ev.beat,
            lane: lane,
            type: ev.type
          });
          lastBeatPerLane[lane] = ev.beat;
        }
      }
    }

    // Sort chronologically
    rawNotes.sort((a, b) => {
      if (Math.abs(a.beat - b.beat) > 0.001) return a.beat - b.beat;
      return a.lane - b.lane;
    });

    // Remove duplicates on exact same beat & lane
    const uniqueNotes = [];
    const seen = new Set();
    for (const n of rawNotes) {
      const key = `${n.beat.toFixed(3)}_${n.lane}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNotes.push(n);
      }
    }

    // Check simultaneous notes (chords)
    const beatCounts = new Map();
    for (const n of uniqueNotes) {
      const bKey = n.beat.toFixed(3);
      beatCounts.set(bKey, (beatCounts.get(bKey) || 0) + 1);
    }

    // Colors per lane:
    // Lane 0 (D): Cyan (#00f0ff)
    // Lane 1 (F): Magenta (#ff007f)
    // Lane 2 (J): Orange / Gold (#ffaa00)
    // Lane 3 (K): Neon Green (#39ff14)
    const LANE_COLORS = ['#00f0ff', '#ff007f', '#ffaa00', '#39ff14'];

    const notes = uniqueNotes.map(n => {
      const bKey = n.beat.toFixed(3);
      const isChord = (beatCounts.get(bKey) || 1) > 1;
      return {
        id: noteIdCounter++,
        beat: n.beat,
        targetTime: n.beat * secPerBeat, // exact Web Audio song time (seconds)
        lane: n.lane,
        color: isChord ? '#ffffff' : LANE_COLORS[n.lane],
        isChord,
        judged: false,
        hitResult: null,
        hitOffset: 0
      };
    });

    return {
      songId: song.id,
      difficulty: diff,
      bpm,
      secPerBeat,
      timingWindows,
      notes,
      totalNotes: notes.length
    };
  }
}

window.ChartBuilder = ChartBuilder;
