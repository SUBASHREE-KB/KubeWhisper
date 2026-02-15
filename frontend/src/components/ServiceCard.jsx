import React from 'react';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

function ServiceCard({ service, onClick }) {
  const { name, status, cpu, memory, errors, history } = service;

  // Format service name for display
  const displayName = name
    ?.replace('kubewhisper-', '')
    ?.split('-')
    ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
    ?.join(' ') || 'Unknown Service';

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-status-success';
      case 'warning':
        return 'bg-status-warning';
      case 'error':
        return 'bg-status-error';
      default:
        return 'bg-text-muted';
    }
  };

  // Prepare chart data
  const chartData = (history || []).slice(-20).map((h, i) => ({
    index: i,
    cpu: h.cpu || 0,
    memory: h.memory || 0
  }));

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover-glow group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={`status-dot ${getStatusColor()}`} />
            <h3 className="font-semibold text-text-primary">{displayName}</h3>
          </div>
          <p className="text-xs text-text-muted mt-1 capitalize">{status}</p>
        </div>

        {errors > 0 && (
          <div className="badge badge-error">
            <ErrorOutlineIcon sx={{ fontSize: 12 }} />
            {errors}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-medium rounded-lg p-2">
          <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
            <MemoryIcon sx={{ fontSize: 12 }} />
            <span>CPU</span>
          </div>
          <div className={`text-lg font-semibold ${
            cpu > 80 ? 'text-status-error' : cpu > 60 ? 'text-status-warning' : 'text-text-primary'
          }`}>
            {cpu?.toFixed(1) || 0}%
          </div>
        </div>

        <div className="bg-bg-medium rounded-lg p-2">
          <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
            <StorageIcon sx={{ fontSize: 12 }} />
            <span>Memory</span>
          </div>
          <div className={`text-lg font-semibold ${
            memory > 80 ? 'text-status-error' : memory > 60 ? 'text-status-warning' : 'text-text-primary'
          }`}>
            {memory?.toFixed(1) || 0}%
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-12 bg-bg-medium rounded-lg p-1 overflow-hidden">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3B82F6"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#22C55E"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Collecting data...
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceCard;
