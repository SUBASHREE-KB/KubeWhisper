/**
 * Log Database Manager
 * Simple in-memory storage for logs (SQLite is optional)
 * If better-sqlite3 is not installed, it works without persistence
 */

const path = require('path');
const crypto = require('crypto');

class LogDatabase {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'loglens.db');
    this.retentionDays = parseInt(process.env.LOG_RETENTION_DAYS) || 7;
    this.isReady = false;

    // In-memory storage (always available)
    this.logs = [];
    this.errors = [];
    this.hashSet = new Set();
    this.errorHashSet = new Set();

    // Try to initialize SQLite (optional)
    this.tryInitializeSQLite();
  }

  /**
   * Try to initialize SQLite database (non-blocking, optional)
   */
  tryInitializeSQLite() {
    try {
      // Check if better-sqlite3 is installed
      const Database = require('better-sqlite3');

      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');

      // Create tables
      this.createTables();

      this.isReady = true;
      console.log(`[LogDatabase] SQLite initialized at ${this.dbPath}`);
    } catch (error) {
      // SQLite not available - that's OK, use in-memory only
      console.log('[LogDatabase] SQLite not available, using in-memory storage only');
      console.log('[LogDatabase] To enable persistence, install: npm install better-sqlite3');
      this.isReady = true; // Still ready, just without persistence
    }
  }

  /**
   * Create database tables (SQLite only)
   */
  createTables() {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        timestamp TEXT NOT NULL,
        service TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        duplicate_count INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

      CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_hash TEXT UNIQUE NOT NULL,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        service TEXT NOT NULL,
        message TEXT NOT NULL,
        occurrence_count INTEGER DEFAULT 1,
        status TEXT DEFAULT 'new'
      );

      CREATE INDEX IF NOT EXISTS idx_errors_service ON errors(service);
    `);
  }

  /**
   * Generate hash for log deduplication
   */
  generateLogHash(log) {
    const normalizedMessage = (log.message || '')
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8,}/gi, 'H')
      .substring(0, 200);

    const hashInput = `${log.service}|${log.level}|${normalizedMessage}`;
    return crypto.createHash('md5').update(hashInput).digest('hex');
  }

  /**
   * Insert a log entry
   * @returns {boolean} true if new log, false if duplicate
   */
  insertLog(log) {
    if (!log || !log.service) return false;

    const hash = this.generateLogHash(log);

    // Check in-memory hash set first (fast)
    if (this.hashSet.has(hash)) {
      return false; // Duplicate
    }

    // Add to in-memory
    this.hashSet.add(hash);
    this.logs.push({
      id: this.logs.length + 1,
      hash,
      timestamp: log.timestamp,
      service: log.service,
      level: log.level,
      message: log.message
    });

    // Keep in-memory size manageable
    if (this.logs.length > 5000) {
      const removed = this.logs.shift();
      this.hashSet.delete(removed.hash);
    }

    // Try to persist to SQLite (non-blocking)
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO logs (hash, timestamp, service, level, message)
          VALUES (?, ?, ?, ?, ?)
        `).run(hash, log.timestamp, log.service, log.level, log.message);
      } catch (e) {
        // Ignore SQLite errors
      }
    }

    return true;
  }

  /**
   * Track an error for correlation
   */
  trackError(log) {
    if (!log || !log.service) return;

    const hash = this.generateLogHash(log);

    if (this.errorHashSet.has(hash)) {
      // Update occurrence count
      const existing = this.errors.find(e => e.hash === hash);
      if (existing) {
        existing.occurrence_count++;
        existing.last_seen = log.timestamp;
      }
      return;
    }

    this.errorHashSet.add(hash);
    this.errors.push({
      id: this.errors.length + 1,
      hash,
      first_seen: log.timestamp,
      last_seen: log.timestamp,
      service: log.service,
      message: log.message,
      occurrence_count: 1,
      status: 'new'
    });

    // Keep errors manageable
    if (this.errors.length > 500) {
      const removed = this.errors.shift();
      this.errorHashSet.delete(removed.hash);
    }
  }

  /**
   * Search logs
   */
  searchLogs(options = {}) {
    const { query, service, level, limit = 100 } = options;

    let results = [...this.logs];

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(l =>
        l.message?.toLowerCase().includes(q) ||
        l.service?.toLowerCase().includes(q)
      );
    }

    if (service) {
      results = results.filter(l => l.service === service);
    }

    if (level) {
      results = results.filter(l => l.level === level);
    }

    return results.slice(-limit).reverse();
  }

  /**
   * Find similar errors
   */
  findSimilarErrors(message, service, limit = 10) {
    let results = [...this.errors];

    if (service) {
      results = results.filter(e => e.service === service);
    }

    return results
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, limit);
  }

  /**
   * Get error trends by hour
   */
  getErrorTrends(hours = 24) {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    const byHour = [];
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = now - (i + 1) * hourMs;
      const hourEnd = now - i * hourMs;

      const count = this.errors.filter(e => {
        const ts = new Date(e.last_seen).getTime();
        return ts >= hourStart && ts < hourEnd;
      }).length;

      byHour.push({
        hour: new Date(hourEnd).toISOString(),
        count
      });
    }

    // Service breakdown
    const byService = {};
    this.errors.forEach(e => {
      if (!byService[e.service]) {
        byService[e.service] = { count: 0, trend: 'stable' };
      }
      byService[e.service].count++;
    });

    return { byHour, byService };
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      totalLogs: this.logs.length,
      errorCount: this.errors.length,
      uniquePatterns: this.hashSet.size,
      dbPath: this.db ? this.dbPath : 'in-memory only',
      ready: this.isReady,
      retentionDays: this.retentionDays
    };
  }

  /**
   * Manual cleanup
   */
  cleanup() {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    this.logs = this.logs.filter(l => new Date(l.timestamp).getTime() > cutoff);
    this.hashSet = new Set(this.logs.map(l => l.hash));

    this.errors = this.errors.filter(e => new Date(e.last_seen).getTime() > cutoff);
    this.errorHashSet = new Set(this.errors.map(e => e.hash));

    console.log(`[LogDatabase] Cleanup complete: ${this.logs.length} logs, ${this.errors.length} errors`);
  }
}

// Singleton instance
const logDatabase = new LogDatabase();

module.exports = logDatabase;
