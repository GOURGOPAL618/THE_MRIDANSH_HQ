"use client";

// Client-side Audio registry managing playing sounds and ambient loops.
class AudioService {
  private muted: boolean = false;
  private volume: number = 0.5;
  private activeSounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // Read user audio setting from localStorage on load if in browser
    if (typeof window !== "undefined") {
      try {
        const storedMute = window.localStorage.getItem("mridansh_audio_muted");
        this.muted = storedMute ? JSON.parse(storedMute) : false;
        
        const storedVolume = window.localStorage.getItem("mridansh_audio_volume");
        this.volume = storedVolume ? JSON.parse(storedVolume) : 0.5;
      } catch (e) {
        console.warn("Error reading audio settings from localStorage", e);
      }
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("mridansh_audio_muted", JSON.stringify(muted));
      } catch (e) {
        console.warn(e);
      }
    }
    // Stop all playing loops if muted
    if (muted) {
      this.activeSounds.forEach((audio) => {
        if (audio.loop) {
          audio.pause();
        }
      });
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("mridansh_audio_volume", JSON.stringify(this.volume));
      } catch (e) {
        console.warn(e);
      }
    }
    // Update playing volume for active loops
    this.activeSounds.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  public getVolume(): number {
    return this.volume;
  }

  public playSound(soundPath: string, loop: boolean = false) {
    if (this.muted || typeof window === "undefined") {
      return;
    }

    try {
      // For performance and state management, track playing loops
      if (loop && this.activeSounds.has(soundPath)) {
        const existing = this.activeSounds.get(soundPath);
        if (existing && existing.paused) {
          existing.play().catch((e) => console.log("Audio playback blocked by browser", e));
        }
        return;
      }

      const audio = new Audio(soundPath);
      audio.volume = this.volume;
      audio.loop = loop;

      if (loop) {
        this.activeSounds.set(soundPath, audio);
      }

      audio.play().catch((e) => {
        // Log to dev console silently to avoid cluttering UX
        console.log("Audio play blocked until user interaction:", e.message);
      });

      // Cleanup single-shot plays
      if (!loop) {
        audio.onended = () => {
          audio.remove();
        };
      }
    } catch (error) {
      console.warn(`Failed to play sound: ${soundPath}`, error);
    }
  }

  public stopSound(soundPath: string) {
    if (this.activeSounds.has(soundPath)) {
      const audio = this.activeSounds.get(soundPath);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.remove();
      }
      this.activeSounds.delete(soundPath);
    }
  }
}

export const audioService = new AudioService();
export default audioService;
