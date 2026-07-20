import { useState, useEffect } from "react";
import { audioService } from "../services/audio";

export function useAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    setIsMuted(audioService.isMuted());
    setVolumeState(audioService.getVolume());
  }, []);

  const toggleMuted = () => {
    const nextState = !audioService.isMuted();
    audioService.setMuted(nextState);
    setIsMuted(nextState);
  };

  const updateVolume = (val: number) => {
    audioService.setVolume(val);
    setVolumeState(val);
  };

  const playClick = () => audioService.playSound("/assets/audio/button-click.wav");
  const playBeep = () => audioService.playSound("/assets/audio/console-beep.wav");
  const playNotification = () => audioService.playSound("/assets/audio/notification.wav");
  const playWarning = (loop = false) => audioService.playSound("/assets/audio/warning-alarm.wav", loop);
  const stopWarning = () => audioService.stopSound("/assets/audio/warning-alarm.wav");

  return {
    isMuted,
    volume,
    toggleMuted,
    setVolume: updateVolume,
    playClick,
    playBeep,
    playNotification,
    playWarning,
    stopWarning,
  };
}
