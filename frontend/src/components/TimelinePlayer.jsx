import React, { useState, useRef, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';
import RestoreIcon from '@mui/icons-material/Restore';

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
      <div className="flex items-center gap-2 text-text-muted">
        <RestoreIcon sx={{ fontSize: 16 }} />
        <span className="text-xs font-medium">Time Travel</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={skipToStart}
          className="p-1.5 hover:bg-bg-medium rounded transition-colors text-text-secondary hover:text-text-primary"
          title="Skip to start"
        >
          <SkipPreviousIcon sx={{ fontSize: 18 }} />
        </button>

        <button
          onClick={skipBack}
          className="p-1.5 hover:bg-bg-medium rounded transition-colors text-text-secondary hover:text-text-primary"
          title="Skip back 10%"
        >
          <FastRewindIcon sx={{ fontSize: 18 }} />
        </button>

        <button
          onClick={onPlayPause}
          className={`p-2 rounded-lg transition-colors ${
            isPlaying
              ? 'bg-text-primary text-bg-darkest'
              : 'bg-bg-medium text-text-primary hover:bg-bg-hover'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <PauseIcon sx={{ fontSize: 20 }} />
          ) : (
            <PlayArrowIcon sx={{ fontSize: 20 }} />
          )}
        </button>

        <button
          onClick={skipForward}
          className="p-1.5 hover:bg-bg-medium rounded transition-colors text-text-secondary hover:text-text-primary"
          title="Skip forward 10%"
        >
          <FastForwardIcon sx={{ fontSize: 18 }} />
        </button>

        <button
          onClick={skipToEnd}
          className="p-1.5 hover:bg-bg-medium rounded transition-colors text-text-secondary hover:text-text-primary"
          title="Skip to end (live)"
        >
          <SkipNextIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      {/* Timeline Track */}
      <div className="flex-1 flex items-center gap-3">
        <div
          ref={trackRef}
          className="timeline-track flex-1"
          onClick={handleTrackClick}
          onMouseDown={handleMouseDown}
        >
          <div
            className="timeline-progress"
            style={{ width: `${position}%` }}
          >
            <div
              className="timeline-thumb"
              style={{ left: '100%' }}
            />
          </div>
        </div>

        {/* Position indicator */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-xs font-mono text-text-secondary">
            {visibleLogs.toLocaleString()}
          </span>
          <span className="text-xs text-text-muted">/</span>
          <span className="text-xs font-mono text-text-muted">
            {totalLogs.toLocaleString()}
          </span>
          <span className="text-xs text-text-muted">logs</span>
        </div>
      </div>

      {/* Live indicator */}
      {position >= 100 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-status-success/10 border border-status-success/30 rounded-lg">
          <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
          <span className="text-xs text-status-success font-medium">LIVE</span>
        </div>
      )}

      {position < 100 && (
        <button
          onClick={skipToEnd}
          className="flex items-center gap-2 px-3 py-1 bg-bg-medium hover:bg-bg-hover border border-border-light rounded-lg transition-colors"
        >
          <span className="text-xs text-text-secondary">Go to</span>
          <span className="text-xs text-text-primary font-medium">LIVE</span>
        </button>
      )}
    </div>
  );
}

export default TimelinePlayer;
