import React from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';

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
      return <ErrorOutlineIcon sx={{ fontSize: 16, color: '#EF4444' }} />;
    }
    return <WarningAmberIcon sx={{ fontSize: 16, color: '#EF4444' }} />;
  };

  if (errors.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-bg-medium flex items-center justify-center">
          <ErrorOutlineIcon sx={{ fontSize: 24, color: '#737373' }} />
        </div>
        <p className="text-text-muted text-sm">No errors detected</p>
        <p className="text-text-muted text-xs mt-1">Your services are running smoothly</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-border-dark">
        {errors.map((error, index) => (
          <div
            key={error.id || index}
            className="p-4 hover:bg-bg-medium transition-colors cursor-pointer group"
            onClick={() => onAnalyze(error)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Level icon */}
                <div className="mt-0.5">
                  {getLevelIcon(error.level)}
                </div>

                {/* Error content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-error text-xs">
                      {error.level}
                    </span>
                    <span className="text-text-secondary text-xs">
                      {formatService(error.service)}
                    </span>
                  </div>

                  <p className="text-text-primary text-sm font-mono truncate">
                    {error.message}
                  </p>

                  <div className="flex items-center gap-1 mt-2 text-text-muted text-xs">
                    <AccessTimeIcon sx={{ fontSize: 12 }} />
                    <span>{formatTime(error.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Analyze button */}
              <button
                className="flex items-center gap-1 px-3 py-1.5 bg-bg-medium hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze(error);
                }}
              >
                <SearchIcon sx={{ fontSize: 14 }} />
                <span className="text-xs">Analyze</span>
                <ChevronRightIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentErrors;
