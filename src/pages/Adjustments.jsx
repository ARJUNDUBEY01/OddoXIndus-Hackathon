import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ledger } from '../blockchain/Blockchain';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { FiPlus, FiSettings, FiDownload, FiSliders } from 'react-icons/fi';
import { exportToCSV } from '../utils/csvExport';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const { isDark } = useTheme();
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [location, setLocation] = useState('');
  const [systemStock, setSystemStock] = useState(0);
  const [countedStock, setCountedStock] = useState(0);
  const [reason, setReason] = useState('recount');

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
    ledger.initialize();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('adjustments')
      .select('*, products(name, sku)')
      .order('date', { ascending: false });
      
    if (!error) setAdjustments(data || []);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, sku, warehouse, stock');
    setProducts(data || []);
    if (data && data.length > 0) {
      setSelectedProductId(data[0].id);
      setLocation(data[0].warehouse);
      setSystemStock(data[0].stock);
      setWarehouses(Array.from(new Set(data.filter(p => p.warehouse).map(p => p.warehouse))));
    }
  };

  const handleProductChange = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setLocation(prod.warehouse);
      setSystemStock(prod.stock);
    }
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const difference = countedStock - systemStock;
    if (difference === 0) {
      toast.error('Counted stock matches system stock. No adjustment needed.');
      return;
    }

    try {
      const activeProduct = products.find(p => p.id === selectedProductId);

      const { data: adjData, error: aError } = await supabase
        .from('adjustments')
        .insert([{ product_id: selectedProductId, location, system_stock: systemStock, counted_stock: countedStock, difference, reason }])
        .select()
        .single();
      if (aError) throw aError;

      const { error: pError } = await supabase.from('products').update({ stock: countedStock }).eq('id', selectedProductId);
      if (pError) throw pError;

      await ledger.addBlock({
        action: 'ADJUSTMENT', adjustment_id: adjData.id, product_id: selectedProductId, product_name: activeProduct.name, system_stock: systemStock, counted_stock: countedStock, difference: difference, reason: reason,
      });

      toast.success(`Inventory Adjusted by ${difference > 0 ? '+' : ''}${difference}`);
      setShowModal(false);
      setCountedStock(0);
      setReason('recount');
      fetchAdjustments();
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Error creating adjustment');
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Inventory Adjustments" />
        
        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>Stock Adjustments</h1>
              <p className={`text-lg font-medium ${textSecondary}`}>Calibrate system stock with physical counts.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToCSV(adjustments.map(a => ({ date: new Date(a.date).toLocaleDateString(), product: a.products?.name || '', location: a.location, system_stock: a.system_stock, counted_stock: a.counted_stock, difference: a.difference, reason: a.reason })), 'adjustments')}
                className={`clay-button-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95`}
              >
                <FiDownload /> CSV Export
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="clay-button-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-transform active:scale-95 bg-amber-500 shadow-[6px_6px_12px_rgba(245,158,11,0.2),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]"
              >
                <FiSettings className="text-xl" /> Adjust Stock
              </button>
            </div>
          </div>

          <div className="clay-card rounded-[2rem] p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                    <th className="px-6 py-2">Date</th>
                    <th className="px-6 py-2">Product</th>
                    <th className="px-6 py-2">Reason</th>
                    <th className="px-6 py-2">System → Counted</th>
                    <th className="px-6 py-2 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className={`p-8 text-center ${textSecondary} font-bold`}>Loading adjustments...</td></tr>
                  ) : adjustments.length === 0 ? (
                    <tr><td colSpan="5" className={`p-8 text-center ${textSecondary} font-bold`}>No adjustments found.</td></tr>
                  ) : (
                    adjustments.map(a => {
                      const prod = a.products || {};
                      const isPositive = a.difference > 0;
                      
                      return (
                        <tr key={a.id} className="clay-button-secondary group hover:scale-[1.005] transition-transform">
                          <td className={`px-6 py-4 rounded-l-2xl font-medium ${textPrimary}`}>
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl clay-input flex items-center justify-center flex-shrink-0">
                                <FiSliders className="text-amber-500" />
                              </div>
                              {new Date(a.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-bold ${textPrimary}`}>
                            {prod.name}
                            <span className={`block text-xs font-normal italic ${textSecondary}`}>{a.location}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight inline-block whitespace-nowrap bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300`}>
                              {a.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 text-sm font-bold">
                              <span className={`px-3 py-1.5 clay-input rounded-xl ${textSecondary}`}>{a.system_stock}</span>
                              <span className="text-slate-400">→</span>
                              <span className={`px-3 py-1.5 clay-input rounded-xl ${textPrimary}`}>{a.counted_stock}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 rounded-r-2xl text-right font-extrabold text-lg ${isPositive ? 'text-green-500' : 'text-rose-500'}`}>
                            {isPositive ? '+' : ''}{a.difference}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className={`mt-6 flex justify-between items-center px-4 ${textSecondary}`}>
              <p className="font-medium text-sm">Showing {adjustments.length} records</p>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
          <div className={`clay-card w-full max-w-xl p-8 rounded-[2rem] ${isDark ? '' : 'border border-white'}`}>
            <h3 className={`text-2xl font-extrabold mb-8 ${textPrimary}`}>Inventory Calibration</h3>
            <form onSubmit={handleCreateAdjustment} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Select Product</label>
                <select value={selectedProductId} onChange={handleProductChange} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none appearance-none`}>
                  {products.map(p => <option key={p.id} value={p.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>System Expected Stock</label>
                  <input type="number" value={systemStock} disabled className={`w-full px-5 py-4 clay-input rounded-2xl ${textSecondary} bg-black/5 dark:bg-black/20 font-bold opacity-60 cursor-not-allowed outline-none`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 text-rose-500`}>Actual Physical Count</label>
                  <input required type="number" min="0" value={countedStock} onChange={e => setCountedStock(parseInt(e.target.value) || 0)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} font-bold text-lg outline-none focus:ring-2 focus:ring-amber-500/50`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Warehouse / Location</label>
                <input required type="text" list="adj-warehouses-list" value={location} onChange={e => setLocation(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} />
                <datalist id="adj-warehouses-list">{warehouses.map(w => <option key={w} value={w} />)}</datalist>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Reason for Variance</label>
                <select value={reason} onChange={e => setReason(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none appearance-none`}>
                  <option value="recount" className={isDark ? 'bg-slate-800' : 'bg-white'}>Routine Recount / Audit</option>
                  <option value="damaged" className={isDark ? 'bg-slate-800' : 'bg-white'}>Damaged Goods</option>
                  <option value="lost" className={isDark ? 'bg-slate-800' : 'bg-white'}>Lost / Missing</option>
                  <option value="stolen" className={isDark ? 'bg-slate-800' : 'bg-white'}>Theft / Stolen</option>
                </select>
              </div>
              
              <div className={`mt-6 p-5 clay-inset rounded-2xl flex justify-between items-center ${textPrimary}`}>
                <span className="font-bold">Net Difference:</span>
                <span className={`text-2xl font-black ${countedStock - systemStock > 0 ? 'text-green-500' : countedStock - systemStock < 0 ? 'text-rose-500' : textSecondary}`}>
                  {countedStock - systemStock > 0 ? '+' : ''}{countedStock - systemStock}
                </span>
              </div>

              <div className="flex gap-4 justify-end mt-8 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`clay-button-secondary px-8 py-4 rounded-2xl font-bold transition-transform active:scale-95`}>Cancel</button>
                <button type="submit" className="clay-button-primary bg-amber-500 px-8 py-4 rounded-2xl text-white font-bold transition-transform active:scale-95 shadow-[6px_6px_12px_rgba(245,158,11,0.2),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]">Verify Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
