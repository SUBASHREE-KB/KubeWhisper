/**
 * KubeWhisper Backend Server
 * Real-Time Root Cause Analysis Dashboard
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import collectors and agents
const LogCollector = require('./collectors/LogCollector');
const CorrelatorAgent = require('./agents/CorrelatorAgent');
const AnalyzerAgent = require('./agents/AnalyzerAgent');
const CodeLocatorAgent = require('./agents/CodeLocatorAgent');
const FixGeneratorAgent = require('./agents/FixGeneratorAgent');
const CodeFixAgent = require('./agents/CodeFixAgent');
const MonitorAgent = require('./agents/MonitorAgent');
const ServiceDiscovery = require('./services/ServiceDiscovery');
const servicesConfig = require('./config/services.config');

// Configuration
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Dynamic service discovery configuration
const discoveryConfig = {
  discoveryMode: servicesConfig.discoveryMode,
  manualServices: servicesConfig.manualServices,
  servicePatterns: servicesConfig.servicePatterns,
  excludePatterns: servicesConfig.autoDiscovery.excludePatterns,
  requiredLabels: servicesConfig.autoDiscovery.requiredLabels,
  refreshInterval: servicesConfig.autoDiscovery.refreshInterval
};

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Initialize agents
console.log('[Server] Initializing agents...');

// Service discovery
const serviceDiscovery = new ServiceDiscovery(discoveryConfig);

const logCollector = new LogCollector({
  services: [], // Will be populated by service discovery
  bufferSize: 1000
});

const correlatorAgent = new CorrelatorAgent({
  timeWindowMs: 5000
});

const analyzerAgent = new AnalyzerAgent(GEMINI_API_KEY);
const codeLocatorAgent = new CodeLocatorAgent(GEMINI_API_KEY);
const fixGeneratorAgent = new FixGeneratorAgent(GEMINI_API_KEY);
const codeFixAgent = new CodeFixAgent(GEMINI_API_KEY);

const monitorAgent = new MonitorAgent({
  services: [], // Will be populated by service discovery
  pollInterval: 5000
});

// Service discovery event handlers
serviceDiscovery.on('services-added', (services) => {
  const names = services.map(s => s.name);
  console.log('[Server] New services discovered:', names);

  // Update collectors with new services
  logCollector.services = [...logCollector.services, ...names];
  monitorAgent.services = [...monitorAgent.services, ...names];

  // Start streaming logs for new services
  for (const name of names) {
    logCollector.streamContainer(name);
  }

  // Notify connected clients
  io.emit('services-updated', {
    action: 'added',
    services: services,
    total: serviceDiscovery.getServiceNames()
  });
});

serviceDiscovery.on('services-removed', (services) => {
  const names = services.map(s => s.name);
  console.log('[Server] Services removed:', names);

  // Update collectors
  logCollector.services = logCollector.services.filter(s => !names.includes(s));
  monitorAgent.services = monitorAgent.services.filter(s => !names.includes(s));

  // Notify connected clients
  io.emit('services-updated', {
    action: 'removed',
    services: services,
    total: serviceDiscovery.getServiceNames()
  });
});

serviceDiscovery.on('discovery-complete', (services) => {
  console.log('[Server] Discovery complete. Services:', services.length);
});

// State management
let currentAnalysis = null;
let isAnalyzing = false;
let analysisLocked = false;  // When true, don't allow new analysis until user dismisses
let connectedClients = 0;

// Log batching for WebSocket
let logBatch = [];
const LOG_BATCH_INTERVAL = 100; // ms

// Batch log emissions
setInterval(() => {
  if (logBatch.length > 0 && connectedClients > 0) {
    io.emit('logs-batch', logBatch);
    logBatch = [];
  }
}, LOG_BATCH_INTERVAL);

// LogCollector event handlers
logCollector.on('log', (log) => {
  logBatch.push(log);
});

logCollector.on('error-detected', async (errorLog) => {
  console.log('[Server] Error detected:', errorLog.message.substring(0, 100));

  // Emit error notification only - NO auto-analysis
  // User must click on error to trigger analysis
  io.emit('error-detected', {
    id: errorLog.id,
    service: errorLog.service,
    message: errorLog.message,
    timestamp: errorLog.timestamp,
    level: errorLog.level
  });
});

logCollector.on('stream-error', ({ container, error }) => {
  console.error(`[Server] Stream error for ${container}:`, error);
  io.emit('stream-error', { container, error });
});

// Monitor event handling
monitorAgent.startMonitoring((metrics) => {
  if (connectedClients > 0) {
    io.emit('metrics-update', metrics);
  }
});

/**
 * Perform full error analysis pipeline
 * @param {object} errorLog - Error log entry
 * @param {boolean} force - Force analysis even if locked (when user explicitly clicks)
 */
