import { IonIcon } from '@ionic/react';
import { pause, play } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageAttachment } from '../types/chat';
import { useAuthenticatedMediaUrl } from '../hooks/useAuthenticatedMediaUrl';

interface AudioMessageContentProps {
  messageId: string;
  attachment: MessageAttachment;
  isSent: boolean;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;
const WAVEFORM_BAR_COUNT = 40;

function generateWaveformBars(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Array.from({ length: count }, (_, index) => {
    const value = Math.abs(Math.sin((hash + index * 17) * 0.13) * 100);
    return 24 + (value % 76);
  });
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const AudioMessageContent: React.FC<AudioMessageContentProps> = ({
  messageId,
  attachment,
  isSent,
}) => {
  const mediaSrc = useAuthenticatedMediaUrl(messageId, attachment.url);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const waveformBars = useMemo(
    () => generateWaveformBars(messageId, WAVEFORM_BAR_COUNT),
    [messageId],
  );

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;
  const label = /^voice-note\./i.test(attachment.name) ? 'Nota de voz' : 'Áudio';

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((prev) => (prev + 1) % PLAYBACK_SPEEDS.length);
  }, []);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const audio = audioRef.current;
      const waveform = waveformRef.current;
      if (!audio || !waveform || duration <= 0) return;

      const rect = waveform.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      audio.currentTime = ratio * duration;
      setCurrentTime(audio.currentTime);
    },
    [duration],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = PLAYBACK_SPEEDS[speedIndex];
  }, [speedIndex, mediaSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    if (audio.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [mediaSrc]);

  if (!mediaSrc) {
    return (
      <div
        className={`wa-voice-note wa-voice-note--loading ${isSent ? 'wa-voice-note--sent' : 'wa-voice-note--received'}`}
        aria-busy="true"
        aria-label={`Carregando ${label.toLowerCase()}`}
      >
        <div className="wa-voice-note__play wa-voice-note__play--disabled" aria-hidden="true">
          <IonIcon icon={play} />
        </div>
        <div className="wa-voice-note__body">
          <div className="wa-voice-note__waveform wa-voice-note__waveform--loading">
            {waveformBars.map((height, index) => (
              <span
                key={index}
                className="wa-voice-note__bar"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <span className="wa-voice-note__time">--:--</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`wa-voice-note ${isSent ? 'wa-voice-note--sent' : 'wa-voice-note--received'}`}
      aria-label={label}
    >
      <audio ref={audioRef} src={mediaSrc} preload="metadata" className="wa-voice-note__audio" />

      <button
        type="button"
        className="wa-voice-note__play"
        onClick={() => void togglePlay()}
        aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        <IonIcon icon={isPlaying ? pause : play} />
      </button>

      <div className="wa-voice-note__body">
        <div
          ref={waveformRef}
          className="wa-voice-note__waveform"
          onClick={(event) => seekFromPointer(event.clientX)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Math.min(audio.currentTime + 2, duration);
            }
            if (event.key === 'ArrowLeft') {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Math.max(audio.currentTime - 2, 0);
            }
          }}
          role="slider"
          aria-label="Progresso do áudio"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          {waveformBars.map((height, index) => {
            const barProgress = (index + 1) / waveformBars.length;
            const isPlayed = barProgress <= progress;
            return (
              <span
                key={index}
                className={`wa-voice-note__bar ${isPlayed ? 'wa-voice-note__bar--played' : ''}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <span className="wa-voice-note__time">{formatAudioTime(displayTime)}</span>
      </div>

      <button
        type="button"
        className="wa-voice-note__speed"
        onClick={cycleSpeed}
        aria-label={`Velocidade de reprodução ${PLAYBACK_SPEEDS[speedIndex]}x`}
      >
        {PLAYBACK_SPEEDS[speedIndex]}x
      </button>
    </div>
  );
};

export default AudioMessageContent;
