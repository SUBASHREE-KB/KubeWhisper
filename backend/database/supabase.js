/**
 * Supabase Client Configuration
 * Handles connection to Supabase (PostgreSQL)
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;
let isConnected = false;

/**
 * Initialize Supabase client
 */
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[Supabase] Missing credentials - using in-memory storage');
    return null;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false
      }
    });

    console.log('[Supabase] Client initialized');
    return supabase;
  } catch (error) {
    console.error('[Supabase] Failed to initialize:', error.message);
    return null;
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('logs')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[Supabase] Connection test failed:', error.message);
      isConnected = false;
      return false;
    }

    console.log('[Supabase] Connection test successful');
    isConnected = true;
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test error:', error.message);
    isConnected = false;
    return false;
  }
}

/**
 * Get Supabase client instance
 */
function getClient() {
  return supabase;
}

/**
 * Check if Supabase is connected
 */
function getConnectionStatus() {
  return {
    configured: !!(SUPABASE_URL && SUPABASE_KEY),
    connected: isConnected,
    url: SUPABASE_URL ? SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0] + '...' : 'not configured'
  };
}

module.exports = {
  initializeSupabase,
  testConnection,
  getClient,
  getConnectionStatus,
  get supabase() { return supabase; }
};
