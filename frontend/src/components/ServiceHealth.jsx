import React, { useMemo } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

function ServiceHealth({ metrics = [], history = {} }) {
  // Format metric value
  const formatValue = (value) => {
    if (typeof value === 'string') {
      return value;
    }
    return `${value?.toFixed(1) || 0}%`;
  };

  // Get status color and icon
  const getStatusConfig = (status) => {
    switch (status) {
      case 'critical':
        return {
          color: 'bg-red-500',
          ringColor: 'ring-red-500/30',
          textColor: 'text-red-400',
          label: 'Critical'
        };
      case 'warning':
        return {
          color: 'bg-yellow-500',
          ringColor: 'ring-yellow-500/30',
          textColor: 'text-yellow-400',
          label: 'Warning'
        };
      default:
        return {
          color: 'bg-green-500',
          ringColor: 'ring-green-500/30',
          textColor: 'text-green-400',
          label: 'Healthy'
        };
    }
  };

  // Parse memory usage
  const parseMemory = (memStr) => {
    if (!memStr || memStr === 'N/A') return { used: 0, total: 0, percent: 0 };

    const match = memStr.match(/([\d.]+)(\w+)\s*\/\s*([\d.]+)(\w+)/);
    if (!match) return { used: 0, total: 0, percent: 0 };

    const used = parseFloat(match[1]);
    const total = parseFloat(match[3]);
    const percent = total > 0 ? (used / total) * 100 : 0;

    return { used, total, percent, unit: match[2] };
  };

  // Extract service name
  const getDisplayName = (service) => {
    const patterns = [
      /kubewhisper[-_](.+?)[-_]\d+$/i,
      /(.+?)[-_]\d+$/,
    ];

    for (const pattern of patterns) {
      const match = service.match(pattern);
      if (match) {
        return match[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    return service;
  };

  if (metrics.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Service Health</span>
        </div>

        {[1, 2, 3].map(i => (
          <div key={i} className="bg-dark-800 rounded-lg border border-dark-600 p-4 animate-pulse">
            <div className="h-4 bg-dark-600 rounded w-24 mb-3" />
            <div className="h-8 bg-dark-600 rounded mb-3" />
            <div className="h-3 bg-dark-600 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-white">Service Health</span>
      </div>

      {metrics.map((metric) => {
        const statusConfig = getStatusConfig(metric.status);
        const memInfo = parseMemory(metric.memory);
        const serviceHistory = history[metric.service] || [];
        const chartData = serviceHistory.slice(-20).map((h, i) => ({
          i,
          cpu: h.cpu,
          memory: h.memory
        }));

        return (
          <div
            key={metric.service}
            className="bg-dark-800 rounded-lg border border-dark-600 p-4 card-hover"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color} ring-4 ${statusConfig.ringColor}`} />
                <span className="text-sm font-medium text-white">
                  {getDisplayName(metric.service)}
                </span>
              </div>
              <span className={`text-xs ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Mini chart */}
            {chartData.length > 1 && (
              <div className="h-12 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Tooltip
                      contentStyle={{
                        background: '#21262d',
                        border: '1px solid #30363d',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [`${value.toFixed(1)}%`]}
                    />
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Metrics */}
            <div className="space-y-2">
              {/* CPU */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="text-xs">CPU</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        metric.cpuPercent > 80 ? 'bg-red-500' :
                        metric.cpuPercent > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, metric.cpuPercent || 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white w-12 text-right">
                    {formatValue(metric.cpuPercent)}
                  </span>
                </div>
              </div>

              {/* Memory */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span className="text-xs">Memory</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        metric.memoryPercent > 90 ? 'bg-red-500' :
                        metric.memoryPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, metric.memoryPercent || 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white w-12 text-right">
                    {formatValue(metric.memoryPercent)}
                  </span>
                </div>
              </div>

              {/* Network I/O */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-xs">Net I/O</span>
                </div>
                <span className="text-xs text-gray-400">
                  {metric.netIO || 'N/A'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-dark-600 flex items-center justify-between">
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3 h-3" />
                <span className="text-xs">
                  {metric.timestamp ? new Date(metric.timestamp).toLocaleTimeString() : '-'}
                </span>
              </div>
              {metric.error && (
                <span className="text-xs text-red-400">{metric.error}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ServiceHealth;
