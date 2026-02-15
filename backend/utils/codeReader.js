/**
 * Code Reader Utility
 * Reads source code from microservices for analysis
 */

const fs = require('fs').promises;
const path = require('path');

// Base path to services directory
// Resolve relative to the backend directory when running locally
const SERVICES_BASE_PATH = path.resolve(
  __dirname,
  '..',
  process.env.SERVICES_PATH || '../services'
);

/**
 * Read source code from a service
 * @param {string} serviceName - Name of the service (e.g., 'api-gateway')
 * @param {string} fileName - Name of the file to read (e.g., 'index.js')
 * @returns {Promise<string>} File content
 */
async function readServiceCode(serviceName, fileName) {
  const filePath = path.join(SERVICES_BASE_PATH, serviceName, fileName);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`[CodeReader] Read ${filePath} (${content.length} bytes)`);
    return content;
  } catch (error) {
    console.error(`[CodeReader] Failed to read ${filePath}:`, error.message);
    throw new Error(`Could not read file: ${filePath}`);
  }
}

/**
 * List all JavaScript files in a service directory
 * @param {string} serviceName - Name of the service
 * @returns {Promise<string[]>} Array of file names
 */
async function listServiceFiles(serviceName) {
  const servicePath = path.join(SERVICES_BASE_PATH, serviceName);

  try {
    const files = await fs.readdir(servicePath);
    const jsFiles = files.filter(file =>
      file.endsWith('.js') && !file.includes('node_modules')
    );
    console.log(`[CodeReader] Found ${jsFiles.length} JS files in ${serviceName}`);
    return jsFiles;
  } catch (error) {
    console.error(`[CodeReader] Failed to list files in ${servicePath}:`, error.message);
    return [];
  }
}

/**
 * Read all source files from a service
 * @param {string} serviceName - Name of the service
 * @returns {Promise<object>} Object mapping file names to content
 */
async function readAllServiceCode(serviceName) {
  const files = await listServiceFiles(serviceName);
  const codeMap = {};

  for (const file of files) {
    try {
      codeMap[file] = await readServiceCode(serviceName, file);
    } catch (error) {
      console.error(`[CodeReader] Skipping ${file}:`, error.message);
    }
  }

  return codeMap;
}

/**
 * Get service directory path
 * @param {string} serviceName - Name of the service
 * @returns {string} Full path to service directory
 */
function getServicePath(serviceName) {
  return path.join(SERVICES_BASE_PATH, serviceName);
}

/**
 * Check if a service directory exists
 * @param {string} serviceName - Name of the service
 * @returns {Promise<boolean>} True if exists
 */
async function serviceExists(serviceName) {
  const servicePath = getServicePath(serviceName);

  try {
    const stat = await fs.stat(servicePath);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Map service name from log to directory name
 * @param {string} logServiceName - Service name from logs (e.g., 'API-GATEWAY')
 * @returns {string} Directory name (e.g., 'api-gateway')
 */
function mapServiceName(logServiceName) {
  if (!logServiceName) return 'user-service';

  const normalized = logServiceName.toUpperCase().trim();

  const mapping = {
    'API-GATEWAY': 'api-gateway',
    'USER-SERVICE': 'user-service',
    'DB-SERVICE': 'db-service',
    'APIGATEWAY': 'api-gateway',
    'USERSERVICE': 'user-service',
    'DBSERVICE': 'db-service',
    'API_GATEWAY': 'api-gateway',
    'USER_SERVICE': 'user-service',
    'DB_SERVICE': 'db-service',
    'UNKNOWN': 'user-service',  // Default to user-service if unknown
    'KUBEWHISPER-API-GATEWAY': 'api-gateway',
    'KUBEWHISPER-USER-SERVICE': 'user-service',
    'KUBEWHISPER-DB-SERVICE': 'db-service'
  };

  // Direct mapping match
  if (mapping[normalized]) {
    return mapping[normalized];
  }

  // Partial match - check if any known service name is contained
  for (const [key, value] of Object.entries(mapping)) {
    if (normalized.includes(key.replace(/-/g, '').replace(/_/g, ''))) {
      return value;
    }
  }

  // Fallback: convert to lowercase and use
  return logServiceName.toLowerCase().replace(/_/g, '-');
}

module.exports = {
  readServiceCode,
  listServiceFiles,
  readAllServiceCode,
  getServicePath,
  serviceExists,
  mapServiceName
};
