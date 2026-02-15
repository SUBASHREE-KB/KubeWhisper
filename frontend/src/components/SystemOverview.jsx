import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';

function SystemOverview({ metrics, metricsHistory }) {
  // Prepare chart data from metrics history
  const chartData = useMemo(() => {
    const allTimestamps = new Set();
    const serviceData = {};

    // Collect all timestamps and organize by service
    Object.entries(metricsHistory || {}).forEach(([service, history]) => {
      history.forEach(entry => {
        allTimestamps.add(entry.timestamp);
        if (!serviceData[entry.timestamp]) {
          serviceData[entry.timestamp] = { timestamp: entry.timestamp };
        }
        const serviceName = service.replace('kubewhisper-', '');
        serviceData[entry.timestamp][`${serviceName}_cpu`] = entry.cpu || 0;
        serviceData[entry.timestamp][`${serviceName}_memory`] = entry.memory || 0;
      });
    });

    // Convert to array and sort by timestamp
    return Object.values(serviceData)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-30)
      .map((entry, index) => ({
        ...entry,
        time: index
      }));
  }, [metricsHistory]);

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return { avgCpu: 0, avgMemory: 0, totalServices: 0, healthyServices: 0 };
    }

    const totalCpu = metrics.reduce((sum, m) => sum + (m.cpuPercent || 0), 0);
    const totalMemory = metrics.reduce((sum, m) => sum + (m.memoryPercent || 0), 0);
    const healthyCount = metrics.filter(m => m.cpuPercent < 80 && m.memoryPercent < 80).length;

    return {
      avgCpu: totalCpu / metrics.length,
      avgMemory: totalMemory / metrics.length,
      totalServices: metrics.length,
      healthyServices: healthyCount
    };
  }, [metrics]);

  // Get unique services for chart colors
  const services = useMemo(() => {
    return [...new Set(Object.keys(metricsHistory || {}).map(s => s.replace('kubewhisper-', '')))];
  }, [metricsHistory]);

  // Service colors
  const serviceColors = {
    'api-gateway': '#3B82F6',
    'user-service': '#22C55E',
    'db-service': '#EAB308',
    'default': '#A3A3A3'
  };

  const getServiceColor = (service) => serviceColors[service] || serviceColors.default;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="tooltip">
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-text-secondary">{entry.name}:</span>
              <span className="text-text-primary font-mono">{entry.value?.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Metrics Summary Cards */}
      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
          <MemoryIcon sx={{ fontSize: 14 }} />
          <span>Avg CPU Usage</span>
        </div>
        <div className={`text-2xl font-semibold ${
          aggregatedMetrics.avgCpu > 80 ? 'text-status-error' :
          aggregatedMetrics.avgCpu > 60 ? 'text-status-warning' : 'text-text-primary'
        }`}>
          {aggregatedMetrics.avgCpu.toFixed(1)}%
        </div>
        <div className="mt-2 h-1 bg-bg-medium rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              aggregatedMetrics.avgCpu > 80 ? 'bg-status-error' :
              aggregatedMetrics.avgCpu > 60 ? 'bg-status-warning' : 'bg-status-success'
            }`}
            style={{ width: `${Math.min(aggregatedMetrics.avgCpu, 100)}%` }}
          />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
          <StorageIcon sx={{ fontSize: 14 }} />
          <span>Avg Memory Usage</span>
        </div>
        <div className={`text-2xl font-semibold ${
          aggregatedMetrics.avgMemory > 80 ? 'text-status-error' :
          aggregatedMetrics.avgMemory > 60 ? 'text-status-warning' : 'text-text-primary'
        }`}>
          {aggregatedMetrics.avgMemory.toFixed(1)}%
        </div>
        <div className="mt-2 h-1 bg-bg-medium rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              aggregatedMetrics.avgMemory > 80 ? 'bg-status-error' :
              aggregatedMetrics.avgMemory > 60 ? 'bg-status-warning' : 'bg-status-success'
            }`}
            style={{ width: `${Math.min(aggregatedMetrics.avgMemory, 100)}%` }}
          />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
          <SpeedIcon sx={{ fontSize: 14 }} />
          <span>Services Health</span>
        </div>
        <div className="text-2xl font-semibold text-text-primary">
          {aggregatedMetrics.healthyServices}/{aggregatedMetrics.totalServices}
        </div>
        <div className="text-xs text-text-muted mt-1">
          {aggregatedMetrics.healthyServices === aggregatedMetrics.totalServices
            ? 'All services healthy'
            : `${aggregatedMetrics.totalServices - aggregatedMetrics.healthyServices} service(s) need attention`
          }
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
          <span>Service Legend</span>
        </div>
        <div className="space-y-2">
          {services.map(service => (
            <div key={service} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getServiceColor(service) }}
              />
              <span className="text-xs text-text-secondary capitalize">
                {service.replace('-', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="card p-4 lg:col-span-4">
        <div className="h-64">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {services.map(service => (
                    <linearGradient key={service} id={`gradient-${service}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getServiceColor(service)} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={getServiceColor(service)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="time"
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 10 }}
                  axisLine={{ stroke: '#262626' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#737373"
                  tick={{ fill: '#737373', fontSize: 10 }}
                  axisLine={{ stroke: '#262626' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                {services.map(service => (
                  <Area
                    key={`${service}_cpu`}
                    type="monotone"
                    dataKey={`${service}_cpu`}
                    name={`${service} CPU`}
                    stroke={getServiceColor(service)}
                    fill={`url(#gradient-${service})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              Collecting metrics data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemOverview;
