/**
 * Docker Helper Utilities
 * Provides functions for interacting with Docker containers
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Get list of running container names
 * @returns {Promise<string[]>} Array of container names
 */
async function getContainerNames() {
  try {
    const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
    return stdout.trim().split('\n').filter(name => name.length > 0);
  } catch (error) {
    console.error('[DockerHelper] Failed to get container names:', error.message);
    return [];
  }
}

/**
 * Get logs from a container
 * @param {string} containerName - Name of the container
 * @param {object} options - Options for log retrieval
 * @param {number} options.tail - Number of lines to retrieve
 * @param {boolean} options.timestamps - Include timestamps
 * @returns {Promise<string>} Container logs
 */
async function getContainerLogs(containerName, options = {}) {
  const { tail = 100, timestamps = true } = options;

  try {
    const timestampFlag = timestamps ? '-t' : '';
    const { stdout } = await execAsync(
      `docker logs ${containerName} --tail ${tail} ${timestampFlag} 2>&1`
    );
    return stdout;
  } catch (error) {
    console.error(`[DockerHelper] Failed to get logs for ${containerName}:`, error.message);
    throw error;
  }
}

/**
 * Get container stats
 * @param {string} containerName - Name of the container
 * @returns {Promise<object>} Container stats
 */
async function getContainerStats(containerName) {
  try {
    const { stdout } = await execAsync(
      `docker stats ${containerName} --no-stream --format "{{json .}}"`
    );

    const stats = JSON.parse(stdout.trim());

    return {
      container: stats.Name || containerName,
      cpu: stats.CPUPerc || '0%',
      memory: stats.MemUsage || '0MiB / 0MiB',
      memoryPercent: stats.MemPerc || '0%',
      netIO: stats.NetIO || '0B / 0B',
      blockIO: stats.BlockIO || '0B / 0B',
      pids: stats.PIDs || '0',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[DockerHelper] Failed to get stats for ${containerName}:`, error.message);
    return {
      container: containerName,
      cpu: 'N/A',
      memory: 'N/A',
      memoryPercent: 'N/A',
      netIO: 'N/A',
      blockIO: 'N/A',
      pids: 'N/A',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Check if a container is running
 * @param {string} containerName - Name of the container
 * @returns {Promise<boolean>} True if running
 */
async function isContainerRunning(containerName) {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f "{{.State.Running}}" ${containerName} 2>/dev/null`
    );
    return stdout.trim() === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Get container inspect data
 * @param {string} containerName - Name of the container
 * @returns {Promise<object>} Container inspection data
 */
async function inspectContainer(containerName) {
  try {
    const { stdout } = await execAsync(`docker inspect ${containerName}`);
    return JSON.parse(stdout)[0];
  } catch (error) {
    console.error(`[DockerHelper] Failed to inspect ${containerName}:`, error.message);
    throw error;
  }
}

/**
 * Get all stats for multiple containers
 * @param {string[]} containerNames - Array of container names
 * @returns {Promise<object[]>} Array of stats objects
 */
async function getAllContainerStats(containerNames) {
  const statsPromises = containerNames.map(name => getContainerStats(name));
  return Promise.all(statsPromises);
}

/**
 * Filter containers by name pattern
 * @param {string} pattern - Pattern to match
 * @returns {Promise<string[]>} Matching container names
 */
async function filterContainers(pattern) {
  const containers = await getContainerNames();
  const regex = new RegExp(pattern, 'i');
  return containers.filter(name => regex.test(name));
}

module.exports = {
  getContainerNames,
  getContainerLogs,
  getContainerStats,
  isContainerRunning,
  inspectContainer,
  getAllContainerStats,
  filterContainers
};
