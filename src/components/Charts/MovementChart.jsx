import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MovementChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchMovementData();
  }, []);

  const fetchMovementData = async () => {
    // Fetch receipts and deliveries, group by week
    const { data: receipts } = await supabase
      .from('receipts')
      .select('date, status')
      .eq('status', 'confirmed');

    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('date, status');

    // Group by week
    const weekMap = {};
    const getWeekLabel = (dateStr) => {
      const d = new Date(dateStr);
      const weekNum = Math.ceil(d.getDate() / 7);
      const month = d.toLocaleString('default', { month: 'short' });
      return `${month} W${weekNum}`;
    };

    (receipts || []).forEach(r => {
      const week = getWeekLabel(r.date);
      if (!weekMap[week]) weekMap[week] = { name: week, receipts: 0, deliveries: 0 };
      weekMap[week].receipts += 1;
    });

    (deliveries || []).forEach(d => {
      const week = getWeekLabel(d.date);
      if (!weekMap[week]) weekMap[week] = { name: week, receipts: 0, deliveries: 0 };
      weekMap[week].deliveries += 1;
    });

    const chartData = Object.values(weekMap).sort((a, b) => a.name.localeCompare(b.name));
    setData(chartData.length > 0 ? chartData : [
      { name: 'This Week', receipts: 0, deliveries: 0 }
    ]);
  };

  return (
    <div className="glass-panel p-6 border-slate-700/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Receipts vs Deliveries</h3>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="receipts" name="Receipts" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="deliveries" name="Deliveries" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
