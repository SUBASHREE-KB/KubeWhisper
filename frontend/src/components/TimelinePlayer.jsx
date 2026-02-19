import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, History } from 'lucide-react';

function TimelinePlayer({
  isPlaying,
  position,
  onPlayPause,
  onSeek,
  totalLogs
}) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle track click
  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onSeek(percentage);
  };

  // Handle drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleTrackClick(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onSeek(percentage);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Skip controls
  const skipToStart = () => onSeek(0);
  const skipToEnd = () => onSeek(100);
  const skipBack = () => onSeek(Math.max(0, position - 10));
  const skipForward = () => onSeek(Math.min(100, position + 10));

  // Calculate visible logs based on position
  const visibleLogs = Math.floor((position / 100) * totalLogs);

  return (
    <div className="flex items-center gap-4">
      {/* Time Travel Label */}
      <div className="flex items-center gap-2 text-slate-400">
        <History className="w-4 h-4" />
        <span className="text-xs font-medium">Time Travel</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={skipToStart}
          className="p-1.5 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-white"
          title="Skip to start"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={skipBack}
          className="p-1.5 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-white"
          title="Skip back 10%"
        >
          <Rewind className="w-4 h-4" />
        </button>

        <button
          onClick={onPlayPause}
          className={`p-2 rounded-lg transition-colors ${
            isPlaying
              ? 'bg-electric-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={skipForward}
          className="p-1.5 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-white"
          title="Skip forward 10%"
        >
          <FastForward className="w-4 h-4" />
        </button>

        <button
          onClick={skipToEnd}
          className="p-1.5 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-white"
          title="Skip to end (live)"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline Track */}
      <div className="flex-1 flex items-center gap-3">
        <div
          ref={trackRef}
          className="flex-1 h-2 bg-white/10 rounded-full cursor-pointer relative"
          onClick={handleTrackClick}
          onMouseDown={handleMouseDown}
        >
          <div
            className="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full relative"
            style={{ width: `${position}%` }}
          >
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing"
              style={{ transform: 'translate(50%, -50%)' }}
            />
          </div>
        </div>

        {/* Position indicator */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-xs font-mono text-slate-300">
            {visibleLogs.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">/</span>
          <span className="text-xs font-mono text-slate-500">
            {totalLogs.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">logs</span>
        </div>
      </div>

      {/* Live indicator */}
      {position >= 100 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-cyber-green/10 border border-cyber-green/30 rounded-lg">
          <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse" />
          <span className="text-xs text-cyber-green font-medium">LIVE</span>
        </div>
      )}

      {position < 100 && (
        <button
          onClick={skipToEnd}
          className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          <span className="text-xs text-slate-400">Go to</span>
          <span className="text-xs text-white font-medium">LIVE</span>
        </button>
      )}
    </div>
  );
}

export default TimelinePlayer;
