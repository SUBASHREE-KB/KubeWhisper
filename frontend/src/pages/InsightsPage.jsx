import React from 'react';
import { Zap, TrendingUp, AlertTriangle, CheckCircle, Brain, Sparkles } from 'lucide-react';
import PredictiveInsights from '../components/PredictiveInsights';

function InsightsPage({ metrics, metricsHistory, logs }) {
  // Calculate summary stats
  const errorLogs = logs.filter(l => ['ERROR', 'CRITICAL'].includes(l.level));
  const warningLogs = logs.filter(l => l.level === 'WARN');

  const healthScore = Math.max(0, 100 - (errorLogs.length * 5) - (warningLogs.length * 2));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-7 h-7 text-cyber-yellow" />
            AI Insights
          </h1>
          <p className="text-slate-400 mt-1">Predictive analytics and intelligent recommendations</p>
        </div>
      </div>

      {/* Health Score */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric-500 to-cyber-purple flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">System Health Score</h2>
              <p className="text-sm text-slate-400">Based on real-time metrics analysis</p>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-4xl font-bold ${
              healthScore >= 80 ? 'text-cyber-green' :
              healthScore >= 50 ? 'text-cyber-yellow' :
              'text-cyber-red'
            }`}>
              {healthScore}
            </span>
            <span className="text-2xl text-slate-400">/100</span>
          </div>
        </div>

        {/* Health Bar */}
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              healthScore >= 80 ? 'bg-gradient-to-r from-cyber-green to-electric-400' :
              healthScore >= 50 ? 'bg-gradient-to-r from-cyber-yellow to-cyber-yellow' :
              'bg-gradient-to-r from-cyber-red to-cyber-yellow'
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <CheckCircle className="w-5 h-5 text-cyber-green mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{metrics.filter(m => m.cpuPercent < 80 && m.memoryPercent < 80).length}</p>
            <p className="text-xs text-slate-400">Healthy Services</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-cyber-yellow mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{warningLogs.length}</p>
            <p className="text-xs text-slate-400">Warnings</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <TrendingUp className="w-5 h-5 text-electric-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{Object.keys(metricsHistory).length}</p>
            <p className="text-xs text-slate-400">Tracked Metrics</p>
          </div>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyber-yellow" />
          Active Predictions
        </h2>

        <PredictiveInsights
          metrics={metrics}
          metricsHistory={metricsHistory}
          logs={logs}
        />
      </div>

      {/* Recommendations */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recommendations</h2>

        <div className="space-y-3">
          {healthScore < 80 && (
            <div className="p-4 rounded-xl bg-cyber-yellow/10 border border-cyber-yellow/30">
              <h3 className="text-sm font-medium text-cyber-yellow mb-1">Resource Optimization</h3>
              <p className="text-xs text-slate-400">Consider scaling services with high CPU or memory usage to improve overall system health.</p>
            </div>
          )}

          {errorLogs.length > 0 && (
            <div className="p-4 rounded-xl bg-cyber-red/10 border border-cyber-red/30">
              <h3 className="text-sm font-medium text-cyber-red mb-1">Error Resolution</h3>
              <p className="text-xs text-slate-400">Address the {errorLogs.length} active errors to prevent potential cascading failures.</p>
            </div>
          )}

          {healthScore >= 80 && errorLogs.length === 0 && (
            <div className="p-4 rounded-xl bg-cyber-green/10 border border-cyber-green/30">
              <h3 className="text-sm font-medium text-cyber-green mb-1">All Systems Operational</h3>
              <p className="text-xs text-slate-400">Your system is healthy. Continue monitoring for any changes in performance patterns.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InsightsPage;
