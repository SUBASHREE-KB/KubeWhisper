import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

function PredictiveInsights({ metrics, metricsHistory, logs }) {
  // Analyze trends and generate insights
  const insights = useMemo(() => {
    const results = [];

    // Analyze each service
    Object.entries(metricsHistory || {}).forEach(([service, history]) => {
      if (history.length < 5) return;

      const serviceName = service.replace('kubewhisper-', '');
      const recent = history.slice(-10);
      const older = history.slice(-20, -10);

      // Calculate averages
      const recentAvgCpu = recent.reduce((sum, h) => sum + (h.cpu || 0), 0) / recent.length;
      const olderAvgCpu = older.length > 0 ? older.reduce((sum, h) => sum + (h.cpu || 0), 0) / older.length : recentAvgCpu;
      const recentAvgMemory = recent.reduce((sum, h) => sum + (h.memory || 0), 0) / recent.length;
      const olderAvgMemory = older.length > 0 ? older.reduce((sum, h) => sum + (h.memory || 0), 0) / older.length : recentAvgMemory;

      // CPU trend
      const cpuTrend = recentAvgCpu - olderAvgCpu;
      if (Math.abs(cpuTrend) > 10) {
        results.push({
          type: cpuTrend > 0 ? 'warning' : 'success',
          service: serviceName,
          metric: 'CPU',
          Icon: cpuTrend > 0 ? TrendingUp : TrendingDown,
          title: cpuTrend > 0 ? 'CPU Usage Increasing' : 'CPU Usage Decreasing',
          description: cpuTrend > 0
            ? `${serviceName} CPU usage trending up by ${cpuTrend.toFixed(1)}%. Consider scaling if this continues.`
            : `${serviceName} CPU usage has decreased by ${Math.abs(cpuTrend).toFixed(1)}%. Resource efficiency improving.`,
          value: `${recentAvgCpu.toFixed(1)}%`,
          trend: cpuTrend > 0 ? 'up' : 'down'
        });
      }

      // Memory trend
      const memoryTrend = recentAvgMemory - olderAvgMemory;
      if (Math.abs(memoryTrend) > 10) {
        results.push({
          type: memoryTrend > 0 ? 'warning' : 'success',
          service: serviceName,
          metric: 'Memory',
          Icon: memoryTrend > 0 ? TrendingUp : TrendingDown,
          title: memoryTrend > 0 ? 'Memory Usage Increasing' : 'Memory Usage Decreasing',
          description: memoryTrend > 0
            ? `${serviceName} memory usage trending up by ${memoryTrend.toFixed(1)}%. Possible memory leak.`
            : `${serviceName} memory usage has decreased by ${Math.abs(memoryTrend).toFixed(1)}%.`,
          value: `${recentAvgMemory.toFixed(1)}%`,
          trend: memoryTrend > 0 ? 'up' : 'down'
        });
      }

      // High resource warning
      if (recentAvgCpu > 75) {
        results.push({
          type: 'error',
          service: serviceName,
          metric: 'CPU',
          Icon: AlertTriangle,
          title: 'High CPU Alert',
          description: `${serviceName} is consistently using ${recentAvgCpu.toFixed(1)}% CPU. Performance may be impacted.`,
          value: `${recentAvgCpu.toFixed(1)}%`,
          trend: 'critical'
        });
      }

      if (recentAvgMemory > 75) {
        results.push({
          type: 'error',
          service: serviceName,
          metric: 'Memory',
          Icon: AlertTriangle,
          title: 'High Memory Alert',
          description: `${serviceName} is consistently using ${recentAvgMemory.toFixed(1)}% memory. Consider increasing limits.`,
          value: `${recentAvgMemory.toFixed(1)}%`,
          trend: 'critical'
        });
      }
    });

    // Error rate analysis
    const errorLogs = logs.filter(l => ['ERROR', 'CRITICAL'].includes(l.level));
    const recentErrors = errorLogs.slice(-20);
    const olderErrors = errorLogs.slice(-40, -20);

    if (recentErrors.length > olderErrors.length && recentErrors.length > 3) {
      results.push({
        type: 'error',
        service: 'System',
        metric: 'Errors',
        Icon: AlertCircle,
        title: 'Error Rate Increasing',
        description: `Error frequency has increased. ${recentErrors.length} errors in recent window vs ${olderErrors.length} previously.`,
        value: `${recentErrors.length} errors`,
        trend: 'up'
      });
    }

    // Add success insight if no issues
    if (results.length === 0) {
      results.push({
        type: 'success',
        service: 'System',
        metric: 'Overall',
        Icon: CheckCircle,
        title: 'System Healthy',
        description: 'All services are operating within normal parameters. No anomalies detected.',
        value: 'Stable',
        trend: 'stable'
      });
    }

    return results;
  }, [metrics, metricsHistory, logs]);

  const getInsightStyles = (type) => {
    switch (type) {
      case 'error':
        return {
          border: 'border-cyber-red/30',
          bg: 'bg-cyber-red/5',
          iconBg: 'bg-cyber-red/20',
          icon: 'text-cyber-red',
          badge: 'badge-error'
        };
      case 'warning':
        return {
          border: 'border-cyber-yellow/30',
          bg: 'bg-cyber-yellow/5',
          iconBg: 'bg-cyber-yellow/20',
          icon: 'text-cyber-yellow',
          badge: 'badge-warning'
        };
      case 'success':
        return {
          border: 'border-cyber-green/30',
          bg: 'bg-cyber-green/5',
          iconBg: 'bg-cyber-green/20',
          icon: 'text-cyber-green',
          badge: 'badge-success'
        };
      default:
        return {
          border: 'border-white/10',
          bg: 'bg-white/5',
          iconBg: 'bg-white/10',
          icon: 'text-slate-400',
          badge: 'badge-info'
        };
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />;
      case 'down':
        return <ArrowDown className="w-3 h-3" />;
      case 'critical':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Zap className="w-8 h-8 text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm">Collecting data for insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.slice(0, 3).map((insight, index) => {
        const styles = getInsightStyles(insight.type);
        const Icon = insight.Icon;

        return (
          <div
            key={index}
            className={`p-4 rounded-xl border ${styles.border} ${styles.bg} transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${styles.icon}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-white truncate">
                    {insight.title}
                  </h4>
                  <span className="text-lg font-bold text-white font-mono ml-2">
                    {insight.value}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {insight.description}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className={`badge ${styles.badge}`}>
                    {insight.metric}
                  </span>
                  <div className={`flex items-center gap-1 text-xs ${
                    insight.trend === 'up' ? 'text-cyber-red' :
                    insight.trend === 'down' ? 'text-cyber-green' :
                    insight.trend === 'critical' ? 'text-cyber-red' :
                    'text-slate-400'
                  }`}>
                    {getTrendIcon(insight.trend)}
                    <span className="capitalize">{insight.trend}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PredictiveInsights;
