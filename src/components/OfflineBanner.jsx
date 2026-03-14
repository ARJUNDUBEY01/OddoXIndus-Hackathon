import React, { useState, useEffect } from 'react';
import { FiWifiOff, FiWifi } from 'react-icons/fi';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOnline(false);
    const goOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium transition-all duration-500 ${
      isOnline
        ? 'bg-emerald-500/90 text-white backdrop-blur-lg border border-emerald-400/50'
        : 'bg-red-500/90 text-white backdrop-blur-lg border border-red-400/50 animate-pulse'
    }`}>
      {isOnline ? (
        <>
          <FiWifi className="w-5 h-5" />
          <span>Back online! Blockchain sync resumed.</span>
        </>
      ) : (
        <>
          <FiWifiOff className="w-5 h-5" />
          <span>You're offline. Blockchain sync will resume on reconnect.</span>
        </>
      )}
    </div>
  );
}
