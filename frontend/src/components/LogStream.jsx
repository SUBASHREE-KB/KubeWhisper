import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Info, AlertTriangle, AlertCircle, Bug, ChevronDown, Search } from 'lucide-react';

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
          text: 'text-cyber-red',
          bg: 'bg-cyber-red/5 hover:bg-cyber-red/10',
          Icon: AlertCircle
        };
      case 'CRITICAL':
        return {
          badge: 'badge badge-error',
          text: 'text-cyber-red',
          bg: 'bg-cyber-red/10 hover:bg-cyber-red/15',
          Icon: Bug
        };
      case 'WARN':
      case 'WARNING':
        return {
          badge: 'badge badge-warning',
          text: 'text-cyber-yellow',
          bg: 'hover:bg-white/5',
          Icon: AlertTriangle
        };
      case 'DEBUG':
        return {
          badge: 'bg-white/5 text-slate-500 border border-white/10 px-2 py-0.5 rounded text-xs',
          text: 'text-slate-500',
          bg: 'hover:bg-white/5 opacity-60',
          Icon: Info
        };
      default:
        return {
          badge: 'bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded text-xs',
          text: 'text-slate-300',
          bg: 'hover:bg-white/5',
          Icon: Info
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
    <div className="h-full flex flex-col bg-navy-900/30 rounded-xl border border-white/5 overflow-hidden relative">
      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto log-viewer"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Terminal className="w-8 h-8 mb-2" />
            <p className="text-sm">Waiting for logs...</p>
            <p className="text-xs mt-1">Logs will appear here when services emit them</p>
          </div>
        ) : (
          <div className="p-2">
            {logs.map((log) => {
              const styles = getLevelStyles(log.level);
              const isError = ['ERROR', 'CRITICAL'].includes(log.level);
              const Icon = styles.Icon;

              return (
                <div
                  key={log.id}
                  onClick={() => isError && onErrorClick?.(log)}
                  className={`flex items-start gap-3 py-2 px-3 rounded-lg mb-1 transition-colors ${styles.bg} ${
                    isError ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-slate-500 text-xs font-mono whitespace-nowrap flex-shrink-0">
                    {formatTime(log.timestamp)}
                  </span>

                  {/* Service */}
                  <span className="text-slate-400 text-xs whitespace-nowrap flex-shrink-0 min-w-[80px]">
                    {formatService(log.service)}
                  </span>

                  {/* Level badge */}
                  <span className={`${styles.badge} flex items-center gap-1 whitespace-nowrap flex-shrink-0`}>
                    <Icon className="w-3 h-3" />
                    <span>{log.level}</span>
                  </span>

                  {/* Message */}
                  <span className={`text-sm flex-1 break-words ${
                    isError ? 'text-cyber-red' : 'text-white'
                  }`}>
                    {log.message}
                  </span>

                  {/* Analyze hint for errors */}
                  {isError && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <Search className="w-3 h-3" />
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
          className="absolute bottom-4 right-4 flex items-center gap-1 px-3 py-2 bg-electric-500 text-white rounded-full shadow-lg hover:bg-electric-400 transition-colors text-sm font-medium"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Latest</span>
        </button>
      )}

      {/* Paused indicator */}
      {isPaused && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
          <div className="w-2 h-2 bg-cyber-yellow rounded-full" />
          <span className="text-xs text-cyber-yellow">Paused - Viewing historical logs</span>
        </div>
      )}
    </div>
  );
}

export default LogStream;
