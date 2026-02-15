import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import useSocket from './hooks/useSocket';
import Dashboard from './pages/Dashboard';
import LogsView from './pages/LogsView';

function App() {
  const {
    connected,
    logs,
    metrics,
    currentAnalysis,
    generatedFix,
    isAnalyzing,
    isGeneratingFix,
    notification,
    triggerAnalysis,
    generateFix,
    clearNotification,
    clearAnalysis
  } = useSocket();

  const [metricsHistory, setMetricsHistory] = useState({});

  // Track metrics history
  useEffect(() => {
    if (metrics.length > 0) {
      setMetricsHistory(prev => {
        const updated = { ...prev };
        metrics.forEach(m => {
          if (!updated[m.service]) {
            updated[m.service] = [];
          }
          updated[m.service] = [
            ...updated[m.service],
            {
              timestamp: m.timestamp,
              cpu: m.cpuPercent,
              memory: m.memoryPercent
            }
          ].slice(-60);
        });
        return updated;
      });
    }
  }, [metrics]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  // Shared props for pages
  const sharedProps = {
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
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard {...sharedProps} />} />
        <Route path="/logs" element={<LogsView {...sharedProps} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
