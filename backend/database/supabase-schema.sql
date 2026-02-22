-- LogLens Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- ============================================
-- LOGS TABLE
-- Stores all incoming log entries with deduplication
-- ============================================
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  duplicate_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_hash ON logs(hash);

-- ============================================
-- ERRORS TABLE
-- Tracks unique error patterns across services
-- ============================================
CREATE TABLE IF NOT EXISTS errors (
  id BIGSERIAL PRIMARY KEY,
  error_hash TEXT UNIQUE NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  occurrence_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_errors_service ON errors(service);
CREATE INDEX IF NOT EXISTS idx_errors_status ON errors(status);
CREATE INDEX IF NOT EXISTS idx_errors_last_seen ON errors(last_seen DESC);

-- ============================================
-- METRICS HISTORY TABLE
-- Stores historical metrics for trend analysis
-- ============================================
CREATE TABLE IF NOT EXISTS metrics_history (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service TEXT NOT NULL,
  cpu_percent DECIMAL(5,2),
  memory_percent DECIMAL(5,2),
  memory_usage_mb DECIMAL(10,2),
  memory_limit_mb DECIMAL(10,2),
  network_rx_bytes BIGINT,
  network_tx_bytes BIGINT,
  container_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_service ON metrics_history(service);

-- ============================================
-- PREDICTIONS TABLE
-- Stores AI-generated predictive insights
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  prediction_type TEXT NOT NULL,
  service TEXT,
  predicted_issue TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  time_horizon TEXT,
  based_on_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_service ON predictions(service);

-- ============================================
-- INCIDENT REPORTS TABLE
-- Stores detailed incident reports
-- ============================================
CREATE TABLE IF NOT EXISTS incident_reports (
  id BIGSERIAL PRIMARY KEY,
  error_id BIGINT REFERENCES errors(id),
  title TEXT NOT NULL,
  summary TEXT,
  root_cause TEXT,
  affected_services TEXT[],
  timeline JSONB,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_incidents_created ON incident_reports(created_at DESC);

-- ============================================
-- ERROR RESOLUTIONS TABLE
-- Stores successful fixes for learning
-- ============================================
CREATE TABLE IF NOT EXISTS error_resolutions (
  id BIGSERIAL PRIMARY KEY,
  error_hash TEXT,
  error_message TEXT NOT NULL,
  root_cause TEXT,
  fix_applied TEXT NOT NULL,
  fix_description TEXT,
  service TEXT,
  file_path TEXT,
  resolution_time_seconds INTEGER,
  was_successful BOOLEAN DEFAULT true,
  resolved_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resolutions_service ON error_resolutions(service);
CREATE INDEX IF NOT EXISTS idx_resolutions_successful ON error_resolutions(was_successful);

-- ============================================
-- SOURCE CODE CONFIGS TABLE
-- Stores source code access configuration
-- ============================================
CREATE TABLE IF NOT EXISTS source_code_configs (
  id BIGSERIAL PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('local', 'github', 'none')),
  local_path TEXT,
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  github_token_encrypted TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- Enable if you want to restrict access
-- ============================================
-- ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE errors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE error_resolutions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLEANUP FUNCTION
-- Automatically clean old data
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_data(retention_days INTEGER DEFAULT 7)
RETURNS void AS $$
BEGIN
  DELETE FROM logs WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  DELETE FROM metrics_history WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  UPDATE predictions SET status = 'expired'
    WHERE status = 'active'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- After running this schema, update your .env file with:
-- SUPABASE_URL=https://your-project.supabase.co
-- SUPABASE_KEY=your-anon-key
