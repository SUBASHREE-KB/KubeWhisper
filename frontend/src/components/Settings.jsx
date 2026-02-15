import React, { useState, useEffect } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CircularProgress from '@mui/material/CircularProgress';

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
      <div className="bg-bg-dark border border-border-dark rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bg-medium rounded-lg">
              <SettingsIcon sx={{ fontSize: 20, color: '#FAFAFA' }} />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Service Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-medium rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Notifications */}
          {error && (
            <div className="mb-4 p-3 bg-status-error/10 border border-status-error/30 rounded-lg flex items-center gap-2">
              <ErrorOutlineIcon sx={{ fontSize: 16, color: '#EF4444' }} />
              <span className="text-status-error text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-status-success/10 border border-status-success/30 rounded-lg flex items-center gap-2">
              <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
              <span className="text-status-success text-sm">{success}</span>
            </div>
          )}

          {/* Discovery Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Discovery Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['auto', 'manual', 'pattern'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-text-primary text-bg-darkest border-text-primary'
                      : 'bg-bg-medium border-border-light text-text-secondary hover:border-text-muted hover:text-text-primary'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {mode === 'auto' && 'Automatically discover all running containers'}
              {mode === 'manual' && 'Manually specify container names to monitor'}
              {mode === 'pattern' && 'Use regex patterns to match container names'}
            </p>
          </div>

          {/* Manual Services */}
          {mode === 'manual' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-3">
                Container Names
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Enter container name..."
                  className="input flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addService()}
                />
                <button
                  onClick={addService}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {manualServices.map((service, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-bg-medium rounded-lg border border-border-dark"
                  >
                    <div className="flex items-center gap-2">
                      <StorageIcon sx={{ fontSize: 16, color: '#A3A3A3' }} />
                      <span className="text-sm text-text-primary font-mono">{service}</span>
                    </div>
                    <button
                      onClick={() => removeService(service)}
                      className="p-1.5 hover:bg-bg-hover rounded text-text-muted hover:text-status-error transition-colors"
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {mode === 'pattern' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-3">
                Container Patterns (Regex)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g., my-app-.*"
                  className="input flex-1 font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                />
                <button
                  onClick={addPattern}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {patterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-bg-medium rounded-lg border border-border-dark"
                  >
                    <code className="text-sm text-status-success font-mono">{pattern}</code>
                    <button
                      onClick={() => removePattern(index)}
                      className="p-1.5 hover:bg-bg-hover rounded text-text-muted hover:text-status-error transition-colors"
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discovered Services */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-text-primary">
                Discovered Services ({discoveredServices.length})
              </label>
              <button
                onClick={triggerDiscovery}
                disabled={discovering}
                className="btn btn-ghost text-sm flex items-center gap-2"
              >
                {discovering ? (
                  <CircularProgress size={14} sx={{ color: '#FAFAFA' }} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 16 }} />
                )}
                Refresh
              </button>
            </div>
            <div className="bg-bg-medium rounded-lg p-4 max-h-48 overflow-y-auto border border-border-dark">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <CircularProgress size={24} sx={{ color: '#FAFAFA' }} />
                </div>
              ) : discoveredServices.length > 0 ? (
                <div className="space-y-2">
                  {discoveredServices.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-2 h-2 bg-status-success rounded-full" />
                      <span className="text-text-primary font-mono">{service.name}</span>
                      {service.image && (
                        <span className="text-text-muted text-xs">({service.image})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm text-center py-4">
                  No services discovered. Make sure Docker containers are running.
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-status-info/5 border border-status-info/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-status-info mb-2">How to Connect Your Services</h3>
            <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
              <li>Start your Docker containers</li>
              <li>Choose a discovery mode above</li>
              <li>For <span className="text-text-primary">Auto</span>: All running containers will be monitored</li>
              <li>For <span className="text-text-primary">Manual</span>: Enter your container names exactly</li>
              <li>For <span className="text-text-primary">Pattern</span>: Use regex patterns like <code className="text-status-success">myapp-.*</code></li>
              <li>Click "Save Configuration" to apply changes</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-dark">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={saveConfig}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading && <CircularProgress size={16} sx={{ color: '#0A0A0A' }} />}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
