import React from 'react';
import { Info, AlertTriangle, AlertCircle, Bug, Check } from 'lucide-react';

function LogFilters({ filters, onChange, availableServices }) {
  // Log levels configuration
  const logLevels = [
    { value: 'INFO', label: 'Info', Icon: Info, color: 'text-slate-400' },
    { value: 'WARN', label: 'Warning', Icon: AlertTriangle, color: 'text-cyber-yellow' },
    { value: 'ERROR', label: 'Error', Icon: AlertCircle, color: 'text-cyber-red' },
    { value: 'CRITICAL', label: 'Critical', Icon: Bug, color: 'text-cyber-red' },
    { value: 'DEBUG', label: 'Debug', Icon: Info, color: 'text-slate-500' }
  ];

  // Time range options
  const timeRanges = [
    { value: 'all', label: 'All Time' },
    { value: '5m', label: 'Last 5 minutes' },
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last hour' },
    { value: '24h', label: 'Last 24 hours' }
  ];

  // Toggle service filter
  const toggleService = (service) => {
    const newServices = filters.services.includes(service)
      ? filters.services.filter(s => s !== service)
      : [...filters.services, service];
    onChange({ ...filters, services: newServices });
  };

  // Toggle level filter
  const toggleLevel = (level) => {
    const newLevels = filters.levels.includes(level)
      ? filters.levels.filter(l => l !== level)
      : [...filters.levels, level];
    onChange({ ...filters, levels: newLevels });
  };

  // Update time range
  const setTimeRange = (range) => {
    onChange({ ...filters, timeRange: range });
  };

  // Format service name
  const formatService = (name) => {
    return name
      ?.replace('kubewhisper-', '')
      ?.split('-')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || name;
  };

  // Select all / clear all for a filter type
  const selectAllServices = () => {
    onChange({ ...filters, services: [] }); // Empty means all selected
  };

  const selectAllLevels = () => {
    onChange({ ...filters, levels: logLevels.map(l => l.value) });
  };

  const clearAllLevels = () => {
    onChange({ ...filters, levels: [] });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Services Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Services</span>
          <button
            onClick={selectAllServices}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            {filters.services.length === 0 ? 'All selected' : 'Select all'}
          </button>
        </div>
        <div className="space-y-2">
          {availableServices.map((service) => {
            const isSelected = filters.services.length === 0 || filters.services.includes(service);
            return (
              <label
                key={service}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-electric-500 border-electric-500'
                      : 'border-white/20 bg-transparent'
                  }`}
                  onClick={() => toggleService(service)}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-slate-300">{formatService(service)}</span>
              </label>
            );
          })}
          {availableServices.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-2">No services detected</p>
          )}
        </div>
      </div>

      {/* Log Levels Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Log Levels</span>
          <div className="flex gap-2">
            <button
              onClick={selectAllLevels}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={clearAllLevels}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              None
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {logLevels.map((level) => {
            const isSelected = filters.levels.includes(level.value);
            const Icon = level.Icon;
            return (
              <label
                key={level.value}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-electric-500 border-electric-500'
                      : 'border-white/20 bg-transparent'
                  }`}
                  onClick={() => toggleLevel(level.value)}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className={`flex items-center gap-2 ${level.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-sm">{level.label}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Time Range Filter */}
      <div>
        <span className="text-sm font-medium text-white block mb-3">Time Range</span>
        <select
          value={filters.timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="input-glass w-full py-2.5"
        >
          {timeRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filters */}
      <button
        onClick={() => onChange({
          services: [],
          levels: ['WARN', 'ERROR', 'CRITICAL'],
          timeRange: 'all'
        })}
        className="btn-glass w-full text-sm"
      >
        Reset Filters
      </button>
    </div>
  );
}

export default LogFilters;
