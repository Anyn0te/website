"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo, ChangeEvent } from "react";

interface AudioPlayerProps {
  src: string;
}

const formatTime = (seconds: number): string => {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');
  return `${minutes}:${paddedSeconds}`;
};

const AudioPlayer = ({ src }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
        audioRef.current.currentTime = 0; 
    }
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      }
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handleEnded, handlePlay, handlePause]);

  const handleProgressChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(event.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);
  
  const progressPercent = useMemo(() => 
    duration > 0 ? (currentTime / duration) * 100 : 0, 
    [currentTime, duration]
  );

  const timeDisplayShort = useMemo(() => 
    `${formatTime(currentTime)} / ${formatTime(duration)}`,
    [currentTime, duration]
  );
  
  const isReady = duration > 0 && !Number.isNaN(duration);
  const cuePoints = useMemo(() => [
    { position: 20 }, 
    { position: 50 },
    { position: 75 },
    { position: 98 },
  ], []);


  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-[color:var(--color-audio-bg)] p-3 shadow-inner">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button
        type="button"
        onClick={togglePlayPause}
        disabled={!isReady}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
            isPlaying 
                ? 'bg-[color:var(--color-accent-hover)]' 
                : 'bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)]'
        } text-[color:var(--color-on-accent)] focus:outline-none flex-shrink-0`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        <i className={`bi bi-${isPlaying ? 'pause-fill' : 'play-fill'} text-xl`} aria-hidden="true" />
      </button>

      <div className="relative flex flex-1 items-center h-14">
        
        <span className="text-sm font-semibold text-[color:var(--color-text-primary)] mr-4 whitespace-nowrap opacity-80">
            {isReady ? timeDisplayShort : 'Loading...'}
        </span>

        <div className="relative flex-1 h-3 rounded-full" aria-hidden="true">
            
            <div className="absolute inset-0 h-full rounded-full bg-[color:var(--color-text-muted)] opacity-50" />
            
            {cuePoints.map((cue, index) => (
                <div 
                    key={index}
                    className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full pointer-events-none bg-[color:var(--color-accent)]`}
                    style={{ left: `calc(${cue.position}% - 6px)`, 
                             opacity: cue.position < progressPercent ? 1 : 0.6 }}
                    aria-hidden="true"
                />
            ))}

            <div
                className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow-md pointer-events-none transition-all duration-100 border-2 border-[color:var(--color-accent)]`}
                style={{ left: `calc(${progressPercent}% - 10px)` }}
                aria-hidden="true"
            />
            
            <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                step="0.01"
                onChange={handleProgressChange}
                disabled={!isReady}
                className="absolute inset-0 z-10 w-full h-full opacity-0 appearance-none cursor-pointer"
                aria-label="Audio progress slider"
            />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;