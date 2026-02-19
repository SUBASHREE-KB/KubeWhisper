import React from 'react';
import { AlertCircle, AlertTriangle, Clock, Search, ChevronRight, CheckCircle } from 'lucide-react';

function RecentErrors({ errors, onAnalyze }) {
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format service name
  const formatService = (name) => {
    return name
      ?.replace('kubewhisper-', '')
      ?.split('-')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || 'Unknown';
  };

  // Get level icon
  const getLevelIcon = (level) => {
    if (level === 'CRITICAL') {
      return <AlertCircle className="w-4 h-4 text-cyber-red" />;
    }
    return <AlertTriangle className="w-4 h-4 text-cyber-red" />;
  };

  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-cyber-green/20 flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-cyber-green" />
        </div>
        <p className="text-white font-medium">No errors detected</p>
        <p className="text-slate-500 text-sm mt-1">Your services are running smoothly</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errors.slice(0, 5).map((error, index) => (
        <div
          key={error.id || index}
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
          onClick={() => onAnalyze(error)}
        >
          <div className="flex items-start gap-3">
            {/* Level icon */}
            <div className="mt-0.5 flex-shrink-0">
              {getLevelIcon(error.level)}
            </div>

            {/* Error content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-error text-xs">
                  {error.level}
                </span>
                <span className="text-slate-400 text-xs">
                  {formatService(error.service)}
                </span>
              </div>

              <p className="text-white text-sm font-mono truncate">
                {error.message}
              </p>

              <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>{formatTime(error.timestamp)}</span>
              </div>
            </div>

            {/* Analyze button */}
            <button
              className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-electric-500/20 rounded-lg text-slate-400 hover:text-electric-400 transition-all opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(error);
              }}
            >
              <Search className="w-3 h-3" />
              <span className="text-xs">Analyze</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RecentErrors;
