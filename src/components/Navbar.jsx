import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiLogOut, FiMenu, FiBell, FiSun, FiMoon } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Navbar({ title }) {
  const { signOut } = useAuth();
  const { isDark, toggle } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logged out');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <header className={`h-16 flex items-center justify-between px-6 border-b sticky top-0 z-20 transition-colors duration-300 ${isDark ? 'border-slate-800 bg-slate-900/50 backdrop-blur-md' : 'border-slate-200 bg-white/50 backdrop-blur-xl'}`}>
      <div className="flex items-center gap-4">
        <button className={`md:hidden ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          <FiMenu className="w-6 h-6" />
        </button>
        <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="p-2 text-slate-400 hover:text-white transition-all rounded-full hover:bg-slate-800 group"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <FiSun className="w-5 h-5 group-hover:text-amber-400 transition-colors" />
          ) : (
            <FiMoon className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
          )}
        </button>

        <button className={`relative p-2 transition-colors rounded-full ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
          <FiBell className="w-5 h-5" />
          <span className={`absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 rounded-full ${isDark ? 'border-slate-900' : 'border-white'}`}></span>
        </button>
        
        <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          <FiLogOut />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
