import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ledger } from '../blockchain/Blockchain';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { FiPlus, FiCheckCircle, FiDownload, FiTruck, FiPackage } from 'react-icons/fi';
import { exportToCSV } from '../utils/csvExport';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const { isDark } = useTheme();
  
  const [supplier, setSupplier] = useState('');
  const [warehouse, setWarehouse] = useState('Main');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchReceipts();
    fetchProducts();
    ledger.initialize();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    const { data: rData, error: rError } = await supabase
      .from('receipts')
      .select('*, receipt_items(product_id, quantity, products(name, sku))')
      .order('date', { ascending: false });
      
    if (!rError) setReceipts(rData || []);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, sku, warehouse');
    setProducts(data || []);
    if (data && data.length > 0) {
      setSelectedProductId(data[0].id);
      const wSet = new Set(data.filter(p => p.warehouse).map(p => p.warehouse));
      setWarehouses(Array.from(wSet));
    }
    const { data: recData } = await supabase.from('receipts').select('supplier');
    if (recData) {
      const sSet = new Set(recData.filter(r => r.supplier).map(r => r.supplier));
      setSuppliers(Array.from(sSet));
    }
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    try {
      const { data: receiptData, error: rError } = await supabase
        .from('receipts')
        .insert([{ supplier, warehouse, status: 'pending' }])
        .select()
        .single();
      if (rError) throw rError;

      const { error: iError } = await supabase
        .from('receipt_items')
        .insert([{ receipt_id: receiptData.id, product_id: selectedProductId, quantity }]);
      if (iError) throw iError;

      toast.success('Receipt drafted. Please confirm to receive.');
      setShowModal(false);
      setSupplier('');
      setQuantity(1);
      fetchReceipts();
    } catch (error) {
      toast.error(error.message || 'Error creating receipt');
    }
  };

  const handleConfirm = async (receiptId, productId, qty) => {
    try {
      const { data: pData } = await supabase.from('products').select('stock, name').eq('id', productId).single();
      const newStock = (pData?.stock || 0) + Number(qty);

      const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      if (updateError) throw updateError;

      const { error: confError } = await supabase.from('receipts').update({ status: 'confirmed' }).eq('id', receiptId);
      if (confError) throw confError;

      await ledger.addBlock({
        action: 'RECEIPT',
        receipt_id: receiptId,
        product_id: productId,
        product_name: pData?.name,
        quantity_received: qty,
        new_total_stock: newStock,
      });

      toast.success('Stock received and recorded on Blockchain!');
      fetchReceipts();
    } catch (error) {
      toast.error(error.message || 'Error confirming receipt');
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Incoming Receipts" />
        
        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>Purchase Receipts</h1>
              <p className={`text-lg font-medium ${textSecondary}`}>Manage inbound stock logic and confirmation.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToCSV(receipts.map(r => {
                  const item = r.receipt_items?.[0] || {};
                  const prod = item.products || {};
                  return { date: new Date(r.date).toLocaleDateString(), supplier: r.supplier, product: prod.name || '', sku: prod.sku || '', quantity: item.quantity || 0, warehouse: r.warehouse, status: r.status };
                }), 'receipts')}
                className={`clay-button-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95`}
              >
                <FiDownload /> CSV Export
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="clay-button-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-transform active:scale-95 bg-teal-500 shadow-[6px_6px_12px_rgba(20,184,166,0.2),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]"
              >
                <FiPlus className="text-xl" /> Draft Receipt
              </button>
            </div>
          </div>

          <div className="clay-card rounded-[2rem] p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                    <th className="px-6 py-2">Date</th>
                    <th className="px-6 py-2">Supplier</th>
                    <th className="px-6 py-2">Product</th>
                    <th className="px-6 py-2">Qty</th>
                    <th className="px-6 py-2">Status</th>
                    <th className="px-6 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className={`p-8 text-center ${textSecondary} font-bold`}>Loading receipts...</td></tr>
                  ) : receipts.length === 0 ? (
                    <tr><td colSpan="6" className={`p-8 text-center ${textSecondary} font-bold`}>No receipts found.</td></tr>
                  ) : (
                    receipts.map(r => {
                      const item = r.receipt_items?.[0] || {};
                      const prod = item.products || {};
                      const isConfirmed = r.status === 'confirmed';
                      
                      return (
                        <tr key={r.id} className="clay-button-secondary group hover:scale-[1.005] transition-transform">
                          <td className={`px-6 py-4 rounded-l-2xl font-medium ${textPrimary}`}>
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl clay-input flex items-center justify-center flex-shrink-0">
                                <FiTruck className="text-teal-500" />
                              </div>
                              {new Date(r.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-bold ${textSecondary}`}>{r.supplier}</td>
                          <td className={`px-6 py-4 font-bold ${textPrimary}`}>
                            {prod.name}
                            <span className={`block text-xs font-normal italic ${textSecondary}`}>{prod.sku}</span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-teal-500 text-lg">+{item.quantity}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight inline-block whitespace-nowrap ${
                              isConfirmed ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 rounded-r-2xl text-right">
                            {!isConfirmed && (
                              <button 
                                onClick={() => handleConfirm(r.id, item.product_id, item.quantity)}
                                className={`flex items-center gap-2 ml-auto px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-teal-500/20 active:scale-95`}
                              >
                                <FiCheckCircle /> Confirm
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className={`mt-6 flex justify-between items-center px-4 ${textSecondary}`}>
              <p className="font-medium text-sm">Showing {receipts.length} receipts</p>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
          <div className={`clay-card w-full max-w-xl p-8 rounded-[2rem] ${isDark ? '' : 'border border-white'}`}>
            <h3 className={`text-2xl font-extrabold mb-8 ${textPrimary}`}>Draft New Receipt</h3>
            <form onSubmit={handleCreateReceipt} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Supplier Name</label>
                <input required type="text" list="suppliers-list" value={supplier} onChange={e => setSupplier(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} placeholder="e.g. Global Tech" />
                <datalist id="suppliers-list">{suppliers.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Product</label>
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none appearance-none`}>
                  {products.map(p => <option key={p.id} value={p.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Quantity</label>
                  <input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none font-mono`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Warehouse</label>
                  <input required type="text" list="warehouses-list" value={warehouse} onChange={e => setWarehouse(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} />
                  <datalist id="warehouses-list">{warehouses.map(w => <option key={w} value={w} />)}</datalist>
                </div>
              </div>
              <div className="flex gap-4 justify-end mt-8 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`clay-button-secondary px-8 py-4 rounded-2xl font-bold transition-transform active:scale-95`}>Cancel</button>
                <button type="submit" className="clay-button-primary bg-teal-500 px-8 py-4 rounded-2xl text-white font-bold transition-transform active:scale-95 shadow-[6px_6px_12px_rgba(20,184,166,0.2),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]">Draft Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
