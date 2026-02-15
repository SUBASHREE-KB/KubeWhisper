/**
 * Code Fix Agent
 * Reads actual source code and generates targeted fixes
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const fs = require('fs').promises;
const path = require('path');

class CodeFixAgent {
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('[CodeFixAgent] No API key provided - AI code fixing will be disabled');
      this.model = null;
      return;
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: 'gemini-1.5-flash',
      temperature: 0.1, // Low temperature for precise code generation
      maxOutputTokens: 4096
    });

    this.timeout = 45000; // 45 second timeout for code analysis

    // Prompt for analyzing code and generating fixes
    this.analyzePrompt = PromptTemplate.fromTemplate(`
You are an expert software engineer. Analyze this source code and the error that occurred.

SOURCE FILE: {filePath}
\`\`\`javascript
{sourceCode}
\`\`\`

ERROR INFORMATION:
- Error Message: {errorMessage}
- Error Type: {errorType}
- Root Cause: {rootCause}
- Origin Service: {originService}

TASK: Identify the EXACT code that causes this error and provide a targeted fix.

Rules:
1. Find the specific lines of code that cause the error
2. Provide the EXACT old code that needs to be replaced (copy it exactly as it appears)
3. Provide the new code that fixes the issue
4. The fix should be minimal - only change what's necessary
5. Do NOT add new utility functions unless absolutely required
6. If the error is caused by simulated/random failures (Math.random), remove or disable that code
7. If the error is a timeout, add proper timeout handling at the exact location
8. If the error is null/undefined, add proper null checks at the exact location

Respond ONLY with valid JSON (no markdown, no backticks):
{{
  "found": true,
  "problemLocation": {{
    "startLine": <line number where problem starts>,
    "endLine": <line number where problem ends>,
    "description": "brief description of what this code does wrong"
  }},
  "oldCode": "<exact code to replace - copy exactly from source>",
  "newCode": "<fixed code to replace it with>",
  "explanation": "brief explanation of what the fix does",
  "confidence": "high|medium|low"
}}

If you cannot identify the exact problematic code, respond with:
{{
  "found": false,
  "reason": "explanation of why the fix cannot be determined",
  "suggestion": "manual steps the developer should take"
}}
`);

    console.log('[CodeFixAgent] Initialized with Gemini model');
  }

  /**
   * Read source file from the services directory
   * @param {string} serviceName - Name of the service (e.g., 'api-gateway', 'user-service')
   * @param {string} fileName - Name of the file (e.g., 'index.js')
   * @returns {Promise<{content: string, filePath: string}>}
   */
  async readSourceFile(serviceName, fileName = 'index.js') {
    // Normalize service name
    const normalizedService = serviceName.toLowerCase().replace(/[_\s]/g, '-');

    // Build possible paths
    const basePaths = [
      path.join(__dirname, '..', '..', 'services'),
      path.join(process.cwd(), 'services'),
      'C:\\Users\\Suba Shree K B\\Kubewhisper\\services'
    ];

    for (const basePath of basePaths) {
      const filePath = path.join(basePath, normalizedService, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`[CodeFixAgent] Read source file: ${filePath}`);
        return { content, filePath };
      } catch (err) {
        // Try next path
      }
    }

    // Try database.js for user-service
    if (normalizedService === 'user-service' && fileName === 'index.js') {
      for (const basePath of basePaths) {
        const filePath = path.join(basePath, normalizedService, 'database.js');
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          console.log(`[CodeFixAgent] Read source file: ${filePath}`);
          return { content, filePath };
        } catch (err) {
          // Try next path
        }
      }
    }

    throw new Error(`Could not find source file for service: ${serviceName}`);
  }

  /**
   * Determine which file likely contains the error
   * @param {object} analysis - Error analysis from AnalyzerAgent
   * @returns {string[]} - List of files to check
   */
  getFilesToCheck(analysis) {
    const files = [];

    // Check database.js FIRST for database-related errors (most timeout errors are here)
    if (analysis.errorType === 'database_timeout' ||
        analysis.errorType === 'connection_pool_exhaustion' ||
        analysis.rootCause?.toLowerCase().includes('database') ||
        analysis.rootCause?.toLowerCase().includes('timeout') ||
        analysis.rootCause?.toLowerCase().includes('query') ||
        analysis.rootCause?.toLowerCase().includes('connection')) {
      files.push('database.js');
    }

    // Always check index.js
    files.push('index.js');

    return files;
  }

  /**
   * Generate a targeted fix for an error
   * @param {object} analysis - Error analysis from AnalyzerAgent
   * @returns {Promise<object>} - Fix details
   */
  async generateFix(analysis) {
    console.log('[CodeFixAgent] Generating fix for:', analysis.originService);

    if (!this.model) {
      return this.generateBasicFix(analysis);
    }

    const serviceName = analysis.originService || 'user-service';
    const filesToCheck = this.getFilesToCheck(analysis);

    let bestFix = null;

    for (const fileName of filesToCheck) {
      try {
        // Read the actual source code
        const { content, filePath } = await this.readSourceFile(serviceName, fileName);

        // Generate fix using AI
        const fix = await this.analyzeAndFix(content, filePath, analysis);

        if (fix.found && (!bestFix || fix.confidence === 'high')) {
          bestFix = { ...fix, filePath, fileName };
          if (fix.confidence === 'high') break;
        }
      } catch (err) {
        console.log(`[CodeFixAgent] Could not check ${fileName}:`, err.message);
      }
    }

    if (bestFix) {
      return {
        success: true,
        filePath: bestFix.filePath,
        fileName: bestFix.fileName,
        oldCode: bestFix.oldCode,
        newCode: bestFix.newCode,
        explanation: bestFix.explanation,
        problemLocation: bestFix.problemLocation,
        confidence: bestFix.confidence
      };
    }

    // Fall back to basic fix if AI couldn't find specific code
    return this.generateBasicFix(analysis);
  }

  /**
   * Use AI to analyze code and generate fix
   */
  async analyzeAndFix(sourceCode, filePath, analysis) {
    try {
      const prompt = await this.analyzePrompt.format({
        filePath: filePath,
        sourceCode: sourceCode,
        errorMessage: analysis.rootCause || 'Unknown error',
        errorType: analysis.errorType || 'unknown',
        rootCause: analysis.rootCause || 'Unknown',
        originService: analysis.originService || 'Unknown'
      });

      console.log('[CodeFixAgent] Sending code to AI for analysis...');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), this.timeout)
      );

      const response = await Promise.race([
        this.model.invoke(prompt),
        timeoutPromise
      ]);

      return this.parseResponse(response.content, sourceCode);
    } catch (error) {
      console.error('[CodeFixAgent] AI analysis failed:', error.message);
      return { found: false, reason: error.message };
    }
  }

  /**
   * Parse AI response
   */
  parseResponse(content, sourceCode) {
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate the fix - make sure oldCode exists in source
        if (parsed.found && parsed.oldCode) {
          // Normalize whitespace for comparison
          const normalizedOld = parsed.oldCode.trim();
          const normalizedSource = sourceCode;

          if (!normalizedSource.includes(normalizedOld)) {
            console.log('[CodeFixAgent] Warning: oldCode not found exactly in source, attempting fuzzy match');

            // Try to find similar code
            const lines = normalizedOld.split('\n');
            const firstLine = lines[0].trim();

            if (normalizedSource.includes(firstLine)) {
              console.log('[CodeFixAgent] Found partial match, proceeding with fix');
            } else {
              parsed.confidence = 'low';
              parsed.warning = 'Code match is approximate';
            }
          }
        }

        return parsed;
      }

      return { found: false, reason: 'Could not parse AI response' };
    } catch (error) {
      console.error('[CodeFixAgent] Parse error:', error.message);
      return { found: false, reason: 'Parse error: ' + error.message };
    }
  }

  /**
   * Generate basic fix when AI is unavailable
   */
  async generateBasicFix(analysis) {
    console.log('[CodeFixAgent] Generating basic fix without AI');

    const serviceName = (analysis.originService || 'user-service').toLowerCase().replace(/[_\s]/g, '-');
    const errorType = analysis.errorType || 'unknown';

    // Get files to check based on error type
    const filesToCheck = this.getFilesToCheck(analysis);

    // Try each file
    for (const fileName of filesToCheck) {
      try {
        const result = await this.readSourceFile(serviceName, fileName);
        const sourceContent = result.content;
        const filePath = result.filePath;

        console.log(`[CodeFixAgent] Checking ${fileName} for patterns...`);

        // Pattern-based fixes
        const fixes = this.findPatternBasedFix(sourceContent, errorType, analysis);

        if (fixes) {
          console.log(`[CodeFixAgent] Found fix in ${fileName}`);
          return {
            success: true,
            filePath: filePath,
            fileName: fileName,
            oldCode: fixes.oldCode,
            newCode: fixes.newCode,
            explanation: fixes.explanation,
            confidence: 'medium',
            isPatternBased: true
          };
        }
      } catch (err) {
        console.log(`[CodeFixAgent] Could not read ${fileName}: ${err.message}`);
      }
    }

    return {
      success: false,
      error: 'Could not determine automatic fix',
      suggestion: analysis.immediateActions?.join('; ') || 'Please check the service logs'
    };
  }

  /**
   * Find fixes based on common error patterns
   */
  findPatternBasedFix(sourceCode, errorType, analysis) {
    const lines = sourceCode.split('\n');

    // Pattern 1: Random error simulation with SIMULATE_ERRORS flag
    const simulateErrorPattern = /if\s*\(\s*SIMULATE_ERRORS\s*&&\s*Math\.random\(\)\s*<\s*[\d.]+\s*\)/;
    // Pattern 1b: Random error simulation without flag (legacy)
    const randomErrorPattern = /if\s*\(\s*Math\.random\(\)\s*<\s*[\d.]+\s*\)\s*\{/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for SIMULATE_ERRORS pattern first
      if (simulateErrorPattern.test(line)) {
        // Find the closing brace
        let braceCount = 0;
        let endLine = i;
        let started = false;

        for (let j = i; j < lines.length; j++) {
          const openBraces = (lines[j].match(/\{/g) || []).length;
          const closeBraces = (lines[j].match(/\}/g) || []).length;

          if (openBraces > 0) started = true;
          braceCount += openBraces;
          braceCount -= closeBraces;

          if (started && braceCount === 0) {
            endLine = j;
            break;
          }
        }

        const oldCode = lines.slice(i, endLine + 1).join('\n');

        // Comment out the entire block
        const commentedCode = lines.slice(i, endLine + 1)
          .map(l => '    // ' + l.trim())
          .join('\n');

        const newCode = `    // DISABLED: Simulated error removed to fix ${errorType}\n${commentedCode}`;

        return {
          oldCode,
          newCode,
          explanation: `Disabled simulated error (SIMULATE_ERRORS block) that was causing ${errorType} failures. The random failure simulation has been commented out.`
        };
      }

      // Check for legacy pattern without SIMULATE_ERRORS
      if (randomErrorPattern.test(line) && !line.includes('SIMULATE_ERRORS')) {
        let braceCount = 0;
        let endLine = i;

        for (let j = i; j < lines.length; j++) {
          braceCount += (lines[j].match(/\{/g) || []).length;
          braceCount -= (lines[j].match(/\}/g) || []).length;
          if (braceCount === 0) {
            endLine = j;
            break;
          }
        }

        const oldCode = lines.slice(i, endLine + 1).join('\n');
        const commentedCode = lines.slice(i, endLine + 1)
          .map(l => '    // ' + l.trim())
          .join('\n');

        const newCode = `    // DISABLED: Simulated error removed to fix ${errorType}\n${commentedCode}`;

        return {
          oldCode,
          newCode,
          explanation: `Disabled simulated random error that was causing ${errorType} failures`
        };
      }
    }

    // Pattern 2: Database timeout simulation in acquireConnection
    if (errorType === 'database_timeout') {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Database connection timeout') ||
            lines[i].includes('setTimeout') && lines.slice(Math.max(0, i-3), i+1).join('').includes('timeout')) {

          // Look back to find the start of the if block
          let startLine = i;
          for (let j = i; j >= Math.max(0, i - 10); j--) {
            if (lines[j].includes('if') && (lines[j].includes('SIMULATE_ERRORS') || lines[j].includes('Math.random'))) {
              startLine = j;
              break;
            }
          }

          // Find the end of this block
          let braceCount = 0;
          let endLine = i;
          let started = false;

          for (let j = startLine; j < lines.length; j++) {
            const openBraces = (lines[j].match(/\{/g) || []).length;
            const closeBraces = (lines[j].match(/\}/g) || []).length;

            if (openBraces > 0) started = true;
            braceCount += openBraces;
            braceCount -= closeBraces;

            if (started && braceCount === 0) {
              endLine = j;
              break;
            }
          }

          if (startLine < i) {
            const oldCode = lines.slice(startLine, endLine + 1).join('\n');
            const commentedCode = lines.slice(startLine, endLine + 1)
              .map(l => '    // ' + l.trim())
              .join('\n');

            const newCode = `    // DISABLED: Database timeout simulation removed\n${commentedCode}`;

            return {
              oldCode,
              newCode,
              explanation: `Disabled database timeout simulation that was causing connection failures`
            };
          }
        }
      }
    }

    // Pattern 3: Connection pool exhaustion simulation
    if (errorType === 'connection_pool_exhaustion') {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('pool exhausted') || lines[i].includes('Connection pool exhausted')) {
          // Look back to find the start of the if block
          let startLine = i;
          for (let j = i; j >= Math.max(0, i - 10); j--) {
            if (lines[j].includes('if') && (lines[j].includes('SIMULATE_ERRORS') || lines[j].includes('Math.random'))) {
              startLine = j;
              break;
            }
          }

          let braceCount = 0;
          let endLine = i;
          let started = false;

          for (let j = startLine; j < lines.length; j++) {
            const openBraces = (lines[j].match(/\{/g) || []).length;
            const closeBraces = (lines[j].match(/\}/g) || []).length;

            if (openBraces > 0) started = true;
            braceCount += openBraces;
            braceCount -= closeBraces;

            if (started && braceCount === 0) {
              endLine = j;
              break;
            }
          }

          if (startLine < i) {
            const oldCode = lines.slice(startLine, endLine + 1).join('\n');
            const commentedCode = lines.slice(startLine, endLine + 1)
              .map(l => '    // ' + l.trim())
              .join('\n');

            const newCode = `    // DISABLED: Connection pool exhaustion simulation removed\n${commentedCode}`;

            return {
              oldCode,
              newCode,
              explanation: `Disabled connection pool exhaustion simulation`
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Apply a fix to a file
   * @param {string} filePath - Path to the file
   * @param {string} oldCode - Code to replace
   * @param {string} newCode - New code
   * @returns {Promise<{success: boolean, backup: string}>}
   */
  async applyFix(filePath, oldCode, newCode) {
    try {
      // Read current content
      const content = await fs.readFile(filePath, 'utf-8');

      // Create backup
      const backupPath = filePath + '.backup.' + Date.now();
      await fs.writeFile(backupPath, content, 'utf-8');
      console.log(`[CodeFixAgent] Created backup: ${backupPath}`);

      // Apply fix
      if (!content.includes(oldCode)) {
        // Try with normalized whitespace
        const normalizedContent = content.replace(/\r\n/g, '\n');
        const normalizedOld = oldCode.replace(/\r\n/g, '\n');

        if (normalizedContent.includes(normalizedOld)) {
          const newContent = normalizedContent.replace(normalizedOld, newCode);
          await fs.writeFile(filePath, newContent, 'utf-8');
          console.log(`[CodeFixAgent] Applied fix to: ${filePath}`);
          return { success: true, backup: backupPath };
        }

        throw new Error('Could not find exact code to replace');
      }

      const newContent = content.replace(oldCode, newCode);
      await fs.writeFile(filePath, newContent, 'utf-8');
      console.log(`[CodeFixAgent] Applied fix to: ${filePath}`);

      return { success: true, backup: backupPath };
    } catch (error) {
      console.error(`[CodeFixAgent] Failed to apply fix: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CodeFixAgent;
