import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Server,
  AlertTriangle,
  FileText,
  Download,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/insights', label: 'AI Insights', icon: Zap },
  { path: '/services', label: 'Services', icon: Server },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/export', label: 'Export', icon: Download },
];

export default function Sidebar({ currentPath, systemStats }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-52'} min-h-screen h-full flex flex-col border-r border-white/5 bg-navy-950/50 backdrop-blur-xl transition-all duration-300 flex-shrink-0`}>
      {/* Logo */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-white truncate">KubeWhisper</h1>
              <p className="text-xs text-slate-500">RCA Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : 'px-3'}`}
              title={collapsed ? item.label : ''}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-white/5 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* System Status - Only when expanded */}
      {!collapsed && (
        <div className="p-2 border-t border-white/5 flex-shrink-0">
          <div className="glass-card p-3 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status
            </h3>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Services</span>
                <span className="text-xs font-medium text-white">
                  {systemStats.healthyServices}/{systemStats.totalServices}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Alerts</span>
                <span className={`text-xs font-medium ${
                  systemStats.activeAlerts > 0 ? 'text-cyber-red' : 'text-cyber-green'
                }`}>
                  {systemStats.activeAlerts}
                </span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="space-y-1">
              <div className="h-1 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{
                    width: systemStats.totalServices > 0
                      ? `${(systemStats.healthyServices / systemStats.totalServices) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {systemStats.totalServices > 0
                  ? `${Math.round((systemStats.healthyServices / systemStats.totalServices) * 100)}% healthy`
                  : 'No services'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
