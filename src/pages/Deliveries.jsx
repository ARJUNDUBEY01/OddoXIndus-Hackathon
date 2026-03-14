import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ledger } from '../blockchain/Blockchain';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { FiSend, FiPackage, FiTruck, FiCheckCircle, FiPlus, FiBox, FiDownload } from 'react-icons/fi';
import { fireConfetti } from '../utils/confetti';
import { exportToCSV } from '../utils/csvExport';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const { isDark } = useTheme();
  
  const [customer, setCustomer] = useState('');
  const [warehouse, setWarehouse] = useState('Main');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchDeliveries();
    fetchProducts();
    ledger.initialize();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, products(name, sku)')
      .order('date', { ascending: false });
      
    if (!error) {
      setDeliveries(data || []);
      if (data) setCustomers(Array.from(new Set(data.filter(d => d.customer).map(d => d.customer))));
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, sku, stock, warehouse');
    setProducts(data || []);
    if (data && data.length > 0) {
      setSelectedProductId(data[0].id);
      setWarehouses(Array.from(new Set(data.filter(p => p.warehouse).map(p => p.warehouse))));
    }
  };

  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    const activeProduct = products.find(p => p.id === selectedProductId);
    if (!activeProduct || activeProduct.stock < quantity) {
      toast.error(`Insufficient stock! Only ${activeProduct?.stock || 0} available.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('deliveries')
        .insert([{ customer, product_id: selectedProductId, quantity, warehouse, status: 'pending' }]);
      if (error) throw error;

      toast.success('Delivery order drafted.');
      setShowModal(false);
      setCustomer('');
      setQuantity(1);
      fetchDeliveries();
    } catch (error) {
      toast.error(error.message || 'Error creating delivery');
    }
  };

  const advanceStatus = async (deliveryId, currentStatus, productId, qty) => {
    const nextStatusMap = { 'pending': 'picking', 'picking': 'packed', 'packed': 'delivered' };
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    try {
      if (nextStatus === 'delivered') {
        const { data: pData } = await supabase.from('products').select('stock, name').eq('id', productId).single();
        const newStock = (pData?.stock || 0) - Number(qty);
        if (newStock < 0) throw new Error('Cannot deliver! Stock would go below zero.');

        await supabase.from('products').update({ stock: newStock }).eq('id', productId);
        await ledger.addBlock({ action: 'DELIVERY', delivery_id: deliveryId, product_id: productId, product_name: pData?.name, quantity_delivered: qty, new_total_stock: newStock });
      }

      const { error } = await supabase.from('deliveries').update({ status: nextStatus }).eq('id', deliveryId);
      if (error) throw error;

      toast.success(`Delivery advanced to ${nextStatus}`);
      if (nextStatus === 'delivered') fireConfetti();
      fetchDeliveries();
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Error updating status');
    }
  };

  const statusColors = {
    'pending': 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
    'picking': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    'packed': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    'delivered': 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Outgoing Deliveries" />
        
        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>Delivery Orders</h1>
              <p className={`text-lg font-medium ${textSecondary}`}>Track and fulfill outbound inventory.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToCSV(deliveries.map(d => ({ date: new Date(d.date).toLocaleDateString(), customer: d.customer, product: d.products?.name || '', sku: d.products?.sku || '', quantity: d.quantity, warehouse: d.warehouse, status: d.status })), 'deliveries')}
                className={`clay-button-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95`}
              >
                <FiDownload /> CSV Export
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="clay-button-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-transform active:scale-95 bg-purple-600 shadow-[6px_6px_12px_rgba(147,51,234,0.3),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]"
              >
                <FiPlus className="text-xl" /> New Order
              </button>
            </div>
          </div>

          <div className="clay-card rounded-[2rem] p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                    <th className="px-6 py-2">Date</th>
                    <th className="px-6 py-2">Customer</th>
                    <th className="px-6 py-2">Product</th>
                    <th className="px-6 py-2">Qty</th>
                    <th className="px-6 py-2">Status</th>
                    <th className="px-6 py-2 text-right">Advance Step</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className={`p-8 text-center ${textSecondary} font-bold`}>Loading deliveries...</td></tr>
                  ) : deliveries.length === 0 ? (
                    <tr><td colSpan="6" className={`p-8 text-center ${textSecondary} font-bold`}>No deliveries found.</td></tr>
                  ) : (
                    deliveries.map(d => {
                      const prod = d.products || {};
                      
                      return (
                        <tr key={d.id} className="clay-button-secondary group hover:scale-[1.005] transition-transform">
                          <td className={`px-6 py-4 rounded-l-2xl font-medium ${textPrimary}`}>
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl clay-input flex items-center justify-center flex-shrink-0">
                                <FiSend className="text-purple-500" />
                              </div>
                              {new Date(d.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-bold ${textSecondary}`}>{d.customer}</td>
                          <td className={`px-6 py-4 font-bold ${textPrimary}`}>
                            {prod.name}
                            <span className={`block text-xs font-normal italic ${textSecondary}`}>{prod.sku}</span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-purple-500 text-lg">-{d.quantity}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight inline-block whitespace-nowrap ${statusColors[d.status] || ''}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 rounded-r-2xl text-right">
                            {d.status !== 'delivered' && (
                              <button 
                                onClick={() => advanceStatus(d.id, d.status, d.product_id, d.quantity)}
                                className={`flex items-center gap-2 ml-auto px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-500/20 active:scale-95`}
                              >
                                {d.status === 'pending' && <FiPackage />}
                                {d.status === 'picking' && <FiBox />}
                                {d.status === 'packed' && <FiTruck />}
                                <span className="capitalize">{d.status === 'pending' ? 'Start Picking' : d.status === 'picking' ? 'Pack Order' : 'Deliver'}</span>
                              </button>
                            )}
                            {d.status === 'delivered' && (
                              <span className="flex items-center justify-end gap-1 text-green-500 font-bold text-sm">
                                <FiCheckCircle /> Complete
                              </span>
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
              <p className="font-medium text-sm">Showing {deliveries.length} orders</p>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
          <div className={`clay-card w-full max-w-xl p-8 rounded-[2rem] ${isDark ? '' : 'border border-white'}`}>
            <h3 className={`text-2xl font-extrabold mb-8 ${textPrimary}`}>Draft New Delivery</h3>
            <form onSubmit={handleCreateDelivery} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Customer Name</label>
                <input required type="text" list="customers-list" value={customer} onChange={e => setCustomer(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} placeholder="e.g. Retail Corp" />
                <datalist id="customers-list">{customers.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Product</label>
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none appearance-none`}>
                  {products.map(p => <option key={p.id} value={p.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Quantity</label>
                  <input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} font-mono outline-none`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Warehouse</label>
                  <input required type="text" list="del-warehouses-list" value={warehouse} onChange={e => setWarehouse(e.target.value)} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} />
                  <datalist id="del-warehouses-list">{warehouses.map(w => <option key={w} value={w} />)}</datalist>
                </div>
              </div>
              <div className="flex gap-4 justify-end mt-8 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`clay-button-secondary px-8 py-4 rounded-2xl font-bold transition-transform active:scale-95`}>Cancel</button>
                <button type="submit" className="clay-button-primary bg-purple-600 px-8 py-4 rounded-2xl text-white font-bold transition-transform active:scale-95 shadow-[6px_6px_12px_rgba(147,51,234,0.3),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]">Draft Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
