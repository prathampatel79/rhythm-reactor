/**
 * Rhythm Reactor - Input Controller
 * Handles keyboard (D, F, J, K) and multi-touch mobile controls.
 * Provides key-down debounce (prevents holding key repeats from scoring multiple notes)
 * and dispatches lane press/release events.
 */

class InputController {
  constructor() {
    // Default key mappings
    this.keyMap = {
      'd': 0, 'D': 0,
      'f': 1, 'F': 1,
      'j': 2, 'J': 2,
      'k': 3, 'K': 3
    };

    // Tracks pressed state per lane to prevent keyboard repeat spam
    this.lanePressed = [false, false, false, false];

    // Callback hooks
    this.onLanePress = null;   // (laneIndex) => void
    this.onLaneRelease = null; // (laneIndex) => void
    this.onExitPress = null;   // () => void

    this.isListening = false;

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
  }

  startListening() {
    if (this.isListening) return;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.isListening = true;
  }

  stopListening() {
    if (!this.isListening) return;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.lanePressed = [false, false, false, false];
    this.isListening = false;
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (this.onExitPress) this.onExitPress();
      return;
    }

    const key = e.key;
    if (this.keyMap.hasOwnProperty(key)) {
      e.preventDefault();
      const lane = this.keyMap[key];

      // Ignore if OS repeat event
      if (e.repeat || this.lanePressed[lane]) {
        return;
      }

      this.lanePressed[lane] = true;
      if (this.onLanePress) {
        this.onLanePress(lane);
      }
    }
  }

  _handleKeyUp(e) {
    const key = e.key;
    if (this.keyMap.hasOwnProperty(key)) {
      e.preventDefault();
      const lane = this.keyMap[key];
      this.lanePressed[lane] = false;

      if (this.onLaneRelease) {
        this.onLaneRelease(lane);
      }
    }
  }

  /**
   * Directly triggers a lane press (used by mobile on-screen touch buttons)
   */
  triggerPress(lane) {
    if (lane >= 0 && lane < 4) {
      this.lanePressed[lane] = true;
      if (this.onLanePress) {
        this.onLanePress(lane);
      }
    }
  }

  /**
   * Directly triggers a lane release
   */
  triggerRelease(lane) {
    if (lane >= 0 && lane < 4) {
      this.lanePressed[lane] = false;
      if (this.onLaneRelease) {
        this.onLaneRelease(lane);
      }
    }
  }
}

window.InputController = InputController;
