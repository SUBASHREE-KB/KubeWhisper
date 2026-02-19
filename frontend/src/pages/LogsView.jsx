import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Filter,
  Search,
  Download,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Play,
  Pause
} from 'lucide-react';

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
  const [showFilters, setShowFilters] = useState(true);

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

  // Show error panel when analysis starts or completes
  useEffect(() => {
    if (currentAnalysis || isAnalyzing) {
      setShowErrorPanel(true);
    }
  }, [currentAnalysis, isAnalyzing]);

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
    <div className="h-full flex flex-col animate-fade-in -m-6">
      {/* Page Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-electric-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Log Viewer</h1>
              <p className="text-sm text-slate-400">Real-time log streaming with time travel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-lg transition-colors ${
                isPlaying
                  ? 'bg-cyber-green/20 text-cyber-green'
                  : 'bg-cyber-yellow/20 text-cyber-yellow'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass flex items-center gap-2 ${showFilters ? 'border-electric-500/50' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Timeline Player */}
        <div className="mt-4">
          <TimelinePlayer
            isPlaying={isPlaying}
            position={timelinePosition}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSeek={setTimelinePosition}
            totalLogs={logs.length}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Logs section */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search bar */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search logs by message or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-glass w-full pl-10 pr-4 py-2.5"
              />
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

        {/* Filters sidebar */}
        {showFilters && (
          <div className="w-80 flex flex-col border-l border-white/5 bg-navy-900/30">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-2 text-white">
                <Filter className="w-4 h-4" />
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
            <div className="p-4 border-t border-white/5">
              <div className="text-sm font-medium text-white mb-3">Statistics</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total</span>
                  <span className="text-white font-mono">{stats.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">Info</span>
                  </div>
                  <span className="text-slate-300 font-mono">{stats.info.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-cyber-yellow" />
                    <span className="text-slate-400">Warn</span>
                  </div>
                  <span className="text-cyber-yellow font-mono">{stats.warn.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-cyber-red" />
                    <span className="text-slate-400">Error</span>
                  </div>
                  <span className="text-cyber-red font-mono">{stats.error.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/5 flex gap-2">
              <button onClick={handleExport} className="btn-glass flex-1 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="btn-glass flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

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