async function performAnalysis(errorLog, force = false) {
  // Check if analysis is locked (user hasn't dismissed previous analysis)
  if (analysisLocked && !force) {
    console.log('[Server] Analysis locked - user must dismiss current analysis first');
    io.emit('analysis-blocked', {
      reason: 'Please dismiss or resolve the current analysis before analyzing a new error'
    });
    return null;
  }

  if (isAnalyzing) {
    console.log('[Server] Analysis already in progress');
    return null;
  }

  isAnalyzing = true;
  analysisLocked = true;  // Lock immediately when starting
  io.emit('analysis-started', { errorId: errorLog.id });

  try {
    console.log('[Server] Starting analysis pipeline...');

    // Step 1: Correlate logs
    const allLogs = logCollector.getRecentLogs(200);
    const correlatedData = correlatorAgent.findRelatedLogs(errorLog, allLogs);

    io.emit('correlation-complete', {
      errorId: errorLog.id,
      affectedServices: correlatedData.affectedServices,
      logCount: correlatedData.totalRelatedLogs
    });

    // Step 2: AI Analysis
    const analysis = await analyzerAgent.analyzeError(correlatedData);

    io.emit('analysis-progress', {
      step: 'analysis',
      message: 'Root cause identified'
    });

    // Step 3: Locate code
    const codeLocation = await codeLocatorAgent.locateCode(
      analysis,
      analysis.originService
    );

    io.emit('analysis-progress', {
      step: 'location',
      message: 'Code location identified'
    });

    // Combine results
    currentAnalysis = {
      id: errorLog.id,
      timestamp: new Date().toISOString(),
      errorLog: errorLog,
      correlation: correlatedData,
      analysis: analysis,
      codeLocation: codeLocation
    };

    // Emit complete analysis - analysis stays LOCKED until user dismisses
    io.emit('analysis-complete', currentAnalysis);

    console.log('[Server] Analysis complete for:', errorLog.id);
    console.log('[Server] Analysis is now LOCKED until user dismisses');

    return currentAnalysis;
  } catch (error) {
    console.error('[Server] Analysis failed:', error.message);
    analysisLocked = false;  // Unlock on error so user can try again

    io.emit('analysis-error', {
      errorId: errorLog.id,
      error: error.message
    });

    return null;
  } finally {
    isAnalyzing = false;
  }
}

/**
 * Unlock analysis - called when user dismisses the panel
 */
function unlockAnalysis() {
  console.log('[Server] Analysis unlocked');
  analysisLocked = false;
  currentAnalysis = null;
}

// REST API Endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectedClients,
    agents: {
      logCollector: logCollector.getStatus(),
      monitoring: monitorAgent.isMonitoring
    }
  });
});

// Get recent logs
app.get('/api/logs', (req, res) => {
  const count = parseInt(req.query.count) || 100;
  const logs = logCollector.getRecentLogs(count);
  res.json(logs);
});

// Get logs by service
app.get('/api/logs/:service', (req, res) => {
  const logs = logCollector.getLogsByService(req.params.service);
  res.json(logs);
});

// Get error logs only
app.get('/api/logs/errors', (req, res) => {
  const errors = logCollector.getErrorLogs();
  res.json(errors);
});

