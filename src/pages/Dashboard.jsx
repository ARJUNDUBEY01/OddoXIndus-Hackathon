import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabaseClient';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiBox, FiAlertTriangle, FiXCircle, FiDollarSign, FiPackage, FiTruck, FiRefreshCw, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';

const COLORS = ['#4030e8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState({
    totalProducts: 0, lowStock: 0, outOfStock: 0, stockValue: 0,
    pendingReceipts: 0, pendingDeliveries: 0, totalTransfers: 0,
  });
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stockTrend, setStockTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      // Products
      const { data: products } = await supabase.from('products').select('name, sku, stock, reorder_level, category, warehouse');
      const totalProducts = products?.length || 0;
      const lowStock = products?.filter(p => p.stock > 0 && p.stock <= p.reorder_level).length || 0;
      const outOfStock = products?.filter(p => p.stock === 0).length || 0;
      const stockValue = products?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0;

      // Top 5 products
      const sorted = [...(products || [])].sort((a, b) => b.stock - a.stock);
      setTopProducts(sorted.slice(0, 5));

      // Category distribution
      const catMap = {};
      (products || []).forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + p.stock; });
      setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })));

      // Receipts + Deliveries counts
      const { count: pendingReceipts } = await supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: pendingDeliveries } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).neq('status', 'delivered');
      const { count: totalTransfers } = await supabase.from('transfers').select('*', { count: 'exact', head: true });

      setStats({ totalProducts, lowStock, outOfStock, stockValue, pendingReceipts: pendingReceipts || 0, pendingDeliveries: pendingDeliveries || 0, totalTransfers: totalTransfers || 0 });

      // Stock trend from receipts + deliveries (monthly)
      const { data: receipts } = await supabase.from('receipts').select('date, receipt_items(quantity)').eq('status', 'confirmed');
      const { data: deliveries } = await supabase.from('deliveries').select('date, quantity').eq('status', 'delivered');
      const monthMap = {};
      const getMonth = (d) => new Date(d).toLocaleString('default', { month: 'short' });
      (receipts || []).forEach(r => {
        const m = getMonth(r.date);
        if (!monthMap[m]) monthMap[m] = { name: m, inbound: 0, outbound: 0 };
        monthMap[m].inbound += r.receipt_items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
      });
      (deliveries || []).forEach(d => {
        const m = getMonth(d.date);
        if (!monthMap[m]) monthMap[m] = { name: m, inbound: 0, outbound: 0 };
        monthMap[m].outbound += d.quantity || 0;
      });
      const trendData = Object.values(monthMap);
      setStockTrend(trendData.length > 0 ? trendData : [{ name: 'This Month', inbound: 0, outbound: 0 }]);

      // Recent Activity (latest 5 receipts + deliveries combined)
      const { data: rActivity } = await supabase.from('receipts').select('id, date, supplier, status, receipt_items(quantity, products(name))').order('date', { ascending: false }).limit(3);
      const { data: dActivity } = await supabase.from('deliveries').select('id, date, customer, status, quantity, products(name)').order('date', { ascending: false }).limit(3);
      const activities = [
        ...(rActivity || []).map(r => ({ type: 'receipt', date: r.date, label: `Receipt from ${r.supplier}`, detail: `+${r.receipt_items?.[0]?.quantity || 0} ${r.receipt_items?.[0]?.products?.name || ''}`, status: r.status })),
        ...(dActivity || []).map(d => ({ type: 'delivery', date: d.date, label: `Delivery to ${d.customer}`, detail: `-${d.quantity} ${d.products?.name || ''}`, status: d.status })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      setRecentActivity(activities);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Clay classes that adapt to dark/light
  const clay = isDark
    ? 'bg-slate-800/80 shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.03),inset_2px_2px_4px_rgba(255,255,255,0.05)] border border-slate-700/50'
    : 'bg-white shadow-[8px_8px_20px_#d1d1d6,-8px_-8px_20px_#ffffff,inset_3px_3px_6px_rgba(255,255,255,0.5),inset_-3px_-3px_6px_rgba(0,0,0,0.04)] border border-white/40';

  const clayInset = isDark
    ? 'bg-slate-900/60 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.03)]'
    : 'bg-[#f6f6f8] shadow-[inset_4px_4px_10px_#d1d1d6,inset_-4px_-4px_10px_#ffffff]';

  const clayPrimary = 'bg-[#4030e8] shadow-[6px_6px_12px_rgba(64,48,232,0.3),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]';

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const kpis = [
    { title: 'Total Products', value: stats.totalProducts, icon: FiBox, color: 'text-[#4030e8]', trend: '+12.5%', trendUp: true },
    { title: 'Low Stock', value: stats.lowStock, icon: FiAlertTriangle, color: 'text-orange-500', trend: stats.lowStock > 0 ? 'Alert' : 'OK', trendUp: false },
    { title: 'Out of Stock', value: stats.outOfStock, icon: FiXCircle, color: 'text-red-500', trend: stats.outOfStock > 0 ? 'Critical' : 'Clear', trendUp: false },
    { title: 'Total Stock', value: stats.stockValue.toLocaleString(), icon: FiDollarSign, color: 'text-blue-500', trend: '+8.1%', trendUp: true },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Dashboard" />

        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          {/* Welcome Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-3xl font-extrabold tracking-tight ${textPrimary}`}>
                Inventory Dashboard
              </h2>
              <p className={`${textSecondary} font-medium mt-1`}>
                Welcome back, {profile?.name || 'User'}. Here's what's happening today.
              </p>
            </div>
            <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold ${clayInset} text-[#4030e8]`}>
              <span className="w-2 h-2 rounded-full bg-[#4030e8] animate-pulse"></span>
              Live Sync
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => (
              <div key={i} className={`${clay} p-6 rounded-3xl flex flex-col gap-3 transition-transform hover:scale-[1.02]`}>
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 ${clayInset} rounded-2xl flex items-center justify-center ${kpi.color}`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    kpi.trendUp
                      ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600')
                      : kpi.trend === 'Critical'
                        ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')
                        : kpi.trend === 'Alert'
                          ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600')
                          : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
                  }`}>
                    {kpi.trendUp && <FiArrowUpRight className="inline w-3 h-3 mr-0.5" />}
                    {!kpi.trendUp && kpi.trend !== 'OK' && kpi.trend !== 'Clear' && <FiArrowDownRight className="inline w-3 h-3 mr-0.5" />}
                    {kpi.trend}
                  </span>
                </div>
                <div>
                  <p className={`${textSecondary} text-sm font-bold uppercase tracking-wider mb-1`}>{kpi.title}</p>
                  <p className={`text-3xl font-extrabold ${textPrimary}`}>{loading ? '...' : kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row: Stock Trends (2/3) + Recent Activity (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stock Trends Chart */}
            <div className={`lg:col-span-2 ${clay} p-8 rounded-[2rem]`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-xl font-extrabold ${textPrimary}`}>Stock Trends</h3>
                  <p className={`${textSecondary} text-sm`}>Monthly inventory movement overview</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-4 py-2 ${clayInset} rounded-xl text-xs font-bold text-[#4030e8]`}>Inbound</span>
                  <span className={`px-4 py-2 text-xs font-bold ${textSecondary}`}>Outbound</span>
                </div>
              </div>
              <div className={`h-64 w-full ${clayInset} rounded-2xl p-4`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stockTrend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4030e8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4030e8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#fff' : '#1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                    <Area type="monotone" dataKey="inbound" stroke="#4030e8" strokeWidth={3} fill="url(#inboundGrad)" name="Inbound" dot={{ r: 4, fill: '#4030e8', stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="outbound" stroke="#8b5cf6" strokeWidth={2} fill="url(#outboundGrad)" name="Outbound" strokeDasharray="6 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`${clay} p-8 rounded-[2rem]`}>
              <h3 className={`text-xl font-extrabold mb-6 ${textPrimary}`}>Recent Activity</h3>
              <div className="flex flex-col gap-5">
                {recentActivity.length === 0 && !loading && (
                  <p className={`${textSecondary} text-sm text-center py-8`}>No recent activity</p>
                )}
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className={`w-10 h-10 ${clayInset} rounded-xl flex items-center justify-center flex-shrink-0 ${
                      a.type === 'receipt' ? 'text-green-500' : 'text-blue-500'
                    }`}>
                      {a.type === 'receipt' ? <FiPackage className="w-[18px] h-[18px]" /> : <FiTruck className="w-[18px] h-[18px]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${textPrimary}`}>{a.label}</p>
                      <p className={`text-xs ${textSecondary}`}>{timeAgo(a.date)}</p>
                    </div>
                    <p className={`text-xs font-extrabold flex-shrink-0 ${a.type === 'receipt' ? 'text-green-500' : 'text-blue-500'}`}>
                      {a.detail}
                    </p>
                  </div>
                ))}
                <button className={`mt-2 w-full py-3.5 ${clayInset} rounded-2xl text-[#4030e8] font-bold text-sm hover:opacity-80 transition-opacity`}>
                  View All Activity
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Top Products + Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Items */}
            <div className={`${clay} rounded-[2rem] p-8`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-extrabold ${textPrimary}`}>Top Products by Stock</h3>
              </div>
              <div className={`overflow-hidden rounded-2xl ${clayInset}`}>
                <table className="w-full text-left">
                  <thead className={isDark ? 'border-b border-slate-700/50' : 'border-b border-slate-200 bg-slate-50/50'}>
                    <tr>
                      <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Product</th>
                      <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Stock</th>
                      <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Warehouse</th>
                    </tr>
                  </thead>
                  <tbody className={isDark ? 'divide-y divide-slate-700/50' : 'divide-y divide-slate-100'}>
                    {topProducts.map((p, i) => (
                      <tr key={i} className={isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                        <td className={`px-6 py-4 font-bold text-sm ${textPrimary}`}>
                          {p.name}
                          <span className={`block text-xs font-normal ${textSecondary}`}>{p.sku}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-extrabold text-[#4030e8]">{p.stock} units</td>
                        <td className={`px-6 py-4 text-sm ${textSecondary}`}>{p.warehouse}</td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && (
                      <tr><td colSpan="3" className={`px-6 py-8 text-center text-sm ${textSecondary}`}>No products yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Distribution */}
            <div className={`${clay} rounded-[2rem] p-8 flex flex-col`}>
              <h3 className={`text-xl font-extrabold mb-4 ${textPrimary}`}>Stock by Category</h3>
              <div className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, borderRadius: '12px', color: isDark ? '#fff' : '#1e293b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Quick Stats */}
              <div className={`mt-4 grid grid-cols-3 gap-3`}>
                <div className={`${clayInset} rounded-xl p-3 text-center`}>
                  <p className={`text-lg font-extrabold ${textPrimary}`}>{stats.pendingReceipts}</p>
                  <p className={`text-xs font-bold ${textSecondary}`}>Pending Receipts</p>
                </div>
                <div className={`${clayInset} rounded-xl p-3 text-center`}>
                  <p className={`text-lg font-extrabold ${textPrimary}`}>{stats.pendingDeliveries}</p>
                  <p className={`text-xs font-bold ${textSecondary}`}>Active Deliveries</p>
                </div>
                <div className={`${clayInset} rounded-xl p-3 text-center`}>
                  <p className={`text-lg font-extrabold ${textPrimary}`}>{stats.totalTransfers}</p>
                  <p className={`text-xs font-bold ${textSecondary}`}>Transfers</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
