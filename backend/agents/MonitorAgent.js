/**
 * Monitor Agent
 * Collects and monitors service metrics from Docker (no AI)
 * Now stores metrics to database for historical analysis
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Database for storing metrics history
let logDatabase = null;
try {
  logDatabase = require('../database/LogDatabase');
} catch (e) {
  console.log('[MonitorAgent] Database not available for metrics storage');
}

class MonitorAgent {
  constructor(options = {}) {
    this.services = options.services || [];
    this.metricsHistory = new Map();
    this.historyLimit = options.historyLimit || 60; // Keep 60 data points
    this.pollInterval = options.pollInterval || 5000; // Poll every 5 seconds
    this.isMonitoring = false;
    this.intervalId = null;

    console.log('[MonitorAgent] Initialized with services:', this.services);
  }

  /**
   * Get metrics for a single service
   * @param {string} serviceName - Container name
   * @returns {Promise<object>} Service metrics
   */
  async getServiceMetrics(serviceName) {
    try {
      const { stdout } = await execAsync(
        `docker stats ${serviceName} --no-stream --format "{{json .}}"`,
        { timeout: 10000 }
      );

      const stats = JSON.parse(stdout.trim());

      // Parse CPU percentage
      const cpuPercent = parseFloat(stats.CPUPerc?.replace('%', '') || '0');

      // Parse memory usage
      const memMatch = stats.MemUsage?.match(/([\d.]+)(\w+)\s*\/\s*([\d.]+)(\w+)/);
      let memoryUsedMB = 0;
      let memoryTotalMB = 0;
      if (memMatch) {
        memoryUsedMB = this.convertToMB(parseFloat(memMatch[1]), memMatch[2]);
        memoryTotalMB = this.convertToMB(parseFloat(memMatch[3]), memMatch[4]);
      }

      const memPercent = parseFloat(stats.MemPerc?.replace('%', '') || '0');

      // Parse network I/O
      const netMatch = stats.NetIO?.match(/([\d.]+)(\w+)\s*\/\s*([\d.]+)(\w+)/);
      let netIn = '0B';
      let netOut = '0B';
      if (netMatch) {
        netIn = `${memMatch[1]}${memMatch[2]}`;
        netOut = `${memMatch[3]}${memMatch[4]}`;
      }

      const metrics = {
        service: serviceName,
        container: stats.Name || serviceName,
        cpu: stats.CPUPerc || '0%',
        cpuPercent: cpuPercent,
        memory: stats.MemUsage || '0MiB / 0MiB',
        memoryUsedMB: memoryUsedMB,
        memoryTotalMB: memoryTotalMB,
        memoryPercent: memPercent,
        netIO: stats.NetIO || '0B / 0B',
        blockIO: stats.BlockIO || '0B / 0B',
        pids: parseInt(stats.PIDs || '0'),
        status: this.determineStatus(cpuPercent, memPercent),
        timestamp: new Date().toISOString()
      };

      // Update history
      this.updateHistory(serviceName, metrics);

      return metrics;
    } catch (error) {
      console.error(`[MonitorAgent] Failed to get metrics for ${serviceName}:`, error.message);

      return {
        service: serviceName,
        container: serviceName,
        cpu: 'N/A',
        cpuPercent: 0,
        memory: 'N/A',
        memoryUsedMB: 0,
        memoryTotalMB: 0,
        memoryPercent: 0,
        netIO: 'N/A',
        blockIO: 'N/A',
        pids: 0,
        status: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Convert memory value to MB
   * @param {number} value - Numeric value
   * @param {string} unit - Unit (B, KB, MiB, GiB, etc.)
   * @returns {number} Value in MB
   */
  convertToMB(value, unit) {
    const units = {
      'B': 1 / (1024 * 1024),
      'KB': 1 / 1024,
      'KiB': 1 / 1024,
      'MB': 1,
      'MiB': 1,
      'GB': 1024,
      'GiB': 1024
    };

    return value * (units[unit] || 1);
  }

  /**
   * Determine service health status
   * @param {number} cpuPercent - CPU usage percentage
   * @param {number} memPercent - Memory usage percentage
   * @returns {string} Status (healthy, warning, critical)
   */
  determineStatus(cpuPercent, memPercent) {
    if (cpuPercent > 80 || memPercent > 90) {
      return 'critical';
    }
    if (cpuPercent > 50 || memPercent > 70) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Update metrics history for a service
   * @param {string} serviceName - Service name
   * @param {object} metrics - Current metrics
   */
  updateHistory(serviceName, metrics) {
    if (!this.metricsHistory.has(serviceName)) {
      this.metricsHistory.set(serviceName, []);
    }

    const history = this.metricsHistory.get(serviceName);
    history.push({
      timestamp: metrics.timestamp,
      cpu: metrics.cpuPercent,
      memory: metrics.memoryPercent,
      pids: metrics.pids
    });

    // Maintain history limit
    if (history.length > this.historyLimit) {
      history.shift();
    }

    // Store to database for long-term analysis (async, non-blocking)
    if (logDatabase && logDatabase.storeMetrics) {
      logDatabase.storeMetrics({
        service: serviceName,
        cpu: metrics.cpuPercent,
        memory: metrics.memoryPercent,
        memoryUsage: metrics.memoryUsedMB,
        memoryLimit: metrics.memoryTotalMB,
        networkRx: 0,
        networkTx: 0,
        status: metrics.status
      }).catch(() => {
        // Ignore database errors - non-critical
      });
    }
  }

  /**
   * Get all metrics for configured services
   * @returns {Promise<object[]>} Array of service metrics
   */
  async getAllMetrics() {
    const results = await Promise.all(
      this.services.map(service => this.getServiceMetrics(service))
    );

    return results;
  }

  /**
   * Get metrics history for a service
   * @param {string} serviceName - Service name
   * @returns {object[]} Metrics history
   */
  getHistory(serviceName) {
    return this.metricsHistory.get(serviceName) || [];
  }

  /**
   * Get metrics history for all services
   * @returns {object} Map of service name to history
   */
  getAllHistory() {
    const history = {};
    for (const [service, data] of this.metricsHistory) {
      history[service] = data;
    }
    return history;
  }

  /**
   * Start continuous monitoring
   * @param {function} callback - Called with metrics on each poll
   */
  startMonitoring(callback) {
    if (this.isMonitoring) {
      console.log('[MonitorAgent] Already monitoring');
      return;
    }

    console.log('[MonitorAgent] Starting continuous monitoring');
    this.isMonitoring = true;

    const poll = async () => {
      try {
        const metrics = await this.getAllMetrics();
        if (callback) {
          callback(metrics);
        }
      } catch (error) {
        console.error('[MonitorAgent] Polling error:', error.message);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    this.intervalId = setInterval(poll, this.pollInterval);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[MonitorAgent] Stopping monitoring');
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get aggregated metrics summary
   * @returns {Promise<object>} Summary metrics
   */
  async getSummary() {
    const metrics = await this.getAllMetrics();

    const summary = {
      totalServices: metrics.length,
      healthyServices: metrics.filter(m => m.status === 'healthy').length,
      warningServices: metrics.filter(m => m.status === 'warning').length,
      criticalServices: metrics.filter(m => m.status === 'critical').length,
      avgCpu: 0,
      avgMemory: 0,
      timestamp: new Date().toISOString()
    };

    if (metrics.length > 0) {
      const validMetrics = metrics.filter(m => !m.error);
      if (validMetrics.length > 0) {
        summary.avgCpu = validMetrics.reduce((sum, m) => sum + m.cpuPercent, 0) / validMetrics.length;
        summary.avgMemory = validMetrics.reduce((sum, m) => sum + m.memoryPercent, 0) / validMetrics.length;
      }
    }

    return summary;
  }

  /**
   * Check for anomalies in metrics
   * @returns {Promise<object[]>} List of detected anomalies
   */
  async checkAnomalies() {
    const metrics = await this.getAllMetrics();
    const anomalies = [];

    for (const metric of metrics) {
      const history = this.getHistory(metric.service);

      if (history.length < 5) continue;

      // Calculate recent average
      const recentHistory = history.slice(-10);
      const avgCpu = recentHistory.reduce((sum, h) => sum + h.cpu, 0) / recentHistory.length;
      const avgMem = recentHistory.reduce((sum, h) => sum + h.memory, 0) / recentHistory.length;

      // Detect spikes (>50% above average)
      if (metric.cpuPercent > avgCpu * 1.5 && metric.cpuPercent > 20) {
        anomalies.push({
          service: metric.service,
          type: 'cpu_spike',
          current: metric.cpuPercent,
          average: avgCpu,
          timestamp: metric.timestamp
        });
      }

      if (metric.memoryPercent > avgMem * 1.3 && metric.memoryPercent > 50) {
        anomalies.push({
          service: metric.service,
          type: 'memory_spike',
          current: metric.memoryPercent,
          average: avgMem,
          timestamp: metric.timestamp
        });
      }
    }

    return anomalies;
  }
}

module.exports = MonitorAgent;
