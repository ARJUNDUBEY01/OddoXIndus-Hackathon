import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiUser, FiBriefcase, FiBox, FiUserPlus } from 'react-icons/fi';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, name, role);
      toast.success('Account created! You can now sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <div className="layout-container w-full max-w-[1200px] flex flex-col items-center">
        {/* Header */}
        <header className="w-full flex items-center justify-between px-8 py-6 mb-8 absolute top-0 left-0">
          <div className={`flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <div className="size-10 clay-primary rounded-xl flex items-center justify-center text-white">
              <FiBox className="text-xl" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Inventra</h2>
          </div>
          <button className={`clay-card px-6 py-2.5 rounded-full ${isDark ? 'text-slate-300' : 'text-slate-600'} font-bold text-sm hover:scale-105 transition-transform`}>
            Help Center
          </button>
        </header>

        {/* Main Content */}
        <main className="w-full flex items-center justify-center mt-20">
          <div className={`clay-card w-full max-w-[500px] rounded-[2rem] p-10 md:p-14 flex flex-col items-center gap-8 ${isDark ? 'border-slate-700/50' : 'border-white/40'}`}>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 clay-inset rounded-full flex items-center justify-center mb-4">
                <FiBox className="text-[#4030e8] text-4xl" />
              </div>
              <h1 className={`text-3xl font-extrabold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Create Account
              </h1>
              <p className={isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>
                Join Inventra today
              </p>
            </div>

            <form onSubmit={handleSignup} className="w-full space-y-6">
              <div className="space-y-2">
                <label className={`text-sm font-bold px-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Full Name</label>
                <div className="clay-input rounded-2xl px-5 py-4 flex items-center gap-3">
                  <FiUser className={isDark ? 'text-slate-400' : 'text-slate-400'} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 font-medium w-full placeholder:text-slate-400 outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-bold px-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email Address</label>
                <div className="clay-input rounded-2xl px-5 py-4 flex items-center gap-3">
                  <FiMail className={isDark ? 'text-slate-400' : 'text-slate-400'} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 font-medium w-full placeholder:text-slate-400 outline-none"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-bold px-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                <div className="clay-input rounded-2xl px-5 py-4 flex items-center gap-3">
                  <FiLock className={isDark ? 'text-slate-400' : 'text-slate-400'} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 font-medium w-full placeholder:text-slate-400 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-bold px-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Role</label>
                <div className="clay-input rounded-2xl px-5 py-4 flex items-center gap-3">
                  <FiBriefcase className={isDark ? 'text-slate-400' : 'text-slate-400'} />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={`bg-transparent border-none focus:ring-0 font-medium w-full outline-none appearance-none ${isDark ? 'text-white' : 'text-slate-800'}`}
                  >
                    <option value="staff" className={isDark ? 'bg-slate-800' : 'bg-white'}>Staff</option>
                    <option value="manager" className={isDark ? 'bg-slate-800' : 'bg-white'}>Manager</option>
                    <option value="admin" className={isDark ? 'bg-slate-800' : 'bg-white'}>Admin</option>
                  </select>
                </div>
              </div>

              <div className="w-full pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="clay-button-primary w-full py-5 rounded-2xl text-white font-extrabold text-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
                  ) : (
                    <>Create Account <FiUserPlus className="text-xl" /></>
                  )}
                </button>
              </div>
            </form>

            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Already have an account?{' '}
              <Link to="/login" className="text-[#4030e8] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </main>

        <footer className={`mt-12 text-xs font-medium space-x-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Link to="#" className="hover:text-[#4030e8] transition-colors">Privacy Policy</Link>
          <Link to="#" className="hover:text-[#4030e8] transition-colors">Terms of Service</Link>
          <span>© 2024 Inventra Inc.</span>
        </footer>
      </div>

      {/* Decorative Orbs */}
      <div className="fixed -bottom-20 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="fixed top-20 -left-20 w-96 h-96 bg-[#4030e8]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
    </div>
  );
}
