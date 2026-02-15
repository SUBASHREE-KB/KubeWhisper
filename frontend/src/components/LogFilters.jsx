import React from 'react';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BugReportIcon from '@mui/icons-material/BugReport';

function LogFilters({ filters, onChange, availableServices }) {
  // Log levels configuration
  const logLevels = [
    { value: 'INFO', label: 'Info', icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />, color: 'text-text-muted' },
    { value: 'WARN', label: 'Warning', icon: <WarningAmberIcon sx={{ fontSize: 14 }} />, color: 'text-status-warning' },
    { value: 'ERROR', label: 'Error', icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} />, color: 'text-status-error' },
    { value: 'CRITICAL', label: 'Critical', icon: <BugReportIcon sx={{ fontSize: 14 }} />, color: 'text-status-error' },
    { value: 'DEBUG', label: 'Debug', icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />, color: 'text-text-muted' }
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
          <span className="text-sm font-medium text-text-primary">Services</span>
          <button
            onClick={selectAllServices}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
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
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-medium cursor-pointer transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-text-primary border-text-primary'
                      : 'border-border-light bg-transparent'
                  }`}
                  onClick={() => toggleService(service)}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-bg-darkest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-text-secondary">{formatService(service)}</span>
              </label>
            );
          })}
          {availableServices.length === 0 && (
            <p className="text-xs text-text-muted text-center py-2">No services detected</p>
          )}
        </div>
      </div>

      {/* Log Levels Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-primary">Log Levels</span>
          <div className="flex gap-2">
            <button
              onClick={selectAllLevels}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              All
            </button>
            <span className="text-text-muted">|</span>
            <button
              onClick={clearAllLevels}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              None
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {logLevels.map((level) => {
            const isSelected = filters.levels.includes(level.value);
            return (
              <label
                key={level.value}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-medium cursor-pointer transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-text-primary border-text-primary'
                      : 'border-border-light bg-transparent'
                  }`}
                  onClick={() => toggleLevel(level.value)}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-bg-darkest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className={`flex items-center gap-2 ${level.color}`}>
                  {level.icon}
                  <span className="text-sm">{level.label}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Time Range Filter */}
      <div>
        <span className="text-sm font-medium text-text-primary block mb-3">Time Range</span>
        <select
          value={filters.timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="select w-full"
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
        className="btn btn-ghost w-full text-sm"
      >
        Reset Filters
      </button>
    </div>
  );
}

export default LogFilters;
