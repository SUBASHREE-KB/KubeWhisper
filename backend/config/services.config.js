/**
 * Service Configuration
 * Users can configure which containers/services to monitor
 */

module.exports = {
  // Discovery mode: 'manual' | 'auto' | 'pattern'
  discoveryMode: process.env.DISCOVERY_MODE || 'auto',

  // Manual: List specific container names to monitor
  manualServices: (process.env.SERVICES || '').split(',').filter(Boolean),

  // Pattern: Regex patterns to match container names
  servicePatterns: (process.env.SERVICE_PATTERNS || '').split(',').filter(Boolean),

  // Auto-discovery settings
  autoDiscovery: {
    // Exclude these containers from monitoring
    excludePatterns: [
      /^kubewhisper[-_]?(backend|frontend)/i,
      /^mongo/i,
      /^redis/i,
      /^postgres/i,
      /^mysql/i,
      /^nginx/i,
      /^traefik/i
    ],
    // Only include containers with these labels
    requiredLabels: (process.env.REQUIRED_LABELS || '').split(',').filter(Boolean),
    // Refresh interval for auto-discovery (ms)
    refreshInterval: parseInt(process.env.DISCOVERY_INTERVAL) || 30000
  },

  // Docker connection settings
  docker: {
    // Docker socket path (for local Docker)
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    // For Windows Docker Desktop
    windowsSocketPath: process.env.DOCKER_SOCKET_WINDOWS || '//./pipe/docker_engine',
    // Remote Docker host (optional)
    host: process.env.DOCKER_HOST || null,
    port: parseInt(process.env.DOCKER_PORT) || 2375,
    // Use TLS for remote connections
    useTLS: process.env.DOCKER_TLS === 'true',
    certPath: process.env.DOCKER_CERT_PATH || null
  },

  // Service code paths (for fix generation)
  codePaths: {
    // Base path where service source code is located
    basePath: process.env.SERVICES_PATH || '../services',
    // Map service names to code directories
    serviceMap: {}
  }
};
