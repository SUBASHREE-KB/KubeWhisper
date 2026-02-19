import React, { useState, useEffect } from 'react';
import { Search, Bell, Wifi, WifiOff } from 'lucide-react';

export default function TopBar({ connected }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="h-16 border-b border-white/5 bg-navy-950/30 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search services, logs, incidents..."
            className="input-glass w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Time */}
        <div className="text-right">
          <p className="text-sm font-mono text-white">{formatTime(currentTime)}</p>
          <p className="text-xs text-slate-500">{formatDate(currentTime)}</p>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10" />

        {/* Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          connected
            ? 'bg-cyber-green/10 border border-cyber-green/30'
            : 'bg-cyber-red/10 border border-cyber-red/30'
        }`}>
          {connected ? (
            <>
              <Wifi className="w-4 h-4 text-cyber-green" />
              <span className="text-xs font-medium text-cyber-green">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-cyber-red" />
              <span className="text-xs font-medium text-cyber-red">Offline</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyber-red rounded-full" />
        </button>
      </div>
    </header>
  );
}
