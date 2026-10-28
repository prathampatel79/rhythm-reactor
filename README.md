# ⚡ Rhythm Reactor: Arcade Edition ⚡

> A high-octane neon rhythm arcade game powered by multi-track procedural synthesis via the **Web Audio API**. Zero external audio files, zero CDN dependencies, 100% offline-ready, with beat-synchronized deterministic note charts.

🎮 **PLAY LIVE ONLINE (GitHub Pages)**:  
👉 **[https://prathampatel79.github.io/rhythm-reactor/](https://prathampatel79.github.io/rhythm-reactor/)**

---

## 🎮 How to Start the Game

You can run Rhythm Reactor locally in seconds using any of the following methods:

### Method 1: Python HTTP Server (Quick & Standard)
From the `rhythm-reactor` folder:
```bash
python3 -m http.server 8080
```
Then open your browser and navigate to:
```
http://localhost:8080
```

### Method 2: Node.js / NPM
```bash
npx serve -l 8080 .
```
Or:
```bash
npm start
```
Then open:
```
http://localhost:8080
```

### Method 3: Direct Browser Launch
Simply double-click or open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

---

## 🎵 Track Library (5 Original Compositions)

All tracks are synthesized in real-time using Web Audio oscillators, custom noise buffers, bi-quad filters, exponential envelopes, and spatial delays:

| Track | Genre | Tempo | Style & Instruments |
| :--- | :--- | :--- | :--- |
| **Neon Pulse** | Electronic / Cyber Club | 110 BPM | 4-on-the-floor electro kicks, 16th hats, rolling bassline, synth brass lead, atmospheric minor chords |
| **Cyber Rush** | Fast Synthwave / Outrun | 140 BPM | High-speed 16th galloping bass, gated reverb snare, screaming dual-saw lead, sunset arpeggios |
| **Pixel Dreams** | Cheerful Chiptune | 100 BPM | Bouncy NES-style 8-bit pulse square waves, triangle bass walk, chiptune noise snare, happy major melodies |
| **Midnight Drive** | Atmospheric Electronic / Chillwave | 120 BPM | Warm sub-bass, dreamy Em7/Cmaj7 pads, smooth rim claps, lush pentatonic lead with echo delay |
| **Boss Beat** | Arcade Hardcore / Industrial Rave | 160 BPM | Overdriven punch kicks, breakbeat snare fills, high-tension siren lead, acid synth arpeggios |

Each track features:
- **Full Song Structures**: Intro, Main Groove, Variation/Build, Climax Drop, and Outro.
- **Audio Previews**: Click **"PREVIEW TRACK"** on the Song Selection screen to hear a 10-second high-energy hook before launching.

---

## 🕹️ Controls

### Keyboard Controls:
- **Lane 1 (Left - Cyan)**: `D`
- **Lane 2 (Mid-Left - Magenta)**: `F`
- **Lane 3 (Mid-Right - Gold)**: `J`
- **Lane 4 (Right - Green)**: `K`
- **Exit / Return to Song Selection**: `Escape` or the in-game `◀ EXIT` button
- **Quick Mute / Unmute**: `M`

### Mobile & Touch Controls:
- Four dedicated on-screen touch pads at the bottom of the highway (`D`, `F`, `J`, `K`) with multi-touch support and glowing feedback.

---

## 🎯 Gameplay Mechanics & Synchronization

### 1. Web Audio Clock Synchronization
- Gameplay timing does **not** rely on `requestAnimationFrame` frame counters or accumulation.
- Note positions and judgements are synchronized directly with `AudioContext.currentTime`.
- If the browser experiences a brief frame drop or background tab switch, notes remain locked to the music and will not desync.

### 2. Difficulty Tiers
- **EASY**: Focuses on primary kicks and snares on strong downbeats. Generous timing windows (PERFECT ±70ms, GOOD ±140ms). Single notes only.
- **NORMAL**: Kicks, snares, claps, and melodic accents. Quarter and eighth note rhythms with alternating lane patterns (PERFECT ±50ms, GOOD ±100ms).
- **HARD**: Full rhythmic fidelity: 16th note subdivisions, drum fills, rapid finger rolls, and simultaneous 2-lane chords (PERFECT ±35ms, GOOD ±75ms).

### 3. Anti-Double-Hit Protection
- Single key taps consume only the closest active unhit note in that lane within the judgement window. Holding keys down will not score consecutive notes accidentally.

### 4. Combo Multipliers & Scoring
- **PERFECT**: `300 + (50 * Multiplier)`
- **GOOD**: `150 + (25 * Multiplier)`
- **MISS**: `0` (Breaks combo streak)
- **Multipliers**:
  - `1x`: 0 - 9 Combo
  - `2x`: 10 - 19 Combo
  - `3x`: 20 - 39 Combo
  - `4x`: 40+ Combo

### 5. Grades & Achievements
- **Grade S**: Accuracy ≥ 95.0%
- **Grade A**: Accuracy ≥ 90.0%
- **Grade B**: Accuracy ≥ 80.0%
- **Grade C**: Accuracy ≥ 70.0%
- **Grade D**: Accuracy < 70.0%
- **FULL COMBO**: Complete the song with zero misses.
- **ALL PERFECT**: Complete the song with 100% Perfect judgements.
- High scores and grades are automatically persisted in `localStorage`.

---

## ⚙️ Audio Settings & Latency Calibration

Click the **⚙️ Settings** icon to access:
- **Master, Music, and SFX Volume Sliders**.
- **Note Scroll Speed** (0.7x to 1.8x).
- **Reduced Effects Mode**: Disables particle explosions and complex blurs for smooth 60 FPS on lower-powered devices.
- **Interactive Latency Calibration**: An integrated metronome assistant where you tap 8 times to the beat to auto-calculate your hardware's audio/input latency offset (-150ms to +150ms).

---

## 📁 Project Structure

```
rhythm-reactor/
├── index.html               # Main SPA markup & HUD overlays
├── package.json             # Project metadata & start scripts
├── README.md                # Documentation & launch instructions
├── css/
│   ├── style.css            # Base styles, song cards, results, settings
│   └── game.css             # Highway, lanes, receptors, HUD, touch controls
└── js/
    ├── audio/
    │   ├── synth-engine.js  # Procedural drums, bass, leads, chords, SFX
    │   ├── song-player.js   # Lookahead Web Audio scheduler & preview player
    │   └── songs-data.js    # 5 multi-track procedural compositions
    ├── game/
    │   ├── chart-builder.js # Deterministic note chart generator
    │   ├── engine.js        # Core game loop, judgements, score calculation
    │   ├── input.js         # Debounced keyboard & touch input controller
    │   └── visualizer.js    # 3D perspective grid, highway, particles
    ├── ui/
    │   ├── song-select.js   # Song carousel & animated procedural covers
    │   ├── results.js       # Results screen, grade badges & high scores
    │   └── settings.js      # Volume sliders, latency calibration tool
    └── app.js               # Application bootstrap & state coordinator
```

---

## 🚀 License

MIT License. Designed and built for arcade rhythm enthusiasts.
