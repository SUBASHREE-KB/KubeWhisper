import React, { useState } from 'react';
import { Server, Search, Filter, Grid, List, Cpu, HardDrive, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import ServiceCard from '../components/ServiceCard';

function ServiceHealthPage({ metrics, metricsHistory, logs }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');

  // Get services with their data
  const services = metrics.map(m => ({
    name: m.service,
    status: m.cpuPercent > 80 || m.memoryPercent > 80 ? 'warning' : 'healthy',
    cpu: m.cpuPercent,
    memory: m.memoryPercent,
    errors: logs.filter(l => l.service === m.service && ['ERROR', 'CRITICAL'].includes(l.level)).length,
    history: metricsHistory[m.service] || []
  }));

  // Filter services
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort services
  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'cpu':
        return b.cpu - a.cpu;
      case 'memory':
        return b.memory - a.memory;
      case 'errors':
        return b.errors - a.errors;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Calculate totals
  const avgCpu = services.length > 0
    ? (services.reduce((sum, s) => sum + s.cpu, 0) / services.length).toFixed(1)
    : 0;
  const avgMemory = services.length > 0
    ? (services.reduce((sum, s) => sum + s.memory, 0) / services.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="w-7 h-7 text-electric-400" />
            Service Health
          </h1>
          <p className="text-slate-400 mt-1">Monitor and manage all your microservices</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-electric-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-electric-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card group relative overflow-hidden border-l-4 border-cyan-500">
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center ring-1 ring-cyan-500/30">
                <Server className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Total Services</p>
                <span className="text-xs text-cyan-400">Monitored</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{services.length}</p>
          </div>
        </div>

        <div className="metric-card group relative overflow-hidden border-l-4 border-cyber-green">
          <div className="absolute inset-0 bg-cyber-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyber-green/20 flex items-center justify-center ring-1 ring-cyber-green/30">
                <Activity className="w-5 h-5 text-cyber-green" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Healthy</p>
                <span className="text-xs text-cyber-green">Operational</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-cyber-green">
              {services.filter(s => s.status === 'healthy').length}
            </p>
          </div>
        </div>

        <div className="metric-card group relative overflow-hidden border-l-4 border-electric-400">
          <div className="absolute inset-0 bg-electric-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-electric-500/20 flex items-center justify-center ring-1 ring-electric-500/30">
                <Cpu className="w-5 h-5 text-electric-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Avg CPU</p>
                <span className={`text-xs ${parseFloat(avgCpu) > 70 ? 'text-cyber-yellow' : 'text-cyber-green'}`}>
                  {parseFloat(avgCpu) > 70 ? 'High' : 'Normal'}
                </span>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{avgCpu}<span className="text-lg text-slate-400">%</span></p>
          </div>
        </div>

        <div className="metric-card group relative overflow-hidden border-l-4 border-cyan-500">
          <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center ring-1 ring-cyan-500/30">
                <HardDrive className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Avg Memory</p>
                <span className={`text-xs ${parseFloat(avgMemory) > 70 ? 'text-cyber-yellow' : 'text-cyber-green'}`}>
                  {parseFloat(avgMemory) > 70 ? 'High' : 'Stable'}
                </span>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{avgMemory}<span className="text-lg text-slate-400">%</span></p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass w-full pl-10 pr-4 py-2.5"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-glass py-2.5 pr-8"
          >
            <option value="name">Sort by Name</option>
            <option value="cpu">Sort by CPU</option>
            <option value="memory">Sort by Memory</option>
            <option value="errors">Sort by Errors</option>
          </select>
        </div>
      </div>

      {/* Services */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedServices.map((service) => (
            <ServiceCard
              key={service.name}
              service={service}
              onClick={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-sm font-medium text-slate-400 p-4">Service</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Status</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">CPU</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Memory</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Errors</th>
                <th className="text-left text-sm font-medium text-slate-400 p-4">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedServices.map((service) => (
                <tr key={service.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <span className="font-medium text-white">
                      {service.name.replace('kubewhisper-', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`badge ${service.status === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-mono ${service.cpu > 80 ? 'text-cyber-red' : 'text-white'}`}>
                      {service.cpu.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-mono ${service.memory > 80 ? 'text-cyber-red' : 'text-white'}`}>
                      {service.memory.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-mono ${service.errors > 0 ? 'text-cyber-red' : 'text-slate-400'}`}>
                      {service.errors}
                    </span>
                  </td>
                  <td className="p-4 w-32">
                    {service.history.length > 1 ? (
                      <ResponsiveContainer width="100%" height={30}>
                        <LineChart data={service.history.slice(-10)}>
                          <Line
                            type="monotone"
                            dataKey="cpu"
                            stroke="#3B82F6"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-xs text-slate-500">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sortedServices.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No services found</h3>
          <p className="text-slate-400">Try adjusting your search filters</p>
        </div>
      )}
    </div>
  );
}

export default ServiceHealthPage;
