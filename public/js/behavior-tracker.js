/**
 * Behavior Tracker — records user interactions on the trial page.
 * Sends events to server via Socket.IO.
 */
class BehaviorTracker {
  constructor(socket, pid, trialId) {
    this.socket = socket;
    this.pid = pid;
    this.trialId = trialId;
    this.lastActivePanel = null;
    this.panelSwitchCount = 0;
    this.startTime = Date.now();
    this.events = [];
  }

  init() {
    // Track panel focus (data panel vs chat panel)
    const dataPanel = document.querySelector('.panel-data');
    const chatPanel = document.querySelector('.panel-chat');

    if (dataPanel) {
      dataPanel.addEventListener('click', () => this.onPanelSwitch('data_panel'));
      dataPanel.addEventListener('scroll', () => this.onPanelScroll('data_panel'), { passive: true });
    }
    if (chatPanel) {
      chatPanel.addEventListener('click', () => this.onPanelSwitch('chat_panel'));
    }

    // Track data table hover/inspection
    const tableRows = document.querySelectorAll('.data-table tr');
    tableRows.forEach((row, i) => {
      row.addEventListener('mouseenter', () => {
        this.emit('table_row_hover', { row_index: i });
      });
    });

    // Track answer changes
    document.addEventListener('change', (e) => {
      if (e.target.name === 'answer') {
        this.emit('answer_change', { value: e.target.value, time_since_start: Date.now() - this.startTime });
      }
    });
  }

  onPanelSwitch(panel) {
    if (this.lastActivePanel && this.lastActivePanel !== panel) {
      this.panelSwitchCount++;
      this.emit('panel_switch', {
        from: this.lastActivePanel,
        to: panel,
        switch_count: this.panelSwitchCount
      });
    }
    this.lastActivePanel = panel;
  }

  onPanelScroll(panel) {
    // Throttle scroll events
    if (this._scrollThrottle) return;
    this._scrollThrottle = true;
    setTimeout(() => { this._scrollThrottle = false; }, 1000);
    this.emit('panel_scroll', { panel });
  }

  trackChatSend(message) {
    this.emit('chat_send', {
      message_length: message.length,
      time_since_start: Date.now() - this.startTime
    });
  }

  trackConfidenceChange(value) {
    this.emit('confidence_change', { value, time_since_start: Date.now() - this.startTime });
  }

  emit(eventType, details) {
    const event = {
      pid: this.pid,
      trial_id: this.trialId,
      event_type: eventType,
      details,
      timestamp: new Date().toISOString()
    };
    this.events.push(event);
    this.socket.emit('behavior:event', event);
  }

  getSummary() {
    return {
      total_events: this.events.length,
      panel_switches: this.panelSwitchCount,
      duration_ms: Date.now() - this.startTime
    };
  }
}
