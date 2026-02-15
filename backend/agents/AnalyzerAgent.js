/**
 * Analyzer Agent
 * Uses LangChain + Gemini for AI-powered root cause analysis
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');

class AnalyzerAgent {
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('[AnalyzerAgent] No API key provided - AI analysis will be disabled');
      this.model = null;
      return;
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: 'gemini-1.5-flash',  // Use Flash for faster responses
      temperature: 0.2,
      maxOutputTokens: 1024
    });

    this.timeout = 15000; // 15 second timeout

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a senior DevOps engineer and expert at analyzing microservice failures.
Analyze these correlated logs from multiple services:

{logs}

Error Summary:
- Origin Service: {originService}
- Affected Services: {affectedServices}
- Error Types Detected: {errorTypes}
- Error Messages: {errorMessages}

Determine:
1. ROOT CAUSE: What is the underlying problem?
2. ORIGIN SERVICE: Which service caused the initial failure?
3. ERROR TYPE: Categorize (database_timeout | network_error | null_pointer | memory_leak | auth_failure | rate_limit | connection_pool_exhaustion | other)
4. SEVERITY: Rate as LOW | MEDIUM | HIGH | CRITICAL
5. PROPAGATION PATH: How did the error cascade through services?
6. AFFECTED ENDPOINTS: Which API endpoints failed?

Respond ONLY with valid JSON (no markdown code blocks, no backticks):
{{
  "rootCause": "concise description of the root cause",
  "originService": "exact service name from logs",
  "errorType": "category from the list above",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "propagationPath": ["Step 1: Description", "Step 2: Description", "Step 3: Description"],
  "affectedServices": ["service1", "service2"],
  "affectedEndpoints": ["/api/endpoint1", "/api/endpoint2"],
  "technicalDetails": "deeper technical explanation for engineers",
  "immediateActions": ["action 1", "action 2"],
  "longTermFixes": ["fix 1", "fix 2"]
}}
`);

    console.log('[AnalyzerAgent] Initialized with Gemini model');
  }

  /**
   * Analyze error using AI
   * @param {object} correlatedData - Data from CorrelatorAgent
   * @returns {Promise<object>} Analysis result
   */
  async analyzeError(correlatedData) {
    console.log('[AnalyzerAgent] Starting error analysis');

    // If no model, return a basic analysis
    if (!this.model) {
      console.log('[AnalyzerAgent] No AI model - returning basic analysis');
      return this.basicAnalysis(correlatedData);
    }

    try {
      // Format logs for the prompt
      const logsText = this.formatLogsForPrompt(correlatedData.logChain);

      // Create the prompt
      const prompt = await this.promptTemplate.format({
        logs: logsText,
        originService: correlatedData.originService,
        affectedServices: correlatedData.affectedServices.join(', '),
        errorTypes: correlatedData.errorDetails.errorTypes.join(', ') || 'Unknown',
        errorMessages: correlatedData.errorDetails.errorMessages.slice(0, 5).join('\n')
      });

      console.log('[AnalyzerAgent] Sending request to Gemini (timeout: 15s)');

      // Invoke the model with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), this.timeout)
      );
      const response = await Promise.race([
        this.model.invoke(prompt),
        timeoutPromise
      ]);

      // Parse the response
      const analysis = this.parseResponse(response.content);

      console.log('[AnalyzerAgent] Analysis complete:', {
        rootCause: analysis.rootCause?.substring(0, 50),
        severity: analysis.severity
      });

      return {
        ...analysis,
        correlationId: correlatedData.errorId,
        timestamp: new Date().toISOString(),
        confidence: 'high'
      };
    } catch (error) {
      console.error('[AnalyzerAgent] Analysis failed:', error.message);

      // Fall back to basic analysis
      return {
        ...this.basicAnalysis(correlatedData),
        error: error.message,
        confidence: 'low'
      };
    }
  }

  /**
   * Format log chain for prompt
   * @param {object[]} logChain - Log chain from correlator
   * @returns {string} Formatted logs
   */
  formatLogsForPrompt(logChain) {
    return logChain
      .map(log => `[${log.timestamp}] [${log.service}] ${log.level}: ${log.message}`)
      .join('\n');
  }

  /**
   * Parse AI response to JSON
   * @param {string} content - AI response content
   * @returns {object} Parsed analysis
   */
  parseResponse(content) {
    try {
      // Remove any markdown code blocks if present
      let jsonStr = content;

      // Remove ```json and ``` markers
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Find JSON object in response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Normalize origin service - never return "Unknown"
        if (!parsed.originService || parsed.originService.toLowerCase() === 'unknown') {
          // Try to infer from affected services
          const knownServices = ['API-GATEWAY', 'USER-SERVICE', 'DB-SERVICE'];
          const found = parsed.affectedServices?.find(s =>
            knownServices.some(k => s.toUpperCase().includes(k.replace('-', '')))
          );
          parsed.originService = found || 'USER-SERVICE';
        }

        return parsed;
      }

      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('[AnalyzerAgent] Failed to parse response:', error.message);
      console.error('[AnalyzerAgent] Raw content:', content.substring(0, 500));

      // Return a structured error response
      return {
        rootCause: 'Unable to parse AI response',
        originService: 'Unknown',
        errorType: 'other',
        severity: 'MEDIUM',
        propagationPath: [],
        affectedServices: [],
        affectedEndpoints: [],
        technicalDetails: content.substring(0, 500),
        parseError: error.message
      };
    }
  }

  /**
   * Basic analysis without AI
   * @param {object} correlatedData - Correlated log data
   * @returns {object} Basic analysis
   */
  basicAnalysis(correlatedData) {
    let { originService, errorDetails, affectedServices, errorMessage } = correlatedData;

    // Ensure we have a valid service name, not "UNKNOWN"
    if (!originService || originService === 'UNKNOWN') {
      // Try to find a known service from affected services
      const knownServices = ['API-GATEWAY', 'USER-SERVICE', 'DB-SERVICE'];
      originService = affectedServices.find(s => knownServices.includes(s.toUpperCase())) || 'USER-SERVICE';
    }

    // Determine error type based on patterns
    let errorType = 'other';
    const errorTypes = errorDetails.errorTypes || [];

    if (errorTypes.includes('TIMEOUT')) errorType = 'database_timeout';
    else if (errorTypes.includes('CONNECTION_REFUSED')) errorType = 'network_error';
    else if (errorTypes.includes('POOL_EXHAUSTED')) errorType = 'connection_pool_exhaustion';
    else if (errorTypes.includes('MEMORY_ERROR')) errorType = 'memory_leak';
    else if (errorTypes.includes('NULL_POINTER')) errorType = 'null_pointer';
    else if (errorTypes.includes('DEADLOCK')) errorType = 'database_timeout';
    else if (errorTypes.includes('DUPLICATE_ERROR')) errorType = 'validation_error';
    else if (errorTypes.includes('OPERATION_FAILED')) errorType = 'network_error';
    else if (errorTypes.includes('HTTP_ERROR')) errorType = 'network_error';

    // Generate detailed root cause from error messages
    let rootCause = 'Error detected in service';
    const messages = errorDetails.errorMessages || [];

    if (messages.length > 0) {
      // Parse the most informative error message
      const primaryMessage = messages[0];

      if (/timeout/i.test(primaryMessage)) {
        rootCause = `Database connection timeout - the database is not responding within the expected time limit`;
      } else if (/deadlock/i.test(primaryMessage)) {
        rootCause = `Database deadlock detected - multiple transactions are waiting for each other's locks`;
      } else if (/memory.*high|memory.*leak/i.test(primaryMessage)) {
        rootCause = `Memory usage critically high - potential memory leak causing heap exhaustion`;
      } else if (/duplicate|already exists/i.test(primaryMessage)) {
        rootCause = `Duplicate entry constraint violation - attempting to insert data that already exists`;
      } else if (/connection.*refused/i.test(primaryMessage)) {
        rootCause = `Connection refused - the target service is not accepting connections`;
      } else if (/pool.*exhausted/i.test(primaryMessage)) {
        rootCause = `Connection pool exhausted - all available database connections are in use`;
      } else if (/failed to fetch/i.test(primaryMessage)) {
        rootCause = `Service communication failure - unable to retrieve data from downstream service`;
      } else if (/failed to create/i.test(primaryMessage)) {
        rootCause = `Data creation failed - unable to create new record in the database`;
      } else if (/504|gateway.*timeout/i.test(primaryMessage)) {
        rootCause = `Gateway timeout - upstream service took too long to respond`;
      } else if (/500/i.test(primaryMessage)) {
        rootCause = `Internal server error - unexpected error occurred during request processing`;
      } else {
        // Use the first error message as root cause
        rootCause = primaryMessage.split('|')[0].trim();
      }
    }

    // Determine severity
    let severity = 'MEDIUM';
    if (affectedServices.length >= 3) severity = 'CRITICAL';
    else if (affectedServices.length === 2) severity = 'HIGH';
    else if (errorDetails.errorCount > 5) severity = 'HIGH';
    else if (errorType === 'memory_leak') severity = 'HIGH';
    else if (errorType === 'database_timeout' && errorDetails.errorCount > 2) severity = 'HIGH';

    // Generate specific technical details
    const technicalDetails = this.generateTechnicalDetails(errorType, originService, errorDetails, messages);

    // Generate specific immediate actions
    const immediateActions = this.generateImmediateActions(errorType, originService);

    // Generate specific long-term fixes
    const longTermFixes = this.generateLongTermFixes(errorType);

    return {
      rootCause: rootCause,
      originService: originService,
      errorType: errorType,
      severity: severity,
      propagationPath: affectedServices.map((s, i) =>
        `Step ${i + 1}: Error ${i === 0 ? 'originated in' : 'propagated to'} ${s}`
      ),
      affectedServices: affectedServices,
      affectedEndpoints: errorDetails.affectedEndpoints,
      technicalDetails: technicalDetails,
      immediateActions: immediateActions,
      longTermFixes: longTermFixes,
      confidence: 'medium'
    };
  }

  /**
   * Generate technical details based on error type
   */
  generateTechnicalDetails(errorType, originService, errorDetails, messages) {
    const details = {
      database_timeout: `Database operations in ${originService} are exceeding timeout thresholds. This typically indicates slow queries, database overload, or network latency issues. ${errorDetails.errorCount} timeout(s) detected.`,
      memory_leak: `Memory usage in ${originService} has reached critical levels. The heap is being exhausted, likely due to unbounded data structures or missing cleanup routines.`,
      connection_pool_exhaustion: `The connection pool in ${originService} has no available connections. All ${errorDetails.errorCount} connections are in use, causing new requests to wait or fail.`,
      network_error: `Network communication failures detected between services. ${originService} is unable to reach downstream dependencies.`,
      null_pointer: `Null or undefined value access in ${originService}. A variable was used before being properly initialized or validated.`,
      validation_error: `Data validation failure in ${originService}. Duplicate or invalid data was submitted that violates database constraints.`,
      other: `Error detected in ${originService}. ${errorDetails.errorCount} error(s) across ${errorDetails.affectedEndpoints.length} endpoint(s).`
    };

    return details[errorType] || details.other;
  }

  /**
   * Generate immediate actions based on error type
   */
  generateImmediateActions(errorType, originService) {
    const actions = {
      database_timeout: [
        `Check ${originService} database connection status`,
        'Review slow query logs for long-running queries',
        'Verify database server CPU and memory usage',
        'Check network latency between service and database'
      ],
      memory_leak: [
        `Restart ${originService} container to free memory`,
        'Check heap dump for large object allocations',
        'Review recent code changes for unbounded arrays/caches',
        'Monitor memory growth rate after restart'
      ],
      connection_pool_exhaustion: [
        'Check for connection leaks (unreleased connections)',
        'Review active queries for long-running transactions',
        'Temporarily increase pool size as a quick fix',
        'Identify and kill idle connections'
      ],
      network_error: [
        'Verify all dependent services are running',
        'Check Docker network configuration',
        'Test service-to-service connectivity',
        'Review firewall and security group rules'
      ],
      validation_error: [
        'Check input data for duplicates',
        'Review database unique constraints',
        'Add input validation before database operations',
        'Implement idempotency checks'
      ]
    };

    return actions[errorType] || [
      `Check ${originService} logs for details`,
      'Verify service health endpoints',
      'Review recent deployments or changes',
      'Check dependent service status'
    ];
  }

  /**
   * Generate long-term fixes based on error type
   */
  generateLongTermFixes(errorType) {
    const fixes = {
      database_timeout: [
        'Implement query timeouts with retry logic',
        'Add database connection pooling if not present',
        'Optimize slow queries with proper indexing',
        'Implement caching for frequently accessed data'
      ],
      memory_leak: [
        'Implement bounded data structures with size limits',
        'Add periodic cleanup routines for caches',
        'Use WeakMap/WeakSet for object references',
        'Implement memory monitoring and alerts'
      ],
      connection_pool_exhaustion: [
        'Implement proper connection release in finally blocks',
        'Add connection timeout and eviction policies',
        'Scale database resources or add read replicas',
        'Implement connection health checks'
      ],
      network_error: [
        'Implement circuit breaker pattern',
        'Add retry logic with exponential backoff',
        'Implement service mesh for better resilience',
        'Add health checks and automatic recovery'
      ],
      validation_error: [
        'Implement upsert operations instead of insert',
        'Add duplicate detection before database writes',
        'Implement optimistic locking for concurrent updates',
        'Add comprehensive input validation'
      ]
    };

    return fixes[errorType] || [
      'Implement comprehensive error handling',
      'Add structured logging for debugging',
      'Implement monitoring and alerting',
      'Add automated health checks'
    ];
  }
}

module.exports = AnalyzerAgent;
