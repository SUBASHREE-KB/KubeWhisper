import React, { useState } from 'react';
import { Download, FileText, Database, Clock, Calendar, CheckCircle } from 'lucide-react';

function ExportPage({ logs, metrics, metricsHistory }) {
  const [exportFormat, setExportFormat] = useState('json');
  const [dateRange, setDateRange] = useState('all');
  const [exportType, setExportType] = useState('logs');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setExportSuccess(false);

    // Prepare data based on export type
    let data;
    let filename;

    switch (exportType) {
      case 'logs':
        data = logs;
        filename = `loglens-logs-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'metrics':
        data = metrics;
        filename = `loglens-metrics-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'history':
        data = metricsHistory;
        filename = `loglens-history-${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        data = { logs, metrics, metricsHistory };
        filename = `loglens-full-export-${new Date().toISOString().split('T')[0]}`;
    }

    // Create file content
    let content;
    let mimeType;

    if (exportFormat === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else {
      // CSV format (simplified)
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item =>
          Object.values(item).map(v =>
            typeof v === 'object' ? JSON.stringify(v) : v
          ).join(',')
        ).join('\n');
        content = `${headers}\n${rows}`;
      } else {
        content = JSON.stringify(data);
      }
      mimeType = 'text/csv';
      filename += '.csv';
    }

    // Download file
    setTimeout(() => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setExportSuccess(true);

      setTimeout(() => setExportSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Download className="w-7 h-7 text-electric-400" />
            Export Data
          </h1>
          <p className="text-slate-400 mt-1">Download logs, metrics, and analysis data</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Export Configuration</h2>

          {/* Export Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400">Data Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'logs', label: 'Logs', icon: FileText, count: logs.length },
                { value: 'metrics', label: 'Metrics', icon: Database, count: metrics.length },
                { value: 'history', label: 'History', icon: Clock, count: Object.keys(metricsHistory).length },
                { value: 'all', label: 'Full Export', icon: Download, count: null }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setExportType(type.value)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    exportType === type.value
                      ? 'border-electric-500 bg-electric-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <type.icon className={`w-5 h-5 mb-2 ${
                    exportType === type.value ? 'text-electric-400' : 'text-slate-400'
                  }`} />
                  <p className="text-sm font-medium text-white">{type.label}</p>
                  {type.count !== null && (
                    <p className="text-xs text-slate-500">{type.count} records</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400">Format</label>
            <div className="flex items-center gap-3">
              {['json', 'csv'].map(format => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    exportFormat === format
                      ? 'border-electric-500 bg-electric-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-medium text-white uppercase">{format}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400">Date Range</label>
            <div className="flex items-center gap-3">
              {[
                { value: 'all', label: 'All Data' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' }
              ].map(range => (
                <button
                  key={range.value}
                  onClick={() => setDateRange(range.value)}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    dateRange === range.value
                      ? 'border-electric-500 bg-electric-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{range.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`w-full btn-primary flex items-center justify-center gap-2 py-3 ${
              isExporting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isExporting ? (
              <>
                <div className="spinner" />
                <span>Exporting...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Export Complete!</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Export Data</span>
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Data Preview</h2>

          <div className="bg-black/30 rounded-xl p-4 border border-white/5 h-80 overflow-auto">
            <pre className="text-xs text-slate-300 font-mono">
              {exportType === 'logs' && JSON.stringify(logs.slice(0, 3), null, 2)}
              {exportType === 'metrics' && JSON.stringify(metrics.slice(0, 3), null, 2)}
              {exportType === 'history' && JSON.stringify(
                Object.fromEntries(
                  Object.entries(metricsHistory).slice(0, 2).map(([k, v]) => [k, v.slice(0, 3)])
                ),
                null, 2
              )}
              {exportType === 'all' && JSON.stringify({
                logsCount: logs.length,
                metricsCount: metrics.length,
                servicesTracked: Object.keys(metricsHistory).length,
                preview: 'Full data will be exported'
              }, null, 2)}
            </pre>
          </div>

          <div className="mt-4 p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>Export will include data from current session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportPage;
