import React from 'react';
import { Cpu, HardDrive, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

function ServiceCard({ service, onClick }) {
  const { name, status, cpu, memory, errors, history } = service;

  // Format service name for display
  const displayName = name
    ?.replace('kubewhisper-', '')
    ?.split('-')
    ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
    ?.join(' ') || 'Unknown Service';

  // Get status config
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          color: 'cyber-green',
          bg: 'bg-cyber-green/20',
          border: 'border-cyber-green/30',
          icon: CheckCircle,
          label: 'Healthy'
        };
      case 'warning':
        return {
          color: 'cyber-yellow',
          bg: 'bg-cyber-yellow/20',
          border: 'border-cyber-yellow/30',
          icon: AlertTriangle,
          label: 'Warning'
        };
      case 'error':
        return {
          color: 'cyber-red',
          bg: 'bg-cyber-red/20',
          border: 'border-cyber-red/30',
          icon: AlertCircle,
          label: 'Error'
        };
      default:
        return {
          color: 'slate-400',
          bg: 'bg-slate-400/20',
          border: 'border-slate-400/30',
          icon: CheckCircle,
          label: 'Unknown'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Prepare chart data
  const chartData = (history || []).slice(-20).map((h, i) => ({
    index: i,
    cpu: h.cpu || 0,
    memory: h.memory || 0
  }));

  return (
    <div
      onClick={onClick}
      className="glass-card glass-card-hover p-5 cursor-pointer group transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-base truncate">{displayName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${statusConfig.bg} animate-pulse`} />
            <span className={`text-xs text-${statusConfig.color}`}>{statusConfig.label}</span>
          </div>
        </div>

        {errors > 0 && (
          <div className="badge badge-error">
            <AlertCircle className="w-3 h-3" />
            <span>{errors}</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>CPU</span>
          </div>
          <div className={`text-xl font-bold ${
            cpu > 80 ? 'text-cyber-red' : cpu > 60 ? 'text-cyber-yellow' : 'text-white'
          }`}>
            {cpu?.toFixed(1) || 0}%
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cpu > 80 ? 'bg-cyber-red' : cpu > 60 ? 'bg-cyber-yellow' : 'bg-electric-500'
              }`}
              style={{ width: `${Math.min(cpu || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Memory</span>
          </div>
          <div className={`text-xl font-bold ${
            memory > 80 ? 'text-cyber-red' : memory > 60 ? 'text-cyber-yellow' : 'text-white'
          }`}>
            {memory?.toFixed(1) || 0}%
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                memory > 80 ? 'bg-cyber-red' : memory > 60 ? 'bg-cyber-yellow' : 'bg-cyber-green'
              }`}
              style={{ width: `${Math.min(memory || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-14 bg-white/5 rounded-xl p-2 overflow-hidden border border-white/5">
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
                stroke="#10B981"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Collecting data...
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceCard;
