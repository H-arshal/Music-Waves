(() => {
if (window.__audio_loaded) return;
window.__audio_loaded = true;

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.fftSize = 512;
    this.smoothing = 0.8;
    this.dataArray = null;
    this.frequencyData = null;
    this.isActive = false;
    this.listeners = [];
    this.animFrame = null;
    this.bassHistory = [];
    this.trebleHistory = [];
    this.historySize = 40;
  }

  async init(streamId) {
    this.destroy();

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      }
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothing;

    this.source.connect(this.analyser);
    // Route audio to destination so the user can still hear it —
    // tabCapture redirects audio away from the tab, so we must play it back here
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.isActive = true;
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this._loop();
  }

  _loop() {
    if (!this.isActive) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.dataArray);

    const bass = this._getRange(0, 0.1);
    const mid = this._getRange(0.1, 0.5);
    const treble = this._getRange(0.5, 1.0);
    const overall = this._getRange(0, 1.0);

    // Beat Detection Engine
    this.bassHistory.push(bass);
    if (this.bassHistory.length > this.historySize) this.bassHistory.shift();
    
    this.trebleHistory.push(treble);
    if (this.trebleHistory.length > this.historySize) this.trebleHistory.shift();

    const avgBass = this.bassHistory.reduce((a, b) => a + b, 0) / (this.bassHistory.length || 1);
    const avgTreble = this.trebleHistory.reduce((a, b) => a + b, 0) / (this.trebleHistory.length || 1);

    // Dynamic threshold: current energy must be > 1.4x the recent average
    const isKick = bass > avgBass * 1.4 && bass > 0.1;
    const isSnare = treble > avgTreble * 1.4 && treble > 0.05;

    const snapshot = {
      frequency: Array.from(this.frequencyData),
      waveform: Array.from(this.dataArray),
      bass,
      mid,
      treble,
      overall,
      isKick,
      isSnare,
      timestamp: performance.now()
    };

    for (const cb of this.listeners) {
      cb(snapshot);
    }

    this.animFrame = setTimeout(() => this._loop(), 16);
  }

  _getRange(low, high) {
    const data = this.frequencyData;
    const start = Math.floor(low * data.length);
    const end = Math.floor(high * data.length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  onData(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  setFFTSize(size) {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = size;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  setSmoothing(value) {
    this.smoothing = value;
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = value;
    }
  }

  destroy() {
    this.isActive = false;
    if (this.animFrame) {
      clearTimeout(this.animFrame);
    }
    if (this.source) {
      this.source.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.dataArray = null;
    this.frequencyData = null;
    this.bassHistory = [];
    this.trebleHistory = [];
  }
}

window.AudioProcessor = AudioProcessor;

})();
