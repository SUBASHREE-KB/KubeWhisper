import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, AlertCircle, Search, Filter, Zap } from 'lucide-react';

function IncidentsPage({ logs, triggerAnalysis }) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get error and warning logs as incidents
  const incidents = logs
    .filter(l => ['ERROR', 'CRITICAL', 'WARN'].includes(l.level))
    .map((log, index) => ({
      id: log.id || index,
      level: log.level,
      service: log.service,
      message: log.message,
      timestamp: log.timestamp,
      resolved: false
    }))
    .reverse();

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesFilter = filter === 'all' ||
      (filter === 'errors' && ['ERROR', 'CRITICAL'].includes(incident.level)) ||
      (filter === 'warnings' && incident.level === 'WARN');

    const matchesSearch = incident.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.service.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const errorCount = incidents.filter(i => ['ERROR', 'CRITICAL'].includes(i.level)).length;
  const warningCount = incidents.filter(i => i.level === 'WARN').length;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatServiceName = (name) => {
    return name
      ?.replace('kubewhisper-', '')
      ?.split('-')
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || 'Unknown';
  };

  const getLevelConfig = (level) => {
    switch (level) {
      case 'CRITICAL':
        return { color: 'cyber-red', bg: 'bg-cyber-red/20', icon: AlertCircle, label: 'Critical' };
      case 'ERROR':
        return { color: 'cyber-red', bg: 'bg-cyber-red/20', icon: AlertCircle, label: 'Error' };
      case 'WARN':
        return { color: 'cyber-yellow', bg: 'bg-cyber-yellow/20', icon: AlertTriangle, label: 'Warning' };
      default:
        return { color: 'slate-400', bg: 'bg-slate-400/20', icon: AlertCircle, label: level };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-cyber-yellow" />
            Incidents
          </h1>
          <p className="text-slate-400 mt-1">Track and resolve system incidents</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-red/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-cyber-red" />
            </div>
            <span className="text-sm text-slate-400">Errors</span>
          </div>
          <p className="text-3xl font-bold text-cyber-red">{errorCount}</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-yellow/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-cyber-yellow" />
            </div>
            <span className="text-sm text-slate-400">Warnings</span>
          </div>
          <p className="text-3xl font-bold text-cyber-yellow">{warningCount}</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-green/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-cyber-green" />
            </div>
            <span className="text-sm text-slate-400">Resolved</span>
          </div>
          <p className="text-3xl font-bold text-cyber-green">0</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass w-full pl-10 pr-4 py-2.5"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex items-center bg-white/5 rounded-lg p-1">
            {['all', 'errors', 'warnings'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm transition-all ${
                  filter === f
                    ? 'bg-electric-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="glass-card overflow-hidden">
        {filteredIncidents.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredIncidents.map((incident) => {
              const config = getLevelConfig(incident.level);
              const Icon = config.icon;

              return (
                <div
                  key={incident.id}
                  className="p-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 text-${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`badge badge-${incident.level === 'WARN' ? 'warning' : 'error'}`}>
                          {config.label}
                        </span>
                        <span className="badge badge-info">
                          {formatServiceName(incident.service)}
                        </span>
                      </div>

                      <p className="text-sm text-white font-mono line-clamp-2">
                        {incident.message}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(incident.timestamp)}</span>
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => triggerAnalysis(incident.id)}
                      className="btn-glass py-2 px-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-cyber-yellow" />
                      Analyze
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-cyber-green mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No incidents</h3>
            <p className="text-slate-400">All systems are operating normally</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default IncidentsPage;
