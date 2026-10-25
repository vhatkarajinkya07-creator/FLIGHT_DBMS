// Web Audio API sound synthesis for mechanical split-flaps and retro terminal controls
class TerminalAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("aero_sound_muted") === "true";
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("aero_sound_muted", this.muted.toString());
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Mechanical split flap click
  playFlapClick() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Sharp mechanical clack
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140 + Math.random() * 60, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.04);

      filter.type = "bandpass";
      filter.frequency.value = 800;
      filter.Q.value = 3;

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  }

  // Retro button chime
  playBeep(freq = 640, duration = 0.08) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  }

  // Positive access granted confirmation chime
  playGranted() {
    if (this.muted) return;
    this.playBeep(523.25, 0.06);
    setTimeout(() => this.playBeep(659.25, 0.06), 70);
    setTimeout(() => this.playBeep(783.99, 0.12), 140);
  }

  // Error alert beep
  playAlert() {
    if (this.muted) return;
    this.playBeep(320, 0.1);
    setTimeout(() => this.playBeep(260, 0.15), 110);
  }
}

export const terminalAudio = new TerminalAudio();
