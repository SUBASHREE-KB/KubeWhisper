import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Plus, Trash2, RefreshCw, Server, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function Settings({ isOpen, onClose }) {
  const [mode, setMode] = useState('auto');
  const [manualServices, setManualServices] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [discoveredServices, setDiscoveredServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch current configuration
  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/config/services`);
      const data = await response.json();

      setMode(data.mode || 'auto');
      setManualServices(data.manualServices || []);
      setPatterns(data.servicePatterns || []);
      setDiscoveredServices(data.discoveredServices || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/config/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, services: manualServices, patterns })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Configuration saved successfully');
        setDiscoveredServices(data.services?.map(name => ({ name })) || []);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const triggerDiscovery = async () => {
    setDiscovering(true);
    try {
      const response = await fetch(`${API_URL}/api/config/discover`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setDiscoveredServices(data.services || []);
        setSuccess(`Discovered ${data.services?.length || 0} services`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const addService = async () => {
    if (!newService.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/config/services/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerName: newService.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setManualServices([...manualServices, newService.trim()]);
        setNewService('');
        setSuccess(`Added ${newService.trim()}`);
        setTimeout(() => setSuccess(null), 3000);
        fetchConfig();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to add service');
    }
  };

  const removeService = async (serviceName) => {
    try {
      const response = await fetch(`${API_URL}/api/config/services/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerName: serviceName })
      });

      const data = await response.json();
      if (data.success) {
        setManualServices(manualServices.filter(s => s !== serviceName));
        setSuccess(`Removed ${serviceName}`);
        setTimeout(() => setSuccess(null), 3000);
        fetchConfig();
      }
    } catch (err) {
      setError('Failed to remove service');
    }
  };

  const addPattern = () => {
    if (!newPattern.trim()) return;
    setPatterns([...patterns, newPattern.trim()]);
    setNewPattern('');
  };

  const removePattern = (index) => {
    setPatterns(patterns.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-500/20 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-electric-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Service Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Notifications */}
          {error && (
            <div className="mb-4 p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-cyber-red" />
              <span className="text-cyber-red text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-cyber-green/10 border border-cyber-green/30 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cyber-green" />
              <span className="text-cyber-green text-sm">{success}</span>
            </div>
          )}

          {/* Discovery Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-3">
              Discovery Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['auto', 'manual', 'pattern'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-electric-500 text-white border-electric-500'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {mode === 'auto' && 'Automatically discover all running containers'}
              {mode === 'manual' && 'Manually specify container names to monitor'}
              {mode === 'pattern' && 'Use regex patterns to match container names'}
            </p>
          </div>

          {/* Manual Services */}
          {mode === 'manual' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3">
                Container Names
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Enter container name..."
                  className="input-glass flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addService()}
                />
                <button
                  onClick={addService}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {manualServices.map((service, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-white font-mono">{service}</span>
                    </div>
                    <button
                      onClick={() => removeService(service)}
                      className="p-1.5 hover:bg-white/10 rounded text-slate-500 hover:text-cyber-red transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {mode === 'pattern' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3">
                Container Patterns (Regex)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g., my-app-.*"
                  className="input-glass flex-1 font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                />
                <button
                  onClick={addPattern}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {patterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10"
                  >
                    <code className="text-sm text-cyber-green font-mono">{pattern}</code>
                    <button
                      onClick={() => removePattern(index)}
                      className="p-1.5 hover:bg-white/10 rounded text-slate-500 hover:text-cyber-red transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discovered Services */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-white">
                Discovered Services ({discoveredServices.length})
              </label>
              <button
                onClick={triggerDiscovery}
                disabled={discovering}
                className="btn-glass text-sm flex items-center gap-2 py-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="bg-white/5 rounded-xl p-4 max-h-48 overflow-y-auto border border-white/10">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="spinner" />
                </div>
              ) : discoveredServices.length > 0 ? (
                <div className="space-y-2">
                  {discoveredServices.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-2 h-2 bg-cyber-green rounded-full" />
                      <span className="text-white font-mono">{service.name}</span>
                      {service.image && (
                        <span className="text-slate-500 text-xs">({service.image})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  No services discovered. Make sure Docker containers are running.
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-electric-500/10 border border-electric-500/30 rounded-xl p-4">
            <h3 className="text-sm font-medium text-electric-400 mb-2">How to Connect Your Services</h3>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>Start your Docker containers</li>
              <li>Choose a discovery mode above</li>
              <li>For <span className="text-white">Auto</span>: All running containers will be monitored</li>
              <li>For <span className="text-white">Manual</span>: Enter your container names exactly</li>
              <li>For <span className="text-white">Pattern</span>: Use regex patterns like <code className="text-cyber-green">myapp-.*</code></li>
              <li>Click "Save Configuration" to apply changes</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="btn-glass"
          >
            Cancel
          </button>
          <button
            onClick={saveConfig}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <div className="spinner w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
