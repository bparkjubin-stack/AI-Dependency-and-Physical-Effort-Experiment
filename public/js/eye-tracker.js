/**
 * Eye Tracker — wraps WebGazer.js for gaze tracking.
 * Batches gaze data and sends to server via Socket.IO.
 */
class EyeTracker {
  constructor(socket, pid) {
    this.socket = socket;
    this.pid = pid;
    this.trialId = null;
    this.buffer = [];
    this.batchInterval = null;
    this.isTracking = false;
    this.regions = {};
  }

  /**
   * Define screen regions for gaze mapping.
   * Call after the trial layout is rendered.
   */
  defineRegions() {
    const dataPanel = document.querySelector('.panel-data');
    const chatPanel = document.querySelector('.panel-chat');
    const answerSection = document.querySelector('.answer-section');

    if (dataPanel) {
      const r = dataPanel.getBoundingClientRect();
      this.regions.data_panel = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    }
    if (chatPanel) {
      const r = chatPanel.getBoundingClientRect();
      this.regions.chat_panel = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    }
    if (answerSection) {
      const r = answerSection.getBoundingClientRect();
      this.regions.answer_area = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    }
  }

  /**
   * Map x,y coordinates to a named region.
   */
  getRegion(x, y) {
    for (const [name, bounds] of Object.entries(this.regions)) {
      if (x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2) {
        return name;
      }
    }
    return 'outside';
  }

  /**
   * Start tracking gaze for a specific trial.
   */
  startTracking(trialId) {
    if (!window.webgazer) {
      console.warn('[EyeTracker] WebGazer not loaded, skipping eye tracking.');
      return;
    }

    this.trialId = trialId;
    this.buffer = [];
    this.isTracking = true;
    this.defineRegions();

    // Set up gaze listener
    window.webgazer.setGazeListener((data, timestamp) => {
      if (!data || !this.isTracking) return;
      this.buffer.push({
        x: Math.round(data.x),
        y: Math.round(data.y),
        region: this.getRegion(data.x, data.y),
        t: timestamp
      });
    });

    // Batch send every 500ms
    this.batchInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.socket.emit('eyetracking:batch', {
          pid: this.pid,
          trial_id: this.trialId,
          points: this.buffer.splice(0)
        });
      }
    }, 500);
  }

  /**
   * Stop tracking and flush remaining data.
   */
  stopTracking() {
    this.isTracking = false;
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    // Flush remaining
    if (this.buffer.length > 0) {
      this.socket.emit('eyetracking:batch', {
        pid: this.pid,
        trial_id: this.trialId,
        points: this.buffer.splice(0)
      });
    }
  }
}
