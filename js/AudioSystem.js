// Web Audio API Synthesizer - Realistic sound effects without external audio files
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
      this.startAmbientBreeze();
    } catch (e) {
      console.warn("AudioContext failed to initialize:", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Realistic Net Swing Whoosh
  playSwingSound() {
    if (!this.isInitialized || this.muted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.24);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.25);
  }

  // Successful Catch Chime
  playCatchSound(combo = 1) {
    if (!this.isInitialized || this.muted) return;
    const now = this.ctx.currentTime;
    const baseFreq = 440 * Math.pow(1.08, Math.min(combo, 10));

    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.45);
    });
  }

  // Footstep sound on grass/soil
  playFootstep() {
    if (!this.isInitialized || this.muted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450 + Math.random() * 100, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.08);
  }

  // Ambient Nature Breeze
  startAmbientBreeze() {
    if (!this.ctx || this.muted) return;
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02; // Pink noise approx
      lastOut = data[i];
    }

    const ambientNoise = this.ctx.createBufferSource();
    ambientNoise.buffer = buffer;
    ambientNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    ambientNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    ambientNoise.start(0);
  }

  // Positional Insect Buzz
  playInsectBuzz(distance) {
    if (!this.isInitialized || this.muted || distance > 25) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = 180 + Math.random() * 80;
    osc.frequency.setValueAtTime(baseFreq, now);

    // subtle pitch vibration
    osc.frequency.linearRampToValueAtTime(baseFreq + 20, now + 0.05);
    osc.frequency.linearRampToValueAtTime(baseFreq - 15, now + 0.1);

    const vol = Math.max(0, (1 - distance / 25) * 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }
}

window.AudioSystem = AudioSystem;
