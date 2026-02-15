/**
 * Correlator Agent
 * Correlates related logs around an error event (no AI - pure JavaScript)
 */

class CorrelatorAgent {
  constructor(options = {}) {
    this.timeWindowMs = options.timeWindowMs || 30000; // ±30 seconds (increased from 5s)
    console.log('[CorrelatorAgent] Initialized with time window:', this.timeWindowMs, 'ms');
  }

  /**
   * Find logs related to an error
   * @param {object} errorLog - The error log entry
   * @param {object[]} allLogs - All available logs
   * @returns {object} Correlated log data
   */
  findRelatedLogs(errorLog, allLogs) {
    const errorTime = new Date(errorLog.timestamp).getTime();
    const windowStart = errorTime - this.timeWindowMs;
    const windowEnd = errorTime + this.timeWindowMs;

    console.log('[CorrelatorAgent] Finding related logs around:', errorLog.timestamp);
    console.log('[CorrelatorAgent] Total logs available:', allLogs.length);

    // Filter logs within time window
    let relatedLogs = allLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= windowStart && logTime <= windowEnd;
    });

    // If no logs found in time window, use recent error logs instead
    if (relatedLogs.length === 0) {
      console.log('[CorrelatorAgent] No logs in time window, using recent error logs');

      // Get all error logs from the buffer
      const errorLogs = allLogs.filter(log =>
        ['ERROR', 'CRITICAL'].includes(log.level) ||
        /error|failed|timeout|exception/i.test(log.message)
      );

      // Take the most recent 50 logs
      relatedLogs = errorLogs.slice(-50);

      // If still nothing, use all recent logs
      if (relatedLogs.length === 0) {
        relatedLogs = allLogs.slice(-50);
      }
    }

    // Sort by timestamp
    relatedLogs.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group logs by service
    const logsByService = this.groupByService(relatedLogs);

    // Find affected services
    const affectedServices = Object.keys(logsByService);

    // Determine origin service (first service to log an error)
    let originService = this.findOriginService(relatedLogs);

    // If still unknown, extract from error log itself
    if (originService === 'UNKNOWN' || originService === 'USER-SERVICE') {
      const fromErrorLog = this.extractServiceFromMessage(errorLog.message) ||
                           this.normalizeServiceName(errorLog.service);
      if (fromErrorLog !== 'UNKNOWN') {
        originService = fromErrorLog;
      }
    }

    // Build the log chain showing error propagation
    const logChain = this.buildLogChain(relatedLogs);

    // Extract error details - include the original error log
    const errorDetails = this.extractErrorDetails(relatedLogs, errorLog);

    const result = {
      errorId: errorLog.id,
      errorTimestamp: errorLog.timestamp,
      originService: originService,
      errorMessage: errorLog.message,
      affectedServices: affectedServices.length > 0 ? affectedServices : [originService],
      serviceCount: Math.max(affectedServices.length, 1),
      logChain: logChain.length > 0 ? logChain : [{
        timestamp: errorLog.timestamp,
        service: originService,
        level: errorLog.level || 'ERROR',
        message: errorLog.message,
        isError: true
      }],
      logsByService: logsByService,
      errorDetails: errorDetails,
      timeWindow: {
        start: new Date(windowStart).toISOString(),
        end: new Date(windowEnd).toISOString(),
        durationMs: this.timeWindowMs * 2
      },
      totalRelatedLogs: relatedLogs.length
    };

    console.log('[CorrelatorAgent] Correlation complete:', {
      originService: result.originService,
      affectedServices: result.affectedServices.length,
      totalLogs: result.totalRelatedLogs
    });

    return result;
  }

  /**
   * Extract service name from error message
   */
  extractServiceFromMessage(message) {
    if (!message) return null;

    const patterns = [
      /from\s+([\w-]+)-service/i,
      /to\s+([\w-]+)-service/i,
      /in\s+([\w-]+)-service/i,
      /(api-gateway|user-service|db-service)/i,
      /\[(API-GATEWAY|USER-SERVICE|DB-SERVICE)\]/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const service = match[1].toUpperCase();
        if (service.includes('USER')) return 'USER-SERVICE';
        if (service.includes('API') || service.includes('GATEWAY')) return 'API-GATEWAY';
        if (service.includes('DB')) return 'DB-SERVICE';
        return service + '-SERVICE';
      }
    }

    return null;
  }

  /**
   * Group logs by service
   * @param {object[]} logs - Array of log entries
   * @returns {object} Logs grouped by service name
   */
  groupByService(logs) {
    const groups = {};

    for (const log of logs) {
      const service = log.service;
      if (!groups[service]) {
        groups[service] = [];
      }
      groups[service].push(log);
    }

    return groups;
  }

  /**
   * Find the origin service (first to report error)
   * @param {object[]} logs - Sorted logs
   * @returns {string} Origin service name
   */
  findOriginService(logs) {
    // Known service names for validation
    const knownServices = ['API-GATEWAY', 'USER-SERVICE', 'DB-SERVICE'];

    // Find the first ERROR or CRITICAL log with a valid service name
    for (const log of logs) {
      if (['ERROR', 'CRITICAL'].includes(log.level)) {
        const serviceName = this.normalizeServiceName(log.service);
        if (serviceName !== 'UNKNOWN') {
          return serviceName;
        }
      }
    }

    // Try to find any log with a known service name
    for (const log of logs) {
      const serviceName = this.normalizeServiceName(log.service);
      if (knownServices.includes(serviceName)) {
        return serviceName;
      }
    }

    // Try container name if service is unknown
    for (const log of logs) {
      if (log.container) {
        const fromContainer = this.extractServiceFromContainer(log.container);
        if (fromContainer !== 'UNKNOWN') {
          return fromContainer;
        }
      }
    }

    // Fallback to first log's service or default
    return logs.length > 0 ? this.normalizeServiceName(logs[0].service) : 'USER-SERVICE';
  }

  /**
   * Normalize service name to standard format
   * @param {string} name - Service name
   * @returns {string} Normalized name
   */
  normalizeServiceName(name) {
    if (!name) return 'UNKNOWN';

    const upper = name.toUpperCase().trim();

    // Map variations to standard names
    if (upper.includes('API') && upper.includes('GATEWAY')) return 'API-GATEWAY';
    if (upper.includes('USER') && upper.includes('SERVICE')) return 'USER-SERVICE';
    if (upper.includes('DB') && upper.includes('SERVICE')) return 'DB-SERVICE';

    // Direct matches
    const knownServices = ['API-GATEWAY', 'USER-SERVICE', 'DB-SERVICE'];
    if (knownServices.includes(upper)) return upper;

    return upper === 'UNKNOWN' ? 'UNKNOWN' : upper;
  }

  /**
   * Extract service name from container name
   * @param {string} containerName - Docker container name
   * @returns {string} Service name
   */
  extractServiceFromContainer(containerName) {
    if (!containerName) return 'UNKNOWN';

    const lower = containerName.toLowerCase();
    if (lower.includes('api-gateway') || lower.includes('apigateway')) return 'API-GATEWAY';
    if (lower.includes('user-service') || lower.includes('userservice')) return 'USER-SERVICE';
    if (lower.includes('db-service') || lower.includes('dbservice')) return 'DB-SERVICE';

    return 'UNKNOWN';
  }

  /**
   * Build a chain of logs showing error propagation
   * @param {object[]} logs - Related logs
   * @returns {object[]} Log chain with propagation info
   */
  buildLogChain(logs) {
    const chain = [];
    let previousService = null;

    for (const log of logs) {
      const chainEntry = {
        timestamp: log.timestamp,
        service: log.service,
        level: log.level,
        message: log.message.substring(0, 200),
        isError: ['ERROR', 'CRITICAL'].includes(log.level),
        propagatedFrom: null
      };

      // Check if error propagated from another service
      if (chainEntry.isError && previousService && previousService !== log.service) {
        chainEntry.propagatedFrom = previousService;
      }

      chain.push(chainEntry);

      if (chainEntry.isError) {
        previousService = log.service;
      }
    }

    return chain;
  }

  /**
   * Extract detailed error information
   * @param {object[]} logs - Related logs
   * @param {object} originalErrorLog - The original error log that triggered analysis
   * @returns {object} Error details
   */
  extractErrorDetails(logs, originalErrorLog = null) {
    // Start with the original error log if provided
    let errorLogs = logs.filter(log =>
      ['ERROR', 'CRITICAL'].includes(log.level) ||
      /error|failed|timeout|exception/i.test(log.message)
    );

    // Always include original error if not already in the list
    if (originalErrorLog && !errorLogs.find(l => l.id === originalErrorLog.id)) {
      errorLogs.unshift(originalErrorLog);
    }

    const details = {
      errorCount: Math.max(errorLogs.length, 1),
      errorTypes: [],
      errorMessages: [],
      affectedEndpoints: []
    };

    // Type patterns for error classification
    const typePatterns = [
      { pattern: /timeout/i, type: 'TIMEOUT' },
      { pattern: /connection.*refused/i, type: 'CONNECTION_REFUSED' },
      { pattern: /pool.*exhausted/i, type: 'POOL_EXHAUSTED' },
      { pattern: /deadlock/i, type: 'DEADLOCK' },
      { pattern: /memory.*high|memory.*leak|heap/i, type: 'MEMORY_ERROR' },
      { pattern: /null|undefined/i, type: 'NULL_POINTER' },
      { pattern: /authentication|auth|unauthorized/i, type: 'AUTH_FAILURE' },
      { pattern: /rate.*limit/i, type: 'RATE_LIMIT' },
      { pattern: /duplicate|already exists|constraint/i, type: 'DUPLICATE_ERROR' },
      { pattern: /500|502|503|504/i, type: 'HTTP_ERROR' },
      { pattern: /failed to (fetch|create|update|delete)/i, type: 'OPERATION_FAILED' }
    ];

    // Process all error logs
    const logsToProcess = errorLogs.length > 0 ? errorLogs : (originalErrorLog ? [originalErrorLog] : []);

    for (const log of logsToProcess) {
      const message = log.message || '';

      // Extract error types
      for (const { pattern, type } of typePatterns) {
        if (pattern.test(message) && !details.errorTypes.includes(type)) {
          details.errorTypes.push(type);
        }
      }

      // Extract endpoints
      const endpointMatch = message.match(/\/api\/[\w/]+/);
      if (endpointMatch && !details.affectedEndpoints.includes(endpointMatch[0])) {
        details.affectedEndpoints.push(endpointMatch[0]);
      }

      // Store error messages (avoid duplicates)
      const msgPreview = message.substring(0, 300);
      if (msgPreview && !details.errorMessages.includes(msgPreview)) {
        details.errorMessages.push(msgPreview);
      }
    }

    // Ensure we have at least one error type
    if (details.errorTypes.length === 0 && originalErrorLog) {
      details.errorTypes.push('UNKNOWN_ERROR');
    }

    // Ensure we have at least one error message
    if (details.errorMessages.length === 0 && originalErrorLog) {
      details.errorMessages.push(originalErrorLog.message || 'Error detected');
    }

    return details;
  }

  /**
   * Calculate error propagation path
   * @param {object} correlatedData - Data from findRelatedLogs
   * @returns {string[]} Propagation path
   */
  getErrorPropagation(correlatedData) {
    const propagation = [];
    const seen = new Set();

    for (const entry of correlatedData.logChain) {
      if (entry.isError && !seen.has(entry.service)) {
        propagation.push(entry.service);
        seen.add(entry.service);
      }
    }

    return propagation;
  }

  /**
   * Get a summary of the correlation
   * @param {object} correlatedData - Correlated log data
   * @returns {string} Human-readable summary
   */
  getSummary(correlatedData) {
    const { originService, affectedServices, errorDetails, totalRelatedLogs } = correlatedData;

    return [
      `Error originated in ${originService}`,
      `Affected ${affectedServices.length} service(s): ${affectedServices.join(', ')}`,
      `Error types: ${errorDetails.errorTypes.join(', ') || 'Unknown'}`,
      `Total related logs: ${totalRelatedLogs}`,
      `Endpoints affected: ${errorDetails.affectedEndpoints.join(', ') || 'None identified'}`
    ].join('\n');
  }
}

module.exports = CorrelatorAgent;
