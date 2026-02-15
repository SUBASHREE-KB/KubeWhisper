import React, { useEffect, useRef, useState } from 'react';
import TerminalIcon from '@mui/icons-material/Terminal';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BugReportIcon from '@mui/icons-material/BugReport';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';

function LogStream({ logs = [], onErrorClick, isPaused = false }) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && !isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  // Handle scroll
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  // Get log level styles
  const getLevelStyles = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return {
          badge: 'badge badge-error',
          text: 'text-status-error',
          bg: 'bg-status-error/5 hover:bg-status-error/10',
          icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} />
        };
      case 'CRITICAL':
        return {
          badge: 'badge badge-error',
          text: 'text-status-error',
          bg: 'bg-status-error/10 hover:bg-status-error/15',
          icon: <BugReportIcon sx={{ fontSize: 14 }} />
        };
      case 'WARN':
      case 'WARNING':
        return {
          badge: 'badge badge-warning',
          text: 'text-status-warning',
          bg: 'hover:bg-bg-medium',
          icon: <WarningAmberIcon sx={{ fontSize: 14 }} />
        };
      case 'DEBUG':
        return {
          badge: 'bg-bg-medium text-text-muted border border-border-dark px-2 py-0.5 rounded text-xs',
          text: 'text-text-muted',
          bg: 'hover:bg-bg-medium opacity-60',
          icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />
        };
      default:
        return {
          badge: 'bg-bg-medium text-text-secondary border border-border-dark px-2 py-0.5 rounded text-xs',
          text: 'text-text-secondary',
          bg: 'hover:bg-bg-medium',
          icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />
        };
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      });
    } catch {
      return timestamp;
    }
  };

  // Format service name
  const formatService = (service) => {
    return service
      ?.replace('kubewhisper-', '')
      ?.split('-')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || service;
  };

  return (
    <div className="h-full flex flex-col bg-bg-dark rounded-lg border border-border-dark overflow-hidden">
      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto log-viewer"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <TerminalIcon sx={{ fontSize: 32, marginBottom: '0.5rem' }} />
            <p className="text-sm">Waiting for logs...</p>
            <p className="text-xs mt-1">Logs will appear here when services emit them</p>
          </div>
        ) : (
          <div className="p-2">
            {logs.map((log) => {
              const styles = getLevelStyles(log.level);
              const isError = ['ERROR', 'CRITICAL'].includes(log.level);

              return (
                <div
                  key={log.id}
                  onClick={() => isError && onErrorClick?.(log)}
                  className={`flex items-start gap-3 py-2 px-3 rounded-lg mb-1 transition-colors ${styles.bg} ${
                    isError ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-text-muted text-xs font-mono whitespace-nowrap flex-shrink-0">
                    {formatTime(log.timestamp)}
                  </span>

                  {/* Service */}
                  <span className="text-text-secondary text-xs whitespace-nowrap flex-shrink-0 min-w-[80px]">
                    {formatService(log.service)}
                  </span>

                  {/* Level badge */}
                  <span className={`${styles.badge} flex items-center gap-1 whitespace-nowrap flex-shrink-0`}>
                    {styles.icon}
                    <span>{log.level}</span>
                  </span>

                  {/* Message */}
                  <span className={`text-sm flex-1 break-words ${
                    isError ? 'text-status-error' : 'text-text-primary'
                  }`}>
                    {log.message}
                  </span>

                  {/* Analyze hint for errors */}
                  {isError && (
                    <span className="text-xs text-text-muted flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <SearchIcon sx={{ fontSize: 12 }} />
                      Click to analyze
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 flex items-center gap-1 px-3 py-2 bg-text-primary text-bg-darkest rounded-full shadow-lg hover:bg-text-secondary transition-colors text-sm font-medium"
        >
          <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
          <span>Latest</span>
        </button>
      )}

      {/* Paused indicator */}
      {isPaused && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-status-warning/10 border border-status-warning/30 rounded-lg">
          <div className="w-2 h-2 bg-status-warning rounded-full" />
          <span className="text-xs text-status-warning">Paused - Viewing historical logs</span>
        </div>
      )}
    </div>
  );
}

export default LogStream;
