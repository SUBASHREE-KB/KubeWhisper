import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ListAltIcon from '@mui/icons-material/ListAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AnalyticsIcon from '@mui/icons-material/Analytics';

import ServiceCard from '../components/ServiceCard';
import RecentErrors from '../components/RecentErrors';
import SystemOverview from '../components/SystemOverview';
import PredictiveInsights from '../components/PredictiveInsights';
import ErrorPanel from '../components/ErrorPanel';
import Settings from '../components/Settings';

function Dashboard({
  connected,
  logs,
  metrics,
  metricsHistory,
  currentAnalysis,
  generatedFix,
  isAnalyzing,
  isGeneratingFix,
  triggerAnalysis,
  generateFix,
  clearAnalysis
}) {
  const navigate = useNavigate();
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Show error panel when analysis completes
  useEffect(() => {
    if (currentAnalysis) {
      setShowErrorPanel(true);
    }
  }, [currentAnalysis]);

  // Handle error click
  const handleErrorClick = (errorLog) => {
    triggerAnalysis(errorLog.id);
    setShowErrorPanel(true);
  };

  // Handle dismiss panel
  const handleDismissPanel = () => {
    setShowErrorPanel(false);
    clearAnalysis();
  };

  // Get error logs
  const errorLogs = logs.filter(l => ['ERROR', 'CRITICAL'].includes(l.level)).slice(-10).reverse();
  const errorCount = errorLogs.length;

  // Get unique services from metrics
  const services = metrics.map(m => ({
    name: m.service,
    status: m.cpuPercent > 80 || m.memoryPercent > 80 ? 'warning' : 'healthy',
    cpu: m.cpuPercent,
    memory: m.memoryPercent,
    errors: logs.filter(l => l.service === m.service && ['ERROR', 'CRITICAL'].includes(l.level)).length,
    history: metricsHistory[m.service] || []
  }));

  return (
    <div className="min-h-screen bg-bg-darkest text-text-primary">
      {/* Header */}
      <header className="bg-bg-dark border-b border-border-dark sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-bg-medium border border-border-light rounded-lg flex items-center justify-center">
                <DashboardIcon sx={{ fontSize: 24, color: '#FAFAFA' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">KubeWhisper</h1>
                <p className="text-xs text-text-muted">AI-Powered Root Cause Analysis</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Settings button */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 bg-bg-medium hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-all duration-200"
                title="Settings"
              >
                <SettingsIcon sx={{ fontSize: 20 }} />
              </button>

              {/* Connection status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                connected
                  ? 'bg-status-success/10 border border-status-success/30'
                  : 'bg-status-error/10 border border-status-error/30'
              }`}>
                {connected ? (
                  <>
                    <WifiIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                    <span className="text-sm text-status-success">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOffIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                    <span className="text-sm text-status-error">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6 space-y-6" style={{ paddingBottom: showErrorPanel ? '50vh' : '2rem' }}>
        {/* Service Health Section */}
        <section>
          <div className="section-header">
            <div className="section-title">
              <AutoGraphIcon sx={{ fontSize: 18, color: '#A3A3A3' }} />
              <span>Service Health Overview</span>
            </div>
            <button
              onClick={() => navigate('/logs')}
              className="btn btn-ghost text-sm"
            >
              <ListAltIcon sx={{ fontSize: 16 }} />
              View Logs
            </button>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => (
              <ServiceCard
                key={service.name}
                service={service}
                onClick={() => navigate('/logs')}
              />
            ))}

            {/* Add New Service Card */}
            <button
              onClick={() => setShowSettings(true)}
              className="card-dashed flex flex-col items-center justify-center p-6 min-h-[180px] group"
            >
              <div className="w-12 h-12 rounded-full bg-bg-medium border border-border-light flex items-center justify-center mb-3 group-hover:border-text-primary group-hover:bg-bg-hover transition-all">
                <AddIcon sx={{ fontSize: 24, color: '#737373' }} className="group-hover:text-text-primary" />
              </div>
              <span className="text-text-muted text-sm group-hover:text-text-primary transition-colors">Add New Service</span>
            </button>
          </div>
        </section>

        {/* Recent Errors Section */}
        <section>
          <div className="section-header">
            <div className="section-title">
              <ErrorOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              <span>Recent Errors</span>
              {errorCount > 0 && (
                <span className="badge badge-error">{errorCount}</span>
              )}
            </div>
            <button
              onClick={() => navigate('/logs')}
              className="btn btn-ghost text-sm"
            >
              View All
            </button>
          </div>

          <RecentErrors
            errors={errorLogs}
            onAnalyze={handleErrorClick}
          />
        </section>

        {/* Predictive Insights Section */}
        <section>
          <div className="section-header">
            <div className="section-title">
              <TipsAndUpdatesIcon sx={{ fontSize: 18, color: '#EAB308' }} />
              <span>Predictive Insights</span>
            </div>
          </div>

          <PredictiveInsights
            metrics={metrics}
            metricsHistory={metricsHistory}
            logs={logs}
          />
        </section>

        {/* System Overview Section */}
        <section>
          <div className="section-header">
            <div className="section-title">
              <AnalyticsIcon sx={{ fontSize: 18, color: '#A3A3A3' }} />
              <span>System Overview</span>
              <span className="text-text-muted text-xs font-normal">(Last 5 minutes)</span>
            </div>
          </div>

          <SystemOverview
            metrics={metrics}
            metricsHistory={metricsHistory}
          />
        </section>
      </main>

      {/* Error Panel */}
      {showErrorPanel && (
        <ErrorPanel
          analysis={currentAnalysis}
          generatedFix={generatedFix}
          isAnalyzing={isAnalyzing}
          isGeneratingFix={isGeneratingFix}
          onGenerateFix={generateFix}
          onDismiss={handleDismissPanel}
        />
      )}

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Connection error banner */}
      {!connected && (
        <div className="fixed top-0 left-0 right-0 bg-status-error/10 border-b border-status-error/30 p-3 z-50">
          <div className="flex items-center justify-center gap-2">
            <WarningAmberIcon sx={{ fontSize: 16, color: '#EF4444' }} />
            <span className="text-sm text-status-error">Disconnected from server. Attempting to reconnect...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
