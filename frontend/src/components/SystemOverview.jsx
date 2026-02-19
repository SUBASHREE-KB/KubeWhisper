import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Cpu, HardDrive, Activity, Gauge } from 'lucide-react';

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
    'user-service': '#10B981',
    'db-service': '#F59E0B',
    'auth-service': '#0891B2',
    'order-service': '#06B6D4',
    'default': '#94A3B8'
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
              <span className="text-slate-400">{entry.name}:</span>
              <span className="text-white font-mono">{entry.value?.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Metrics Summary Cards */}
      <div className="metric-card">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
          <Cpu className="w-3.5 h-3.5" />
          <span>Avg CPU Usage</span>
        </div>
        <div className={`text-2xl font-bold ${
          aggregatedMetrics.avgCpu > 80 ? 'text-cyber-red' :
          aggregatedMetrics.avgCpu > 60 ? 'text-cyber-yellow' : 'text-white'
        }`}>
          {aggregatedMetrics.avgCpu.toFixed(1)}%
        </div>
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              aggregatedMetrics.avgCpu > 80 ? 'bg-cyber-red' :
              aggregatedMetrics.avgCpu > 60 ? 'bg-cyber-yellow' : 'bg-cyber-green'
            }`}
            style={{ width: `${Math.min(aggregatedMetrics.avgCpu, 100)}%` }}
          />
        </div>
      </div>

      <div className="metric-card">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Avg Memory Usage</span>
        </div>
        <div className={`text-2xl font-bold ${
          aggregatedMetrics.avgMemory > 80 ? 'text-cyber-red' :
          aggregatedMetrics.avgMemory > 60 ? 'text-cyber-yellow' : 'text-white'
        }`}>
          {aggregatedMetrics.avgMemory.toFixed(1)}%
        </div>
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              aggregatedMetrics.avgMemory > 80 ? 'bg-cyber-red' :
              aggregatedMetrics.avgMemory > 60 ? 'bg-cyber-yellow' : 'bg-cyber-green'
            }`}
            style={{ width: `${Math.min(aggregatedMetrics.avgMemory, 100)}%` }}
          />
        </div>
      </div>

      <div className="metric-card">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
          <Activity className="w-3.5 h-3.5" />
          <span>Services Health</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {aggregatedMetrics.healthyServices}/{aggregatedMetrics.totalServices}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {aggregatedMetrics.healthyServices === aggregatedMetrics.totalServices
            ? 'All services healthy'
            : `${aggregatedMetrics.totalServices - aggregatedMetrics.healthyServices} need attention`
          }
        </div>
      </div>

      <div className="metric-card">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
          <Gauge className="w-3.5 h-3.5" />
          <span>Service Legend</span>
        </div>
        <div className="space-y-2">
          {services.map(service => (
            <div key={service} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getServiceColor(service) }}
              />
              <span className="text-xs text-slate-300 capitalize">
                {service.replace('-', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="lg:col-span-4 chart-container">
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
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
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Collecting metrics data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemOverview;
