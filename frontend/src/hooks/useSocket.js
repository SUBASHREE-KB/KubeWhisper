import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [generatedFix, setGeneratedFix] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const logsRef = useRef([]);
  const maxLogs = 500;

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected');
      setConnected(true);
      setError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setError('Failed to connect to server');
    });

    // Handle initial state
    socketInstance.on('initial-state', (state) => {
      console.log('[Socket] Received initial state');
      if (state.logs) {
        logsRef.current = state.logs;
        setLogs([...state.logs]);
      }
      if (state.currentAnalysis) {
        setCurrentAnalysis(state.currentAnalysis);
      }
      setIsAnalyzing(state.status?.isAnalyzing || false);
    });

    // Handle log batches
    socketInstance.on('logs-batch', (newLogs) => {
      logsRef.current = [...logsRef.current, ...newLogs].slice(-maxLogs);
      setLogs([...logsRef.current]);
    });

    // Handle metrics updates
    socketInstance.on('metrics-update', (newMetrics) => {
      setMetrics(newMetrics);
    });

    // Handle error detection
    socketInstance.on('error-detected', (errorData) => {
      setNotification({
        type: 'error',
        title: 'Error Detected',
        message: `${errorData.service}: ${errorData.message.substring(0, 100)}`,
        timestamp: errorData.timestamp
      });
    });

    // Handle analysis events
    socketInstance.on('analysis-started', () => {
      setIsAnalyzing(true);
      setNotification({
        type: 'info',
        title: 'Analysis Started',
        message: 'Analyzing error logs...'
      });
    });

    socketInstance.on('analysis-progress', ({ step, message }) => {
      setNotification({
        type: 'info',
        title: 'Analysis Progress',
        message: `${step}: ${message}`
      });
    });

    socketInstance.on('correlation-complete', (data) => {
      setNotification({
        type: 'info',
        title: 'Correlation Complete',
        message: `Found ${data.logCount} related logs across ${data.affectedServices.length} services`
      });
    });

    socketInstance.on('analysis-complete', (analysis) => {
      console.log('[Socket] Analysis complete');
      setCurrentAnalysis(analysis);
      setIsAnalyzing(false);
      setNotification({
        type: 'success',
        title: 'Analysis Complete',
        message: `Root cause: ${analysis.analysis?.rootCause?.substring(0, 100)}`
      });
    });

    socketInstance.on('analysis-error', ({ error }) => {
      setIsAnalyzing(false);
      setError(error);
      setNotification({
        type: 'error',
        title: 'Analysis Failed',
        message: error || 'Unknown error occurred during analysis'
      });
    });

    // Handle targeted fix events
    socketInstance.on('targeted-fix-generated', (fix) => {
      console.log('[Socket] Targeted fix generated', fix);
      setNotification({
        type: 'success',
        title: 'Smart Fix Ready',
        message: `Fix generated for ${fix.fileName || 'source file'}`
      });
    });

    // Analysis blocked because previous one is still active
    socketInstance.on('analysis-blocked', ({ reason }) => {
      setIsAnalyzing(false);
      setNotification({
        type: 'info',
        title: 'Analysis Locked',
        message: reason
      });
    });

    // Analysis dismissed by user
    socketInstance.on('analysis-dismissed', () => {
      console.log('[Socket] Analysis dismissed');
    });

    // Handle fix generation events
    socketInstance.on('fix-generation-started', () => {
      setIsGeneratingFix(true);
      setNotification({
        type: 'info',
        title: 'Generating Fix',
        message: 'AI is generating code fix...'
      });
    });

    socketInstance.on('fix-generated', (fix) => {
      console.log('[Socket] Fix generated', fix);
      setGeneratedFix(fix);
      setIsGeneratingFix(false);
      setNotification({
        type: 'success',
        title: 'Fix Generated',
        message: `${fix.changes?.length || 0} changes proposed`
      });
    });

    socketInstance.on('fix-error', ({ error }) => {
      console.error('[Socket] Fix generation error:', error);
      setIsGeneratingFix(false);
      setNotification({
        type: 'error',
        title: 'Fix Generation Failed',
        message: error
      });
    });

    // Handle stream errors
    socketInstance.on('stream-error', ({ container, error }) => {
      console.error('[Socket] Stream error:', container, error);
    });

    // Handle general errors
    socketInstance.on('error', ({ message }) => {
      setError(message);
      setNotification({
        type: 'error',
        title: 'Error',
        message
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Request functions
  const requestLogs = useCallback((count = 100) => {
    if (socket) {
      socket.emit('request-logs', count);
    }
  }, [socket]);

  const requestMetrics = useCallback(() => {
    if (socket) {
      socket.emit('request-metrics');
    }
  }, [socket]);

  const triggerAnalysis = useCallback((errorId = null) => {
    if (socket && socket.connected) {
      console.log('[Socket] Emitting trigger-analysis', errorId);
      setIsAnalyzing(true); // Set immediately for UI feedback
      setGeneratedFix(null); // Clear previous fix
      setCurrentAnalysis(null); // Clear previous analysis
      socket.emit('trigger-analysis', errorId);
    } else {
      console.error('[Socket] No socket connection for trigger-analysis');
      setNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Not connected to server. Please check if backend is running.'
      });
    }
  }, [socket]);

  const generateFix = useCallback(() => {
    if (socket) {
      console.log('[Socket] Emitting generate-fix');
      setIsGeneratingFix(true); // Set immediately for UI feedback
      socket.emit('generate-fix');
    } else {
      console.error('[Socket] No socket connection for generate-fix');
    }
  }, [socket]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const clearAnalysis = useCallback(() => {
    // Tell the server to unlock analysis
    if (socket) {
      console.log('[Socket] Emitting dismiss-analysis');
      socket.emit('dismiss-analysis');
    }
    setCurrentAnalysis(null);
    setGeneratedFix(null);
    setIsAnalyzing(false);
    setIsGeneratingFix(false);
  }, [socket]);

  return {
    socket,
    connected,
    logs,
    metrics,
    currentAnalysis,
    generatedFix,
    isAnalyzing,
    isGeneratingFix,
    notification,
    error,
    requestLogs,
    requestMetrics,
    triggerAnalysis,
    generateFix,
    clearNotification,
    clearAnalysis
  };
}

export default useSocket;
