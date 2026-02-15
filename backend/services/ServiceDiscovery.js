/**
 * Service Discovery
 * Automatically discovers and manages Docker containers to monitor
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const EventEmitter = require('events');
const execAsync = promisify(exec);

class ServiceDiscovery extends EventEmitter {
  constructor(config = {}) {
    super();

    this.discoveryMode = config.discoveryMode || 'auto';
    this.manualServices = config.manualServices || [];
    this.servicePatterns = config.servicePatterns || [];
    this.excludePatterns = config.excludePatterns || [];
    this.requiredLabels = config.requiredLabels || [];
    this.refreshInterval = config.refreshInterval || 30000;

    this.services = new Map();
    this.isRunning = false;
    this.refreshTimer = null;

    console.log('[ServiceDiscovery] Initialized with mode:', this.discoveryMode);
  }

  /**
   * Start service discovery
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[ServiceDiscovery] Starting...');

    // Initial discovery
    await this.discover();

    // Set up periodic refresh for auto mode
    if (this.discoveryMode === 'auto') {
      this.refreshTimer = setInterval(() => {
        this.discover().catch(err => {
          console.error('[ServiceDiscovery] Refresh error:', err.message);
        });
      }, this.refreshInterval);
    }

    this.emit('started');
  }

  /**
   * Stop service discovery
   */
  stop() {
    this.isRunning = false;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    console.log('[ServiceDiscovery] Stopped');
    this.emit('stopped');
  }

  /**
   * Discover services based on mode
   */
  async discover() {
    try {
      let containers = [];

      switch (this.discoveryMode) {
        case 'manual':
          containers = await this.discoverManual();
          break;
        case 'pattern':
          containers = await this.discoverByPattern();
          break;
        case 'auto':
        default:
          containers = await this.discoverAuto();
          break;
      }

      // Update services map
      const newServices = new Map();
      for (const container of containers) {
        newServices.set(container.name, container);
      }

      // Check for changes
      const added = [];
      const removed = [];

      for (const [name, container] of newServices) {
        if (!this.services.has(name)) {
          added.push(container);
        }
      }

      for (const [name, container] of this.services) {
        if (!newServices.has(name)) {
          removed.push(container);
        }
      }

      this.services = newServices;

      // Emit events if changes detected
      if (added.length > 0) {
        console.log('[ServiceDiscovery] New services found:', added.map(s => s.name));
        this.emit('services-added', added);
      }

      if (removed.length > 0) {
        console.log('[ServiceDiscovery] Services removed:', removed.map(s => s.name));
        this.emit('services-removed', removed);
      }

      this.emit('discovery-complete', Array.from(this.services.values()));

      return Array.from(this.services.values());
    } catch (error) {
      console.error('[ServiceDiscovery] Discovery failed:', error.message);
      this.emit('discovery-error', error);
      return [];
    }
  }

  /**
   * Manual discovery - use specified container names
   */
  async discoverManual() {
    const containers = [];

    for (const name of this.manualServices) {
      try {
        const info = await this.getContainerInfo(name);
        if (info) {
          containers.push(info);
        }
      } catch (error) {
        console.warn(`[ServiceDiscovery] Container not found: ${name}`);
      }
    }

    return containers;
  }

  /**
   * Pattern-based discovery
   */
  async discoverByPattern() {
    const allContainers = await this.getAllRunningContainers();

    return allContainers.filter(container => {
      return this.servicePatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(container.name);
      });
    });
  }

  /**
   * Auto-discovery - find all running containers except excluded ones
   */
  async discoverAuto() {
    const allContainers = await this.getAllRunningContainers();

    return allContainers.filter(container => {
      // Check exclude patterns
      for (const pattern of this.excludePatterns) {
        if (pattern.test(container.name)) {
          return false;
        }
      }

      // Check required labels if specified
      if (this.requiredLabels.length > 0) {
        const hasRequiredLabels = this.requiredLabels.every(label => {
          const [key, value] = label.split('=');
          if (value) {
            return container.labels[key] === value;
          }
          return key in container.labels;
        });
        if (!hasRequiredLabels) return false;
      }

      return true;
    });
  }

  /**
   * Get all running containers
   */
  async getAllRunningContainers() {
    try {
      const { stdout } = await execAsync(
        'docker ps --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.Labels}}"'
      );

      const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
        const [name, image, status, ports, labelsStr] = line.split('|');

        // Parse labels
        const labels = {};
        if (labelsStr) {
          labelsStr.split(',').forEach(labelPair => {
            const [key, value] = labelPair.split('=');
            if (key) labels[key.trim()] = value?.trim() || '';
          });
        }

        return {
          name: name.trim(),
          image: image.trim(),
          status: status.trim(),
          ports: ports.trim(),
          labels,
          discoveredAt: new Date().toISOString()
        };
      });

      return containers;
    } catch (error) {
      console.error('[ServiceDiscovery] Failed to list containers:', error.message);
      return [];
    }
  }

  /**
   * Get info for a specific container
   */
  async getContainerInfo(name) {
    try {
      const { stdout } = await execAsync(
        `docker inspect --format "{{.Name}}|{{.Config.Image}}|{{.State.Status}}" ${name}`
      );

      const [containerName, image, status] = stdout.trim().split('|');

      return {
        name: containerName.replace(/^\//, ''),
        image,
        status,
        discoveredAt: new Date().toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get list of monitored service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Get service info by name
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * Check if a service is being monitored
   */
  hasService(name) {
    return this.services.has(name);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      mode: this.discoveryMode,
      serviceCount: this.services.size,
      services: Array.from(this.services.values())
    };
  }
}

module.exports = ServiceDiscovery;