// Get current metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await monitorAgent.getAllMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get metrics summary
app.get('/api/metrics/summary', async (req, res) => {
  try {
    const summary = await monitorAgent.getSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get metrics history
app.get('/api/metrics/history', (req, res) => {
  const history = monitorAgent.getAllHistory();
  res.json(history);
});

// Trigger manual analysis
app.post('/api/analyze-error', async (req, res) => {
  const { errorId } = req.body;

  // Find error log
  const logs = logCollector.getRecentLogs(500);
  const errorLog = logs.find(log => log.id === errorId) ||
    logs.find(log => ['ERROR', 'CRITICAL'].includes(log.level));

  if (!errorLog) {
    return res.status(404).json({ error: 'No error log found to analyze' });
  }

  try {
    const result = await performAnalysis(errorLog);
    if (result) {
      res.json(result);
    } else {
      res.status(500).json({ error: 'Analysis failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate code fix
app.post('/api/generate-fix', async (req, res) => {
  if (!currentAnalysis) {
    return res.status(400).json({ error: 'No analysis available. Analyze an error first.' });
  }

  try {
    io.emit('fix-generation-started', {
      analysisId: currentAnalysis.id
    });

    const fix = await fixGeneratorAgent.generateFix(
      currentAnalysis.codeLocation,
      currentAnalysis.analysis
    );

    io.emit('fix-generated', fix);

    res.json(fix);
  } catch (error) {
    console.error('[Server] Fix generation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate targeted fix by reading actual source code
app.post('/api/generate-targeted-fix', async (req, res) => {
  if (!currentAnalysis) {
    return res.status(400).json({ error: 'No analysis available. Analyze an error first.' });
  }

  try {
    console.log('[Server] Generating targeted fix...');
    io.emit('fix-generation-started', {
      analysisId: currentAnalysis.id,
      type: 'targeted'
    });

    // Use CodeFixAgent to read source and generate targeted fix
    const fix = await codeFixAgent.generateFix(currentAnalysis.analysis);

    if (fix.success) {
      console.log('[Server] Targeted fix generated:', {
        file: fix.fileName,
        confidence: fix.confidence
      });

      io.emit('targeted-fix-generated', {
        ...fix,
        analysisId: currentAnalysis.id
      });

      res.json(fix);
    } else {
      console.log('[Server] Could not generate targeted fix:', fix.error);
      res.status(400).json({
        error: fix.error || 'Could not generate targeted fix',
        suggestion: fix.suggestion
      });
    }
  } catch (error) {
    console.error('[Server] Targeted fix generation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Apply targeted fix to source code
app.post('/api/apply-targeted-fix', async (req, res) => {
  const { filePath, oldCode, newCode } = req.body;

  if (!filePath || !oldCode || !newCode) {
    return res.status(400).json({
      error: 'filePath, oldCode, and newCode are required'
    });
  }

  try {
    console.log('[Server] Applying targeted fix to:', filePath);

    const result = await codeFixAgent.applyFix(filePath, oldCode, newCode);

    if (result.success) {
      io.emit('fix-applied', {
        filePath,
        backup: result.backup,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Fix applied successfully`,
        filePath,
        backup: result.backup
      });
    } else {
      res.status(400).json({
        error: result.error || 'Could not apply fix'
      });
    }
  } catch (error) {
    console.error('[Server] Failed to apply targeted fix:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get current analysis
app.get('/api/analysis', (req, res) => {
  if (currentAnalysis) {
    res.json(currentAnalysis);
  } else {
    res.status(404).json({ error: 'No analysis available' });
  }
});

// Get collector status
app.get('/api/status', (req, res) => {
  res.json({
    logCollector: logCollector.getStatus(),
    monitoring: monitorAgent.isMonitoring,
    connectedClients,
    currentAnalysis: currentAnalysis ? {
      id: currentAnalysis.id,
      timestamp: currentAnalysis.timestamp
    } : null,
    isAnalyzing,
    analysisLocked  // Shows if analysis is locked (waiting for user to dismiss)
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`[Server] Client connected. Total: ${connectedClients}`);

  // Send current state to new client
  socket.emit('initial-state', {
    logs: logCollector.getRecentLogs(50),
    currentAnalysis,
    status: {
      isAnalyzing,
      services: serviceDiscovery.getServiceNames()
    }
  });

  // Handle client requests
  socket.on('request-logs', (count) => {
    socket.emit('logs-batch', logCollector.getRecentLogs(count || 100));
  });

  socket.on('request-metrics', async () => {
    try {
      const metrics = await monitorAgent.getAllMetrics();
      socket.emit('metrics-update', metrics);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('trigger-analysis', async (errorId) => {
    console.log('[Server] Analysis triggered by user for:', errorId || 'latest error');

    // User explicitly clicked, so force=true to override lock
    const logs = logCollector.getRecentLogs(500);
    const errorLog = logs.find(log => log.id === errorId) ||
      logs.find(log => ['ERROR', 'CRITICAL'].includes(log.level));

    if (errorLog) {
      console.log('[Server] Found error log:', errorLog.message.substring(0, 50));
      // Force=true because user explicitly requested this analysis
      await performAnalysis(errorLog, true);
    } else {
      console.log('[Server] No error log found, total logs:', logs.length);
      io.emit('analysis-error', { errorId: null, error: 'No error logs found to analyze' });
    }
  });

  // User dismissed the analysis panel - unlock for new analysis
  socket.on('dismiss-analysis', () => {
    console.log('[Server] User dismissed analysis');
    unlockAnalysis();
    io.emit('analysis-dismissed');
  });

  socket.on('generate-fix', async () => {
    console.log('[Server] Generate fix requested');

    if (!currentAnalysis) {
      console.log('[Server] No current analysis for fix generation');
      socket.emit('fix-error', { error: 'No analysis available. Analyze an error first.' });
      return;
    }

    try {
      io.emit('fix-generation-started', { analysisId: currentAnalysis.id });

      console.log('[Server] Generating fix for:', currentAnalysis.analysis?.originService);
      const fix = await fixGeneratorAgent.generateFix(
        currentAnalysis.codeLocation,
        currentAnalysis.analysis
      );

      console.log('[Server] Fix generated successfully');
      io.emit('fix-generated', fix);
    } catch (error) {
      console.error('[Server] Fix generation failed:', error.message);
      socket.emit('fix-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`[Server] Client disconnected. Total: ${connectedClients}`);
  });
});

// Start log collection with service discovery
async function startLogCollection() {
  try {
    // Start service discovery
    await serviceDiscovery.start();

    // Get discovered services
    const services = serviceDiscovery.getServiceNames();

    if (services.length > 0) {
      console.log('[Server] Discovered services:', services);
      logCollector.services = services;
      monitorAgent.services = services;
    } else {
      console.log('[Server] No services discovered yet. Waiting for containers...');
    }

    // Start log collection
    logCollector.start();
  } catch (error) {
    console.error('[Server] Failed to start log collection:', error.message);
  }
}

// API endpoint to configure services manually
app.post('/api/config/services', (req, res) => {
  const { services, mode, patterns } = req.body;

  try {
    if (mode) {
      serviceDiscovery.discoveryMode = mode;
    }

    if (services && Array.isArray(services)) {
      serviceDiscovery.manualServices = services;
    }

    if (patterns && Array.isArray(patterns)) {
      serviceDiscovery.servicePatterns = patterns;
    }

    // Re-discover services
    serviceDiscovery.discover().then(discoveredServices => {
      const names = discoveredServices.map(s => s.name);
      logCollector.services = names;
      monitorAgent.services = names;

      // Restart log collection for new services
      logCollector.stop();
      logCollector.start();

      res.json({
        success: true,
        mode: serviceDiscovery.discoveryMode,
        services: names
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current service configuration
app.get('/api/config/services', (req, res) => {
  res.json({
    mode: serviceDiscovery.discoveryMode,
    manualServices: serviceDiscovery.manualServices,
    servicePatterns: serviceDiscovery.servicePatterns,
    discoveredServices: serviceDiscovery.getStatus().services
  });
});

// Trigger manual service discovery
app.post('/api/config/discover', async (req, res) => {
  try {
    const services = await serviceDiscovery.discover();
    res.json({
      success: true,
      services: services
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a specific service to monitor
app.post('/api/config/services/add', async (req, res) => {
  const { containerName } = req.body;

  if (!containerName) {
    return res.status(400).json({ error: 'containerName is required' });
  }

  try {
    // Add to manual services
    if (!serviceDiscovery.manualServices.includes(containerName)) {
      serviceDiscovery.manualServices.push(containerName);
    }

    // Add to collectors
    if (!logCollector.services.includes(containerName)) {
      logCollector.services.push(containerName);
      monitorAgent.services.push(containerName);
      logCollector.streamContainer(containerName);
    }

    res.json({
      success: true,
      message: `Added ${containerName} to monitoring`,
      services: logCollector.services
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a service from monitoring
app.post('/api/config/services/remove', (req, res) => {
  const { containerName } = req.body;

  if (!containerName) {
    return res.status(400).json({ error: 'containerName is required' });
  }

  try {
    // Remove from manual services
    serviceDiscovery.manualServices = serviceDiscovery.manualServices.filter(
      s => s !== containerName
    );

    // Remove from collectors
    logCollector.services = logCollector.services.filter(s => s !== containerName);
    monitorAgent.services = monitorAgent.services.filter(s => s !== containerName);

    res.json({
      success: true,
      message: `Removed ${containerName} from monitoring`,
      services: logCollector.services
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply generated fix to source code
app.post('/api/apply-fix', async (req, res) => {
  const { fixedCode, serviceName, fileName } = req.body;

  if (!fixedCode || !serviceName || !fileName) {
    return res.status(400).json({
      error: 'fixedCode, serviceName, and fileName are required'
    });
  }

  try {
    const fs = require('fs').promises;
    const path = require('path');
    const { mapServiceName } = require('./utils/codeReader');

    // Map service name to directory
    const serviceDir = mapServiceName(serviceName);
    const servicesPath = process.env.SERVICES_PATH || '../services';
    const filePath = path.resolve(__dirname, servicesPath, serviceDir, fileName);

    // Create backup of original file
    const backupPath = filePath + '.backup.' + Date.now();
    try {
      const originalContent = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(backupPath, originalContent);
      console.log(`[Server] Created backup: ${backupPath}`);
    } catch (err) {
      console.warn('[Server] Could not create backup:', err.message);
    }

    // Write the fixed code
    await fs.writeFile(filePath, fixedCode, 'utf-8');
    console.log(`[Server] Applied fix to: ${filePath}`);

    // Notify clients
    io.emit('fix-applied', {
      serviceName,
      fileName,
      filePath,
      backupPath,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Fix applied to ${serviceDir}/${fileName}`,
      filePath,
      backupPath,
      rebuildCommand: `docker-compose up -d --build ${serviceDir}`
    });
  } catch (error) {
    console.error('[Server] Failed to apply fix:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Rebuild a service container after fix
app.post('/api/rebuild-service', async (req, res) => {
  const { serviceName } = req.body;

  if (!serviceName) {
    return res.status(400).json({ error: 'serviceName is required' });
  }

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const { mapServiceName } = require('./utils/codeReader');

    const serviceDir = mapServiceName(serviceName);
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '..');
    const composeFile = process.env.COMPOSE_FILE || 'docker-compose.services.yml';

    console.log(`[Server] Rebuilding service: ${serviceDir}`);
    console.log(`[Server] Using compose file: ${composeFile}`);
    console.log(`[Server] Project root: ${projectRoot}`);

    // Use the services compose file
    const command = `docker-compose -f ${composeFile} up -d --build ${serviceDir}`;
    console.log(`[Server] Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });

    io.emit('service-rebuilt', {
      serviceName: serviceDir,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Service ${serviceDir} rebuilt successfully`,
      output: stdout || stderr
    });
  } catch (error) {
    console.error('[Server] Failed to rebuild service:', error.message);

    const serviceDir = require('./utils/codeReader').mapServiceName(serviceName);

    res.status(500).json({
      error: error.message,
      hint: `Rebuild manually: docker-compose -f docker-compose.services.yml up -d --build ${serviceDir}`,
      manualCommand: `docker-compose -f docker-compose.services.yml up -d --build ${serviceDir}`
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 KubeWhisper Backend Server                           ║
║                                                           ║
║   Server:    http://localhost:${PORT}                       ║
║   WebSocket: ws://localhost:${PORT}                         ║
║   Frontend:  ${FRONTEND_URL}                    ║
║                                                           ║
║   AI:        ${GEMINI_API_KEY ? 'Gemini Enabled ✓' : 'Disabled (No API Key)'}                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Start log collection
  startLogCollection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM, shutting down...');
  serviceDiscovery.stop();
  logCollector.stop();
  monitorAgent.stopMonitoring();
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down...');
  serviceDiscovery.stop();
  logCollector.stop();
  monitorAgent.stopMonitoring();
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});
