/**
 * Rhythm Reactor - Visualizer & Highway Renderer
 * Renders the beat-reactive neon background, note highway, falling notes,
 * hit receptors, particle effects, and floating judgements.
 */

class HighwayVisualizer {
  constructor(canvas, synthEngine, songPlayer, gameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.synth = synthEngine;
    this.player = songPlayer;
    this.engine = gameEngine;

    // Performance & visual settings
    this.reducedEffects = false;
    this.particles = [];
    this.activeJudgements = [];
    this.laneFlashes = [0, 0, 0, 0]; // 0.0 to 1.0 glow fade
    this.laneHeld = [false, false, false, false];

    // Theme colors for lanes
    this.laneColors = [
      '#00f0ff', // Lane 0 (D): Cyan
      '#ff007f', // Lane 1 (F): Magenta
      '#ffaa00', // Lane 2 (J): Gold/Amber
      '#39ff14'  // Lane 3 (K): Neon Green
    ];

    // Animation loop reference
    this.animationId = null;
    this.lastTime = performance.now();

    // Resize listener
    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  start() {
    if (this.animationId) return;
    this.lastTime = performance.now();
    const loop = (now) => {
      this.animationId = requestAnimationFrame(loop);
      const delta = (now - this.lastTime) / 1000;
      this.lastTime = now;
      this.render(delta);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setLaneHeld(lane, isHeld) {
    if (lane >= 0 && lane < 4) {
      this.laneHeld[lane] = isHeld;
      if (isHeld) this.laneFlashes[lane] = 1.0;
    }
  }

  triggerHitEffect(judgement, lane, hitOffset) {
    this.laneFlashes[lane] = 1.0;

    // Spawn floating judgement text
    this.activeJudgements.push({
      text: judgement,
      subText: judgement === 'MISS' ? '' : (hitOffset > 0.018 ? 'LATE' : (hitOffset < -0.018 ? 'EARLY' : 'EXACT')),
      color: judgement === 'PERFECT' ? '#ffe600' : (judgement === 'GOOD' ? '#00f0ff' : '#ff003c'),
      scale: 1.35,
      alpha: 1.0,
      y: 0,
      lane
    });

    if (this.reducedEffects || judgement === 'MISS') return;

    // Spawn particle burst
    const count = judgement === 'PERFECT' ? 24 : 14;
    const color = this.laneColors[lane];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 260 + 60;
      this.particles.push({
        lane,
        xOffset: (Math.random() - 0.5) * 40,
        yOffset: (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7 - 50,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.3 ? color : '#ffffff',
        alpha: 1.0,
        life: 0.45 + Math.random() * 0.25
      });
    }
  }

  render(delta) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Highway Geometry:
    // Centered highway, width up to 560px on desktop, or 94% on mobile
    const highwayWidth = Math.min(560, w * 0.94);
    const highwayLeft = (w - highwayWidth) / 2;
    const laneWidth = highwayWidth / 4;

    // Hitline placed 90px from bottom for clean spacing and visibility
    const hitLineY = Math.max(120, h - 90);

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Audio energy levels for beat pulse
    const energy = this.synth.getEnergyLevels();
    const beatPulse = energy.bass; // 0.0 to 1.0

    // 1. Draw Beat-Reactive Background
    this._drawBackground(ctx, w, h, beatPulse);

    // 2. Draw Highway Lanes & Backdrop
    this._drawHighwayLanes(ctx, highwayLeft, highwayWidth, laneWidth, h, hitLineY, beatPulse);

    // 3. Draw Falling Notes
    if (this.engine.chart && (this.engine.state === 'PLAYING' || this.engine.state === 'COUNTDOWN' || this.engine.state === 'PAUSED')) {
      this._drawNotes(ctx, highwayLeft, laneWidth, hitLineY);
    }

    // 4. Draw Hit Line & Receptors
    this._drawReceptors(ctx, highwayLeft, laneWidth, hitLineY, beatPulse);

    // 5. Draw Particles & Judgements
    this._drawParticles(ctx, highwayLeft, laneWidth, hitLineY, delta);
    this._drawJudgements(ctx, highwayLeft, highwayWidth, hitLineY, delta);

    // Decay lane flashes
    for (let i = 0; i < 4; i++) {
      if (this.laneFlashes[i] > 0) {
        this.laneFlashes[i] = Math.max(0, this.laneFlashes[i] - delta * 4.5);
      }
    }
  }

  _drawBackground(ctx, w, h, pulse) {
    const songTheme = (this.engine.song && this.engine.song.theme) ? this.engine.song.theme : {
      primary: '#00f0ff',
      secondary: '#ff007f',
      bgDark: '#080c18'
    };

    // Deep Dark Space Vignette
    const bgGrad = ctx.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h * 0.4, Math.max(w, h));
    bgGrad.addColorStop(0, '#0d1326');
    bgGrad.addColorStop(0.6, songTheme.bgDark);
    bgGrad.addColorStop(1, '#020306');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.reducedEffects) return;

    // Subtle beat-reactive ambient pulse glow
    if (pulse > 0.05) {
      ctx.save();
      const pulseGrad = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.6);
      pulseGrad.addColorStop(0, songTheme.primary + Math.round(pulse * 35).toString(16).padStart(2, '0'));
      pulseGrad.addColorStop(0.7, songTheme.secondary + Math.round(pulse * 18).toString(16).padStart(2, '0'));
      pulseGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pulseGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Background 3D Perspective Grid
    ctx.save();
    ctx.strokeStyle = songTheme.gridColor || 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    const horizonY = h * 0.22;

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.stroke();

    // Perspective lines fanning outward
    const perspectiveLines = 14;
    for (let i = 0; i <= perspectiveLines; i++) {
      const bottomX = (w / perspectiveLines) * i;
      const topX = w * 0.5 + (bottomX - w * 0.5) * 0.15;
      ctx.beginPath();
      ctx.moveTo(topX, horizonY);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawHighwayLanes(ctx, left, width, laneW, h, hitLineY, pulse) {
    ctx.save();

    // Sleek highway background with subtle gradient
    const highwayGrad = ctx.createLinearGradient(0, 0, 0, h);
    highwayGrad.addColorStop(0, 'rgba(4, 7, 18, 0.94)');
    highwayGrad.addColorStop(0.7, 'rgba(8, 13, 28, 0.96)');
    highwayGrad.addColorStop(1, 'rgba(4, 7, 18, 0.98)');
    ctx.fillStyle = highwayGrad;
    ctx.fillRect(left, 0, width, h);

    // Glowing outer guard rails
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = this.reducedEffects ? 0 : 10;

    // Left rail
    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(left, h);
    ctx.stroke();

    // Right rail
    ctx.strokeStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.beginPath();
    ctx.moveTo(left + width, 0);
    ctx.lineTo(left + width, h);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Interior lane divider lines (dashed futuristic track)
    for (let i = 1; i < 4; i++) {
      const lx = left + i * laneW;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Lane Flash / Held Beam shooting up the lane
    for (let l = 0; l < 4; l++) {
      const flash = Math.max(this.laneFlashes[l], this.laneHeld[l] ? 0.75 : 0);
      if (flash > 0.02) {
        const lx = left + l * laneW;
        const beamGrad = ctx.createLinearGradient(0, hitLineY, 0, 0);
        const col = this.laneColors[l];
        beamGrad.addColorStop(0, col + Math.round(flash * 120).toString(16).padStart(2, '0'));
        beamGrad.addColorStop(0.6, col + Math.round(flash * 35).toString(16).padStart(2, '0'));
        beamGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = beamGrad;
        ctx.fillRect(lx, 0, laneW, hitLineY);
      }
    }
    ctx.restore();
  }

  _drawNotes(ctx, left, laneW, hitLineY) {
    const currentSongTime = this.player.getSongTime();
    const approachTime = this.engine.approachTime;
    const pixelsPerSec = hitLineY / approachTime;

    const notes = this.engine.chart.notes;
    const noteH = 26; // High visibility note tile height

    ctx.save();
    // Clip notes strictly within highway and above the hitline bottom
    ctx.beginPath();
    ctx.rect(left - 4, 0, (laneW * 4) + 8, hitLineY + 18);
    ctx.clip();

    // Group notes by targetTime to draw connecting chord bars
    const activeNotesByTime = new Map();

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.judged) continue;

      const timeUntilHit = note.targetTime - currentSongTime;

      // Draw all notes currently approaching or momentarily passing
      if (timeUntilHit > approachTime + 0.1 || timeUntilHit < -0.15) {
        continue;
      }

      const noteY = hitLineY - (timeUntilHit * pixelsPerSec);
      const noteX = left + note.lane * laneW + 4;
      const noteWidth = laneW - 8;

      const tKey = note.targetTime.toFixed(3);
      if (!activeNotesByTime.has(tKey)) {
        activeNotesByTime.set(tKey, []);
      }
      activeNotesByTime.get(tKey).push({ note, noteX, noteY, noteWidth });
    }

    // 1. Draw horizontal chord laser beams
    activeNotesByTime.forEach((chordList) => {
      if (chordList.length > 1) {
        const sorted = chordList.sort((a, b) => a.noteX - b.noteX);
        const startX = sorted[0].noteX + sorted[0].noteWidth / 2;
        const endX = sorted[sorted.length - 1].noteX + sorted[sorted.length - 1].noteWidth / 2;
        const y = sorted[0].noteY;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // 2. Draw each individual glowing note tile
    activeNotesByTime.forEach((chordList) => {
      chordList.forEach(({ note, noteX, noteY, noteWidth }) => {
        const color = note.color;

        // Glowing trailing tail above note
        const trailLength = Math.min(32, pixelsPerSec * 0.1);
        if (trailLength > 4) {
          const trailGrad = ctx.createLinearGradient(0, noteY - trailLength, 0, noteY);
          trailGrad.addColorStop(0, 'transparent');
          trailGrad.addColorStop(1, color + '55');
          ctx.fillStyle = trailGrad;
          ctx.fillRect(noteX + 4, noteY - trailLength, noteWidth - 8, trailLength);
        }

        // Note Body
        ctx.fillStyle = color;
        ctx.shadowColor = this.reducedEffects ? 'transparent' : color;
        ctx.shadowBlur = this.reducedEffects ? 0 : 14;

        ctx.beginPath();
        ctx.roundRect(noteX, noteY - (noteH / 2), noteWidth, noteH, 7);
        ctx.fill();

        // Inner white shine streak
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.roundRect(noteX + 4, noteY - (noteH / 2) + 2, noteWidth - 8, 4, 2);
        ctx.fill();

        // White chord border
        if (note.isChord) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      });
    });

    ctx.restore();
  }

  _drawReceptors(ctx, left, laneW, hitLineY, pulse) {
    ctx.save();

    // Hitline neon beam across highway
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = this.reducedEffects ? 'transparent' : '#00f0ff';
    ctx.shadowBlur = this.reducedEffects ? 0 : 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, hitLineY);
    ctx.lineTo(left + laneW * 4, hitLineY);
    ctx.stroke();

    // Key receptor indicators for each lane (D, F, J, K)
    const keyLabels = ['D', 'F', 'J', 'K'];
    for (let l = 0; l < 4; l++) {
      const rx = left + l * laneW + 4;
      const rw = laneW - 8;
      const rh = 40;
      const ry = hitLineY - rh / 2;

      const isPressed = this.laneHeld[l] || this.laneFlashes[l] > 0.15;
      const col = this.laneColors[l];

      // Receptor background
      ctx.fillStyle = isPressed ? col : 'rgba(12, 18, 36, 0.9)';
      ctx.strokeStyle = isPressed ? '#ffffff' : col;
      ctx.lineWidth = isPressed ? 3 : 2;
      ctx.shadowColor = isPressed ? col : 'transparent';
      ctx.shadowBlur = isPressed ? 18 : 0;

      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 8);
      ctx.fill();
      ctx.stroke();

      // Key letter
      ctx.fillStyle = isPressed ? '#000000' : '#ffffff';
      ctx.font = '900 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(keyLabels[l], rx + rw / 2, ry + rh / 2);
    }

    ctx.restore();
  }

  _drawParticles(ctx, left, laneW, hitLineY, delta) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.xOffset += p.vx * delta;
      p.yOffset += p.vy * delta;
      p.vy += 320 * delta; // Gravity

      const alpha = Math.max(0, p.life / 0.5);
      const px = left + p.lane * laneW + (laneW / 2) + p.xOffset;
      const py = hitLineY + p.yOffset;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawJudgements(ctx, left, highwayWidth, hitLineY, delta) {
    if (this.activeJudgements.length === 0) return;

    ctx.save();
    const centerX = left + (highwayWidth / 2);

    for (let i = this.activeJudgements.length - 1; i >= 0; i--) {
      const j = this.activeJudgements[i];
      j.alpha -= delta * 1.8;
      j.y -= delta * 60; // Float upward
      j.scale = Math.max(1.0, j.scale - delta * 2.0);

      if (j.alpha <= 0) {
        this.activeJudgements.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = j.alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Primary Judgement text
      ctx.font = `900 ${Math.round(30 * j.scale)}px sans-serif`;
      ctx.fillStyle = j.color;
      ctx.shadowColor = this.reducedEffects ? 'transparent' : j.color;
      ctx.shadowBlur = this.reducedEffects ? 0 : 16;
      ctx.fillText(j.text, centerX, hitLineY - 80 + j.y);

      // Subtext (LATE / EARLY)
      if (j.subText) {
        ctx.font = `bold 13px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(j.subText, centerX, hitLineY - 55 + j.y);
      }
    }
    ctx.restore();
  }
}

window.HighwayVisualizer = HighwayVisualizer;
