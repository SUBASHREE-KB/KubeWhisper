/**
 * Log Collector
 * Streams Docker container logs in real-time and detects errors
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class LogCollector extends EventEmitter {
  constructor(options = {}) {
    super();

    this.bufferSize = options.bufferSize || 1000;
    this.logs = [];
    this.processes = new Map();
    this.services = options.services || [];
    this.isRunning = false;

    // Error detection patterns
    this.errorPatterns = [
      /\bERROR\b/i,
      /\bCRITICAL\b/i,
      /\bException\b/i,
      /\bFailed\b/i,
      /\b500\b/,
      /\b502\b/,
      /\b503\b/,
      /\b504\b/,
      /\btimeout\b/i,
      /\bdeadlock\b/i,
      /\bconnection refused\b/i,
      /\bpool exhausted\b/i,
      /\bOOM\b/,
      /\bout of memory\b/i
    ];

    console.log('[LogCollector] Initialized with buffer size:', this.bufferSize);
  }

  /**
   * Parse a log line into structured format
   * @param {string} line - Raw log line
   * @param {string} containerName - Source container name
   * @returns {object} Parsed log object
   */
  parseLine(line, containerName) {
    // Expected format: [SERVICE-NAME] TIMESTAMP LEVEL: Message
    const regex = /^\[([^\]]+)\]\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s*(\w+):\s*(.+)$/;
    const match = line.match(regex);

    if (match) {
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        service: match[1],
        timestamp: match[2],
        level: match[3].toUpperCase(),
        message: match[4],
        container: containerName,
        raw: line
      };
    }

    // Fallback parsing for non-standard logs
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      service: this.extractServiceName(containerName),
      timestamp: new Date().toISOString(),
      level: this.detectLevel(line),
      message: line.trim(),
      container: containerName,
      raw: line
    };
  }

  /**
   * Extract service name from container name
   * @param {string} containerName - Docker container name
   * @returns {string} Service name
   */
  extractServiceName(containerName) {
    // Handle formats like "kubewhisper-api-gateway-1" or "kubewhisper_api-gateway_1"
    // Also handles: "api-gateway-1", "kubewhisper-user-service-1", etc.

    // Known service name mappings
    const serviceMap = {
      'api-gateway': 'API-GATEWAY',
      'user-service': 'USER-SERVICE',
      'db-service': 'DB-SERVICE',
      'apigateway': 'API-GATEWAY',
      'userservice': 'USER-SERVICE',
      'dbservice': 'DB-SERVICE'
    };

    // Try to match known service names in the container name
    const lowerName = containerName.toLowerCase();
    for (const [key, value] of Object.entries(serviceMap)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }

    // Fallback: Extract between kubewhisper prefix and numeric suffix
    // Pattern: kubewhisper-SERVICE_NAME-1 or kubewhisper_SERVICE_NAME_1
    const prefixMatch = containerName.match(/kubewhisper[-_](.+?)[-_]?\d*$/i);
    if (prefixMatch) {
      // Remove trailing numbers and dashes
      let serviceName = prefixMatch[1].replace(/[-_]?\d+$/, '');
      return serviceName.toUpperCase();
    }

    // Last resort: just uppercase the container name
    return containerName.toUpperCase();
  }

  /**
   * Detect log level from message content
   * @param {string} message - Log message
   * @returns {string} Detected level
   */
  detectLevel(message) {
    if (/\bCRITICAL\b/i.test(message)) return 'CRITICAL';
    if (/\bERROR\b/i.test(message)) return 'ERROR';
    if (/\bWARN(ING)?\b/i.test(message)) return 'WARN';
    if (/\bDEBUG\b/i.test(message)) return 'DEBUG';
    return 'INFO';
  }

  /**
   * Check if a log entry contains an error
   * @param {object} log - Parsed log object
   * @returns {boolean} True if error detected
   */
  isError(log) {
    // Check level
    if (['ERROR', 'CRITICAL'].includes(log.level)) {
      return true;
    }

    // Check patterns in message
    return this.errorPatterns.some(pattern => pattern.test(log.message));
  }

  /**
   * Add a log to the buffer
   * @param {object} log - Parsed log object
   */
  addLog(log) {
    this.logs.push(log);

    // Maintain circular buffer
    if (this.logs.length > this.bufferSize) {
      this.logs.shift();
    }

    // Emit log event
    this.emit('log', log);

    // Check for errors
    if (this.isError(log)) {
      console.log('[LogCollector] Error detected:', log.message.substring(0, 100));
      this.emit('error-detected', log);
    }
  }

  /**
   * Start streaming logs for a container
   * @param {string} containerName - Container to stream from
   */
  streamContainer(containerName) {
    console.log(`[LogCollector] Starting stream for ${containerName}`);

    const proc = spawn('docker', ['logs', '-f', '--tail', '50', containerName], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.processes.set(containerName, proc);

    // Handle stdout
    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const log = this.parseLine(line, containerName);
        this.addLog(log);
      });
    });

    // Handle stderr (Docker sends logs to stderr by default)
    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const log = this.parseLine(line, containerName);
        this.addLog(log);
      });
    });

    proc.on('error', (error) => {
      console.error(`[LogCollector] Stream error for ${containerName}:`, error.message);
      this.emit('stream-error', { container: containerName, error: error.message });
    });

    proc.on('close', (code) => {
      console.log(`[LogCollector] Stream closed for ${containerName} with code ${code}`);
      this.processes.delete(containerName);

      // Attempt to reconnect after a delay if still running
      if (this.isRunning) {
        setTimeout(() => {
          if (this.isRunning) {
            this.streamContainer(containerName);
          }
        }, 5000);
      }
    });
  }

  /**
   * Start collecting logs from all services
   */
  async start() {
    if (this.isRunning) {
      console.log('[LogCollector] Already running');
      return;
    }

    console.log('[LogCollector] Starting log collection');
    this.isRunning = true;

    // Start streaming from each service
    for (const service of this.services) {
      try {
        this.streamContainer(service);
      } catch (error) {
        console.error(`[LogCollector] Failed to start stream for ${service}:`, error.message);
      }
    }

    this.emit('started');
  }

  /**
   * Stop collecting logs
   */
  stop() {
    console.log('[LogCollector] Stopping log collection');
    this.isRunning = false;

    // Kill all streaming processes
    for (const [containerName, proc] of this.processes) {
      console.log(`[LogCollector] Killing stream for ${containerName}`);
      proc.kill('SIGTERM');
    }

    this.processes.clear();
    this.emit('stopped');
  }

  /**
   * Get recent logs
   * @param {number} count - Number of logs to retrieve
   * @returns {object[]} Recent logs
   */
  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  /**
   * Get logs filtered by service
   * @param {string} serviceName - Service name to filter by
   * @returns {object[]} Filtered logs
   */
  getLogsByService(serviceName) {
    return this.logs.filter(log =>
      log.service.toLowerCase().includes(serviceName.toLowerCase())
    );
  }

  /**
   * Get logs within a time window
   * @param {Date} startTime - Start of time window
   * @param {Date} endTime - End of time window
   * @returns {object[]} Logs within window
   */
  getLogsInTimeWindow(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= start && logTime <= end;
    });
  }

  /**
   * Get only error logs
   * @returns {object[]} Error logs
   */
  getErrorLogs() {
    return this.logs.filter(log => this.isError(log));
  }

  /**
   * Clear the log buffer
   */
  clearLogs() {
    this.logs = [];
    console.log('[LogCollector] Log buffer cleared');
  }

  /**
   * Get current status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeStreams: this.processes.size,
      logCount: this.logs.length,
      bufferSize: this.bufferSize,
      services: Array.from(this.processes.keys())
    };
  }
}

module.exports = LogCollector;
