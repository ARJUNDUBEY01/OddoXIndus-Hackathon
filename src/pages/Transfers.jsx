import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ledger } from '../blockchain/Blockchain';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { FiPlus, FiArrowRight, FiDownload, FiRepeat } from 'react-icons/fi';
import { exportToCSV } from '../utils/csvExport';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const { isDark } = useTheme();
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchTransfers();
    fetchProducts();
    ledger.initialize();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transfers')
      .select('*, products(name, sku)')
      .order('date', { ascending: false });
      
    if (!error) setTransfers(data || []);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, sku, warehouse, stock');
    setProducts(data || []);
    if (data && data.length > 0) {
      setSelectedProductId(data[0].id);
      setFromLocation(data[0].warehouse);
      const wSet = new Set(data.filter(p => p.warehouse).map(p => p.warehouse));
      const { data: tData } = await supabase.from('transfers').select('from_location, to_location');
      (tData || []).forEach(t => { if (t.from_location) wSet.add(t.from_location); if (t.to_location) wSet.add(t.to_location); });
      setLocations(Array.from(wSet));
    }
  };

  const handleProductChange = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) setFromLocation(prod.warehouse);
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;
    if (fromLocation === toLocation) {
        toast.error('Destination must be different from source.');
        return;
    }

    const activeProduct = products.find(p => p.id === selectedProductId);
    if (!activeProduct || activeProduct.stock < quantity) {
      toast.error(`Insufficient stock! ${activeProduct?.stock || 0} left.`);
      return;
    }

    try {
      const { data: transferData, error: tError } = await supabase
        .from('transfers')
        .insert([{ product_id: selectedProductId, from_location: fromLocation, to_location: toLocation, quantity }])
        .select()
        .single();
      if (tError) throw tError;

      const { error: pError } = await supabase
        .from('products')
        .update({ warehouse: toLocation })
        .eq('id', selectedProductId);
      if (pError) throw pError;

      await ledger.addBlock({
        action: 'TRANSFER',
        transfer_id: transferData.id,
        product_id: selectedProductId,
        product_name: activeProduct.name,
        quantity: quantity,
        from: fromLocation,
        to: toLocation,
      });

      toast.success('Transfer recorded & Inventory Updated!');
      setShowModal(false);
      setQuantity(1);
      setToLocation('');
      fetchTransfers();
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Error creating transfer');
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Internal Transfers" />
        
        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>Stock Transfers</h1>
              <p className={`text-lg font-medium ${textSecondary}`}>Track inventory movements between locations.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToCSV(transfers.map(t => ({ date: new Date(t.date).toLocaleDateString(), product: t.products?.name || '', sku: t.products?.sku || '', from: t.from_location, to: t.to_location, quantity: t.quantity })), 'transfers')}
                className={`clay-button-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95`}
              >
                <FiDownload /> CSV Export
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="clay-button-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-transform active:scale-95 bg-blue-500 shadow-[6px_6px_12px_rgba(59,130,246,0.2),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]"
              >
                <FiPlus className="text-xl" /> Relocate Stock
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
                    <th className="px-6 py-2">Movement Path</th>
                    <th className="px-6 py-2 text-right">Qty Moved</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className={`p-8 text-center ${textSecondary} font-bold`}>Loading transfers...</td></tr>
                  ) : transfers.length === 0 ? (
                    <tr><td colSpan="4" className={`p-8 text-center ${textSecondary} font-bold`}>No transfers found.</td></tr>
                  ) : (
                    transfers.map(t => {
                      const prod = t.products || {};
                      
                      return (
                        <tr key={t.id} className="clay-button-secondary group hover:scale-[1.005] transition-transform">
                          <td className={`px-6 py-4 rounded-l-2xl font-medium ${textPrimary}`}>
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl clay-input flex items-center justify-center flex-shrink-0">
                                <FiRepeat className="text-blue-500" />
                              </div>
                              {new Date(t.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-bold ${textPrimary}`}>
                            {prod.name}
                            <span className={`block text-xs font-normal italic ${textSecondary}`}>{prod.sku}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 text-sm font-bold">
                              <span className="px-4 py-2 clay-input rounded-xl text-slate-500">{t.from_location}</span>
                              <FiArrowRight className="text-blue-500 text-lg" />
                              <span className="px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">{t.to_location}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 rounded-r-2xl text-right font-extrabold text-blue-500 text-lg">
                            {t.quantity}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className={`mt-6 flex justify-between items-center px-4 ${textSecondary}`}>
              <p className="font-medium text-sm">Showing {transfers.length} records</p>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
          <div className={`clay-card w-full max-w-xl p-8 rounded-[2rem] ${isDark ? '' : 'border border-white'}`}>
            <h3 className={`text-2xl font-extrabold mb-8 ${textPrimary}`}>Transfer Stock</h3>
            <form onSubmit={handleCreateTransfer} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Product</label>
                <select value={selectedProductId} onChange={handleProductChange} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none appearance-none`}>
                  {products.map(p => <option key={p.id} value={p.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>{p.name} ({p.stock} available in {p.warehouse})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Source</label>
                  <input type="text" value={fromLocation} disabled className={`w-full px-5 py-4 clay-input rounded-2xl ${textSecondary} bg-black/5 dark:bg-black/20 font-bold opacity-60 cursor-not-allowed outline-none`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Destination</label>
                  <input required type="text" list="locations-list" value={toLocation} onChange={e => setToLocation(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} placeholder="New warehouse..." />
                  <datalist id="locations-list">{locations.filter(l => l !== fromLocation).map(l => <option key={l} value={l} />)}</datalist>
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Quantity mapped</label>
                <input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} font-mono outline-none`} />
              </div>
              
              <div className="flex gap-4 justify-end mt-8 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`clay-button-secondary px-8 py-4 rounded-2xl font-bold transition-transform active:scale-95`}>Cancel</button>
                <button type="submit" className="clay-button-primary bg-blue-500 px-8 py-4 rounded-2xl text-white font-bold transition-transform active:scale-95 shadow-[6px_6px_12px_rgba(59,130,246,0.3),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]">Execute Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
