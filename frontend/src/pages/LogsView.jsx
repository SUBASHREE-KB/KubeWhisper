import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import LogStream from '../components/LogStream';
import LogFilters from '../components/LogFilters';
import TimelinePlayer from '../components/TimelinePlayer';
import ErrorPanel from '../components/ErrorPanel';
import Settings from '../components/Settings';

function LogsView({
  connected,
  logs,
  metrics,
  currentAnalysis,
  generatedFix,
  isAnalyzing,
  isGeneratingFix,
  triggerAnalysis,
  generateFix,
  clearAnalysis
}) {
  const navigate = useNavigate();
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [timelinePosition, setTimelinePosition] = useState(100);

  // Filter states
  const [filters, setFilters] = useState({
    services: [],
    levels: ['WARN', 'ERROR', 'CRITICAL'],
    timeRange: 'all'
  });

  // Get unique services
  const availableServices = useMemo(() => {
    const services = new Set(logs.map(l => l.service).filter(Boolean));
    return Array.from(services);
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by services
    if (filters.services.length > 0) {
      result = result.filter(l => filters.services.includes(l.service));
    }

    // Filter by levels
    if (filters.levels.length > 0) {
      result = result.filter(l => filters.levels.includes(l.level));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.message?.toLowerCase().includes(query) ||
        l.service?.toLowerCase().includes(query)
      );
    }

    // Filter by timeline position (time travel)
    if (timelinePosition < 100 && result.length > 0) {
      const index = Math.floor((timelinePosition / 100) * result.length);
      result = result.slice(0, index);
    }

    return result;
  }, [logs, filters, searchQuery, timelinePosition]);

  // Log statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const info = logs.filter(l => l.level === 'INFO').length;
    const warn = logs.filter(l => l.level === 'WARN').length;
    const error = logs.filter(l => ['ERROR', 'CRITICAL'].includes(l.level)).length;
    return { total, info, warn, error };
  }, [logs]);

  // Show error panel when analysis completes
  useEffect(() => {
    if (currentAnalysis) {
      setShowErrorPanel(true);
    }
  }, [currentAnalysis]);

  // Handle error click
  const handleErrorClick = (errorLog) => {
    triggerAnalysis(errorLog.id);
    setShowErrorPanel(true);
  };

  // Handle dismiss panel
  const handleDismissPanel = () => {
    setShowErrorPanel(false);
    clearAnalysis();
  };

  // Export logs
  const handleExport = () => {
    const content = filteredLogs.map(l =>
      `[${l.timestamp}] [${l.service}] ${l.level}: ${l.message}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kubewhisper-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-bg-darkest text-text-primary">
      {/* Header */}
      <header className="bg-bg-dark border-b border-border-dark sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Back button and logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowBackIcon sx={{ fontSize: 20 }} />
                <span className="text-sm">Back to Dashboard</span>
              </button>

              <div className="w-px h-6 bg-border-dark" />

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-bg-medium border border-border-light rounded-lg flex items-center justify-center">
                  <DashboardIcon sx={{ fontSize: 18, color: '#FAFAFA' }} />
                </div>
                <span className="text-lg font-semibold">KubeWhisper</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 bg-bg-medium hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-all"
              >
                <SettingsIcon sx={{ fontSize: 20 }} />
              </button>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                connected
                  ? 'bg-status-success/10 border border-status-success/30'
                  : 'bg-status-error/10 border border-status-error/30'
              }`}>
                {connected ? (
                  <>
                    <WifiIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                    <span className="text-sm text-status-success">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOffIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                    <span className="text-sm text-status-error">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Player */}
      <div className="bg-bg-dark border-b border-border-dark px-6 py-3">
        <TimelinePlayer
          isPlaying={isPlaying}
          position={timelinePosition}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={setTimelinePosition}
          totalLogs={logs.length}
        />
      </div>

      {/* Main content */}
      <main className="flex" style={{ height: 'calc(100vh - 140px)', paddingBottom: showErrorPanel ? '40vh' : 0 }}>
        {/* Logs section - 70% */}
        <div className="flex-1 flex flex-col border-r border-border-dark">
          {/* Search bar */}
          <div className="p-4 border-b border-border-dark">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <SearchIcon sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full pl-10"
                />
              </div>
            </div>
          </div>

          {/* Log stream */}
          <div className="flex-1 overflow-hidden">
            <LogStream
              logs={filteredLogs}
              onErrorClick={handleErrorClick}
              isPaused={!isPlaying}
            />
          </div>
        </div>

        {/* Filters sidebar - 30% */}
        <div className="w-80 flex flex-col bg-bg-dark">
          <div className="p-4 border-b border-border-dark">
            <div className="flex items-center gap-2 text-text-primary">
              <FilterListIcon sx={{ fontSize: 18 }} />
              <span className="font-semibold">Filters</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <LogFilters
              filters={filters}
              onChange={setFilters}
              availableServices={availableServices}
            />
          </div>

          {/* Statistics */}
          <div className="p-4 border-t border-border-dark">
            <div className="text-sm font-medium text-text-primary mb-3">Statistics</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Total</span>
                <span className="text-text-primary font-mono">{stats.total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#A3A3A3' }} />
                  <span className="text-text-muted">Info</span>
                </div>
                <span className="text-text-secondary font-mono">{stats.info.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <WarningAmberIcon sx={{ fontSize: 14, color: '#EAB308' }} />
                  <span className="text-text-muted">Warn</span>
                </div>
                <span className="text-status-warning font-mono">{stats.warn.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ErrorOutlineIcon sx={{ fontSize: 14, color: '#EF4444' }} />
                  <span className="text-text-muted">Error</span>
                </div>
                <span className="text-status-error font-mono">{stats.error.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border-dark flex gap-2">
            <button onClick={handleExport} className="btn btn-secondary flex-1">
              <DownloadIcon sx={{ fontSize: 16 }} />
              Export
            </button>
            <button className="btn btn-secondary flex-1">
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              Clear
            </button>
          </div>
        </div>
      </main>

      {/* Error Panel */}
      {showErrorPanel && (
        <ErrorPanel
          analysis={currentAnalysis}
          generatedFix={generatedFix}
          isAnalyzing={isAnalyzing}
          isGeneratingFix={isGeneratingFix}
          onGenerateFix={generateFix}
          onDismiss={handleDismissPanel}
        />
      )}

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default LogsView;
