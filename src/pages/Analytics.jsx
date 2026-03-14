import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiActivity, FiTrendingUp, FiPieChart, FiMapPin } from 'react-icons/fi';

export default function Analytics() {
  const [stockTrend, setStockTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [warehouseUsage, setWarehouseUsage] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { isDark } = useTheme();

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);

    const { data: pData } = await supabase.from('products').select('*');
    if (pData) {
      const top = [...pData].sort((a, b) => b.stock - a.stock).slice(0, 10);
      setTopProducts(top.map(p => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
        stock: p.stock,
        reorder: p.reorder_level,
      })));

      const wMap = {};
      pData.forEach(p => { wMap[p.warehouse] = (wMap[p.warehouse] || 0) + p.stock; });
      setWarehouseUsage(Object.entries(wMap).map(([name, value]) => ({ name, value })));
    }

    const { data: rData } = await supabase.from('receipts').select('date, receipt_items(quantity)');
    const { data: dData } = await supabase.from('deliveries').select('date, quantity');

    const trendMap = {};
    (rData || []).forEach(r => {
      const d = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const qty = (r.receipt_items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
      if (!trendMap[d]) trendMap[d] = { name: d, received: 0, delivered: 0 };
      trendMap[d].received += qty;
    });
    (dData || []).forEach(d => {
      const dt = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!trendMap[dt]) trendMap[dt] = { name: dt, received: 0, delivered: 0 };
      trendMap[dt].delivered += d.quantity;
    });
    setStockTrend(Object.values(trendMap));

    const { data: tData } = await supabase.from('transfers').select('from_location, to_location, quantity');
    const locMap = {};
    (tData || []).forEach(t => {
      locMap[t.from_location] = (locMap[t.from_location] || 0) + t.quantity;
      locMap[t.to_location] = (locMap[t.to_location] || 0) + t.quantity;
    });
    const { data: recData } = await supabase.from('receipts').select('warehouse');
    const { data: delData } = await supabase.from('deliveries').select('warehouse');
    (recData || []).forEach(r => { locMap[r.warehouse] = (locMap[r.warehouse] || 0) + 1; });
    (delData || []).forEach(d => { locMap[d.warehouse] = (locMap[d.warehouse] || 0) + 1; });

    const maxActivity = Math.max(...Object.values(locMap), 1);
    const heatData = Object.entries(locMap)
      .map(([name, count]) => ({ name, count, intensity: count / maxActivity }))
      .sort((a, b) => b.count - a.count);
    setHeatmapData(heatData);

    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`clay-card p-4 rounded-xl shadow-xl text-sm ${isDark ? '' : 'border border-slate-200 bg-white/90 backdrop-blur'}`}>
          <p className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: entry.color }}></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{entry.name}:</span>
              </div>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getHeatColor = (intensity) => {
    if (intensity > 0.8) return 'bg-rose-500';
    if (intensity > 0.6) return 'bg-orange-500';
    if (intensity > 0.4) return 'bg-amber-500';
    if (intensity > 0.2) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Advanced Analytics" />

        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>Analytics Engine</h1>
            <p className={`text-lg font-medium ${textSecondary}`}>Real-time insights across your logistics network.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-20">
              <span className="animate-spin h-10 w-10 border-4 border-slate-400/20 border-t-[#4030e8] rounded-full"></span>
            </div>
          ) : (
            <>
              {/* Row 1: Movement Trend + Warehouse Usage */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="clay-card rounded-[2rem] p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="size-12 rounded-xl clay-input flex items-center justify-center">
                      <FiTrendingUp className="text-emerald-500 text-xl" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${textPrimary}`}>Receipts vs Deliveries</h3>
                      <p className={`text-sm font-medium ${textSecondary}`}>Movement trends over time</p>
                    </div>
                  </div>
                  <div className="h-[320px] w-full mt-4">
                    {stockTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stockTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                          <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridColor, strokeWidth: 2 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 600, color: textSecondary }} />
                          <Line type="monotone" dataKey="received" name="Received" stroke="#10b981" strokeWidth={4} dot={{ strokeWidth: 3, r: 5, fill: isDark ? '#0f172a' : '#fff' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }} />
                          <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#8b5cf6" strokeWidth={4} dot={{ strokeWidth: 3, r: 5, fill: isDark ? '#0f172a' : '#fff' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#8b5cf6' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={`h-full flex items-center justify-center font-bold ${textSecondary}`}>No movement data yet</div>
                    )}
                  </div>
                </div>

                <div className="clay-card rounded-[2rem] p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="size-12 rounded-xl clay-input flex items-center justify-center">
                      <FiPieChart className="text-blue-500 text-xl" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${textPrimary}`}>Stock by Warehouse</h3>
                      <p className={`text-sm font-medium ${textSecondary}`}>Distribution across network</p>
                    </div>
                  </div>
                  <div className="h-[320px] w-full flex items-center justify-center">
                    {warehouseUsage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={warehouseUsage} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={6} dataKey="value" stroke="none"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={{ stroke: axisColor, strokeWidth: 1 }}
                          >
                            {warehouseUsage.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))' }} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={`h-full flex items-center justify-center font-bold ${textSecondary}`}>No warehouse data</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Top Products */}
              <div className="clay-card rounded-[2rem] p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="size-12 rounded-xl clay-input flex items-center justify-center">
                    <FiActivity className="text-pink-500 text-xl" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${textPrimary}`}>Top Products by Volume</h3>
                    <p className={`text-sm font-medium ${textSecondary}`}>Highest stocked entries</p>
                  </div>
                </div>
                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical" barGap={0} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={true} vertical={false} />
                      <XAxis type="number" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke={axisColor} fontSize={12} fontWeight={600} tickLine={false} axisLine={false} width={160} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 600, color: textSecondary }} />
                      <Bar dataKey="stock" name="Current Stock" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                      <Bar dataKey="reorder" name="Reorder Level" fill="#ef4444" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 3: Warehouse Activity Heatmap */}
              <div className="clay-card rounded-[2rem] p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="size-12 rounded-xl clay-input flex items-center justify-center">
                    <FiMapPin className="text-amber-500 text-xl" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${textPrimary}`}>Warehouse Activity Intensity</h3>
                    <p className={`text-sm font-medium ${textSecondary}`}>Overall footprint from transfers and orders</p>
                  </div>
                </div>
                {heatmapData.length > 0 ? (
                  <div className="space-y-5 px-2">
                    {heatmapData.map((loc, idx) => (
                      <div key={idx} className="flex items-center gap-6">
                        <span className={`w-36 text-sm font-bold text-right truncate ${textPrimary}`}>{loc.name}</span>
                        <div className="flex-1 clay-input rounded-full h-10 overflow-hidden relative p-1">
                          <div
                            className={`h-full ${getHeatColor(loc.intensity)} rounded-full transition-all duration-1000 flex items-center justify-end pr-4 shadow-[4px_0_12px_rgba(0,0,0,0.2)]`}
                            style={{ width: `${Math.max(loc.intensity * 100, 10)}%` }}
                          >
                            <span className="text-sm font-black text-white drop-shadow-md">{loc.count}</span>
                          </div>
                        </div>
                        <span className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full w-28 text-center ${
                          loc.intensity > 0.7 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                          loc.intensity > 0.4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {loc.intensity > 0.7 ? 'High' : loc.intensity > 0.4 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                    ))}
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-slate-700/20 dark:border-slate-700/50">
                      <span className={`text-sm font-bold ${textSecondary}`}>Activity Heat:</span>
                      {['Low', 'Medium', 'High'].map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full shadow-inner ${['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'][i]}`}></span>
                          <span className={`text-sm font-bold ${textSecondary}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-16 font-bold ${textSecondary}`}>No activity footprint detected</div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
