class EngineAudioService {
  private ctx: AudioContext | null = null;
  private humOsc1: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3; // Default master volume
  private isMuted: boolean = true;
  private alarmInterval: any = null;
  private alarmGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.error("Failed to initialize Web Audio API Context:", e);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    this.init();
    if (this.ctx && this.masterGain) {
      // Resume context if suspended by browser autoplay policy
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      const targetGain = mute ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  // Play a metallic, rising pitch sweep startup sound
  public playStartupSweep() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // Create oscillator and filter
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 2.5);

    filter.type = "lowpass";
    filter.Q.setValueAtTime(10, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 2.5);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 2.5);
  }

  // Play a descending pitch sweep shutdown sound
  public playShutdownSweep() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.linearRampToValueAtTime(30, now + 3.0);

    filter.type = "lowpass";
    filter.Q.setValueAtTime(5, now);
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.linearRampToValueAtTime(80, now + 3.0);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 3.0);
  }

  // Start continuous ambient machine hum (low frequency oscillations combination)
  public startHum() {
    this.init();
    if (!this.ctx || this.humOsc1) return;

    const now = this.ctx.currentTime;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.setValueAtTime(0, now);
    this.humGain.gain.linearRampToValueAtTime(0.4, now + 0.5); // Smooth fade in

    // Sub hum (55 Hz - Low G triangle wave)
    this.humOsc1 = this.ctx.createOscillator();
    this.humOsc1.type = "triangle";
    this.humOsc1.frequency.setValueAtTime(55, now);

    // Over hum (110 Hz - sine wave to make it feel rich)
    this.humOsc2 = this.ctx.createOscillator();
    this.humOsc2.type = "sine";
    this.humOsc2.frequency.setValueAtTime(110, now);

    // Dynamic wave modulation
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modOsc.frequency.setValueAtTime(1.5, now); // 1.5 Hz modulation cycle
    modGain.gain.setValueAtTime(1.0, now);

    modOsc.connect(modGain);
    modGain.connect(this.humOsc1.frequency); // Modulate pitch slightly to simulate current hum cycles

    this.humOsc1.connect(this.humGain);
    this.humOsc2.connect(this.humGain);
    this.humGain.connect(this.masterGain!);

    modOsc.start(now);
    this.humOsc1.start(now);
    this.humOsc2.start(now);
  }

  // Stop continuous ambient hum
  public stopHum() {
    if (!this.ctx || !this.humOsc1) return;

    const now = this.ctx.currentTime;
    if (this.humGain) {
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
      this.humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Smooth fade out
    }

    const osc1 = this.humOsc1!;
    const osc2 = this.humOsc2!;

    this.humOsc1 = null;
    this.humOsc2 = null;

    setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
      } catch (e) {
        // Safe check
      }
    }, 600);
  }

  // Start repeating emergency safety alarm pulse
  public startAlarm() {
    this.init();
    if (!this.ctx || this.alarmInterval || this.isMuted) return;

    this.alarmGain = this.ctx.createGain();
    this.alarmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.alarmGain.connect(this.masterGain!);

    const triggerAlarmPulse = () => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now); // Alternating pitch high
      osc1.frequency.setValueAtTime(660, now + 0.2); // Alternating pitch low
      
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(220, now);
      
      const pulseGain = this.ctx.createGain();
      pulseGain.gain.setValueAtTime(0.08, now);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      
      osc1.connect(pulseGain);
      osc2.connect(pulseGain);
      pulseGain.connect(this.alarmGain!);
      
      osc1.start(now);
      osc1.stop(now + 0.4);
      osc2.start(now);
      osc2.stop(now + 0.4);
    };

    triggerAlarmPulse();
    this.alarmInterval = setInterval(triggerAlarmPulse, 800);
  }

  // Stop emergency safety alarm pulse
  public stopAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.alarmGain) {
      this.alarmGain.disconnect();
      this.alarmGain = null;
    }
  }

  public destroy() {
    this.stopHum();
    this.stopAlarm();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Export singleton instance
export const engineAudio = new EngineAudioService();
