import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FiGrid, FiBox, FiTruck, FiSend, 
  FiTrendingUp, FiSettings, FiActivity, FiLayers
} from 'react-icons/fi';

export default function Sidebar() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: FiGrid, roles: ['admin', 'manager', 'staff'] },
    { name: 'Products', path: '/products', icon: FiBox, roles: ['admin', 'manager', 'staff'] },
    { name: 'Receipts', path: '/receipts', icon: FiTruck, roles: ['admin', 'manager'] },
    { name: 'Deliveries', path: '/deliveries', icon: FiSend, roles: ['admin', 'manager', 'staff'] },
    { name: 'Transfers', path: '/transfers', icon: FiActivity, roles: ['admin', 'manager', 'staff'] },
    { name: 'Adjustments', path: '/adjustments', icon: FiSettings, roles: ['admin'] },
    { name: 'Blockchain Ledger', path: '/blockchain', icon: FiLayers, roles: ['admin', 'manager'] },
    { name: 'Analytics', path: '/analytics', icon: FiTrendingUp, roles: ['admin', 'manager'] },
  ];

  const userRole = profile?.role || 'staff';
  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const hoverBg = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-200/50';

  return (
    <aside className={`w-72 h-full flex-shrink-0 hidden md:flex flex-col p-6 gap-8 ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'} transition-colors duration-250`}>
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="size-10 clay-primary flex items-center justify-center rounded-xl text-white">
          <FiLayers className="text-2xl" />
        </div>
        <h2 className={`text-xl font-extrabold tracking-tight ${textPrimary}`}>Inventra</h2>
      </div>

      <nav className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
                isActive 
                  ? `clay-active-nav font-bold ${isDark ? 'text-white' : 'text-[#4030e8]'}` 
                  : `${textSecondary} font-medium ${hoverBg}`
              }`
            }
          >
            <item.icon className="text-xl" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 clay-card rounded-2xl flex items-center gap-3">
        <div className="size-10 rounded-full flex items-center justify-center overflow-hidden">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isDark ? 'text-white bg-slate-700' : 'text-[#4030e8] bg-[#4030e8]/10'}`}>
            {profile?.name?.charAt(0) || 'U'}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className={`text-sm font-bold truncate ${textPrimary}`}>{profile?.name || 'User'}</p>
          <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Staff'}</p>
        </div>
      </div>
    </aside>
  );
}
