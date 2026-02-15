import React, { useMemo } from 'react';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

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
          icon: cpuTrend > 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />,
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
          icon: memoryTrend > 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />,
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
          icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
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
          icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
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
        icon: <ErrorOutlineIcon sx={{ fontSize: 16 }} />,
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
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
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
          border: 'border-status-error/30',
          bg: 'bg-status-error/5',
          icon: 'text-status-error',
          badge: 'badge-error'
        };
      case 'warning':
        return {
          border: 'border-status-warning/30',
          bg: 'bg-status-warning/5',
          icon: 'text-status-warning',
          badge: 'badge-warning'
        };
      case 'success':
        return {
          border: 'border-status-success/30',
          bg: 'bg-status-success/5',
          icon: 'text-status-success',
          badge: 'badge-success'
        };
      default:
        return {
          border: 'border-border-dark',
          bg: 'bg-bg-dark',
          icon: 'text-text-muted',
          badge: 'badge-info'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {insights.map((insight, index) => {
        const styles = getInsightStyles(insight.type);
        return (
          <div
            key={index}
            className={`card p-4 border ${styles.border} ${styles.bg}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={styles.icon}>
                  {insight.icon}
                </div>
                <span className={`badge ${styles.badge}`}>
                  {insight.metric}
                </span>
              </div>
              <span className="text-lg font-semibold text-text-primary font-mono">
                {insight.value}
              </span>
            </div>

            <h4 className="text-sm font-medium text-text-primary mb-1">
              {insight.title}
            </h4>

            <p className="text-xs text-text-muted leading-relaxed">
              {insight.description}
            </p>

            <div className="mt-3 pt-3 border-t border-border-dark flex items-center justify-between">
              <span className="text-xs text-text-muted capitalize">
                {insight.service}
              </span>
              <div className={`flex items-center gap-1 text-xs ${
                insight.trend === 'up' ? 'text-status-error' :
                insight.trend === 'down' ? 'text-status-success' :
                insight.trend === 'critical' ? 'text-status-error' :
                'text-text-muted'
              }`}>
                {insight.trend === 'up' && <TrendingUpIcon sx={{ fontSize: 12 }} />}
                {insight.trend === 'down' && <TrendingDownIcon sx={{ fontSize: 12 }} />}
                <span className="capitalize">{insight.trend}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PredictiveInsights;
