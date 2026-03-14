import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/useRole';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiMaximize, FiMic, FiCamera, FiDownload, FiPackage } from 'react-icons/fi';
import { exportToCSV } from '../utils/csvExport';
import QRCode from 'react-qr-code';
import QRScanner from '../components/QRScanner';

export default function Products() {
  const { profile } = useAuth();
  const { can } = useRole();
  const { isDark } = useTheme();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isListening, setIsListening] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', unit: 'pcs', warehouse: 'Main', reorder_level: 10, stock: 0
  });
  const [isEditing, setIsEditing] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice search is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast('Listening...', { icon: '🎤' });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
      toast.error('Voice search failed');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleQrScan = (decodedText) => {
    setShowQrScanner(false);
    setSearchTerm(decodedText);
    toast.success('QR Code Scanned!');
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('Failed to load products');
    } else {
      setProducts(data || []);
      if (data) {
        setCategories(Array.from(new Set(data.filter(p => p.category).map(p => p.category))));
        setWarehouses(Array.from(new Set(data.filter(p => p.warehouse).map(p => p.warehouse))));
        setUnits(Array.from(new Set(data.filter(p => p.unit).map(p => p.unit))));
      }
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const { stock, ...updateData } = formData;
        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', selectedProduct.id);
        if (error) throw error;
        toast.success('Product updated!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([formData]);
        if (error) throw error;
        toast.success('Product created!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Error deleting product');
    }
  };

  const openEditModal = (product) => {
    setFormData({
      name: product.name, sku: product.sku, category: product.category, unit: product.unit,
      warehouse: product.warehouse, reorder_level: product.reorder_level, stock: product.stock
    });
    setSelectedProduct(product);
    setIsEditing(true);
    setShowModal(true);
  };

  const openNewModal = () => {
    setFormData({ name: '', sku: '', category: '', unit: 'pcs', warehouse: 'Main', reorder_level: 10, stock: 0 });
    setIsEditing(false);
    setShowModal(true);
  };

  const openQrModal = (product) => {
    setSelectedProduct(product);
    setShowQrModal(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Products" />
        
        <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
          {/* Header Area */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>Product Catalog</h1>
              <p className={`text-lg font-medium ${textSecondary}`}>Streamlined inventory management with tactile precision.</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => exportToCSV(products.map(p => ({
                  name: p.name, sku: p.sku, category: p.category, stock: p.stock, unit: p.unit, warehouse: p.warehouse, reorder_level: p.reorder_level
                })), 'products')}
                className={`clay-button-secondary flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95`}
              >
                <FiDownload /> CSV Export
              </button>
              {can('products.create') && (
                <button 
                  onClick={openNewModal}
                  className="clay-button-primary flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold transition-transform active:scale-95"
                >
                  <FiPlus className="text-xl" /> Add New Product
                </button>
              )}
            </div>
          </div>

          {/* Search & Actions Area */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 max-w-2xl relative">
              <label className="flex items-center h-14 w-full clay-input rounded-2xl px-4 gap-3 focus-within:ring-2 ring-[#4030e8]/20 transition-all">
                <FiSearch className={textSecondary} />
                <input 
                  type="text" 
                  placeholder="Search products, SKUs, or categories..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`bg-transparent border-none focus:ring-0 w-full placeholder:text-slate-400 font-medium outline-none ${textPrimary}`}
                />
              </label>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button onClick={startVoiceSearch} className={`p-2 rounded-xl transition-colors ${isListening ? 'text-red-500 animate-pulse' : textSecondary + ' hover:text-[#4030e8]'}`}>
                  <FiMic size={18} />
                </button>
                <button onClick={() => setShowQrScanner(true)} className={`p-2 rounded-xl transition-colors ${textSecondary} hover:text-[#4030e8]`}>
                  <FiCamera size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="clay-card rounded-[2rem] p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                    <th className="px-6 py-2">Product Name</th>
                    <th className="px-6 py-2">SKU</th>
                    <th className="px-6 py-2">Category</th>
                    <th className="px-6 py-2">Stock Level</th>
                    <th className="px-6 py-2">Warehouse</th>
                    <th className="px-6 py-2">Status</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className={`p-8 text-center ${textSecondary} font-bold`}>Loading catalog...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan="7" className={`p-8 text-center ${textSecondary} font-bold`}>No products matched your search.</td></tr>
                  ) : (
                    filteredProducts.map(product => {
                      const stockPct = Math.min(100, Math.max(0, (product.stock / (product.reorder_level * 3)) * 100)) || 0;
                      const isLow = product.stock > 0 && product.stock <= product.reorder_level;
                      const isOut = product.stock === 0;

                      return (
                        <tr key={product.id} className="clay-button-secondary group hover:scale-[1.005] transition-transform">
                          <td className="px-6 py-4 rounded-l-2xl">
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl clay-input flex items-center justify-center flex-shrink-0">
                                <FiPackage className="text-[#4030e8]" />
                              </div>
                              <span className={`font-bold ${textPrimary}`}>{product.name}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-medium italic text-sm ${textSecondary}`}>{product.sku}</td>
                          <td className="px-6 py-4">
                            <span className="px-4 py-1.5 clay-input rounded-full text-xs font-bold text-[#4030e8] inline-block whitespace-nowrap">
                              {product.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2.5 clay-input rounded-full overflow-hidden flex-shrink-0">
                                <div 
                                  className={`h-full rounded-full shadow-lg transition-all duration-500 ${isOut ? 'bg-slate-300' : isLow ? 'bg-orange-400' : 'bg-[#4030e8]'}`}
                                  style={{ width: `${isOut ? 0 : Math.max(15, stockPct)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${textPrimary}`}>{product.stock} <span className="text-[10px] text-slate-400 uppercase">{product.unit}</span></span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold ${textSecondary}`}>{product.warehouse || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight inline-block whitespace-nowrap ${
                              isOut ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' 
                                : isLow ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' 
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            }`}>
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 rounded-r-2xl text-right">
                            <div className="flex justify-end gap-2">
                              {can('products.edit') && (
                                <button onClick={() => openEditModal(product)} className={`p-2.5 clay-input rounded-xl hover:text-[#4030e8] transition-colors ${textSecondary}`}>
                                  <FiEdit2 size={16} />
                                </button>
                              )}
                              <button onClick={() => openQrModal(product)} className={`p-2.5 clay-input rounded-xl hover:text-[#4030e8] transition-colors ${textSecondary}`}>
                                <FiMaximize size={16} />
                              </button>
                              {can('products.delete') && (
                                <button onClick={() => handleDelete(product.id)} className={`p-2.5 clay-input rounded-xl hover:text-red-500 transition-colors ${textSecondary}`}>
                                  <FiTrash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className={`mt-6 flex justify-between items-center px-4 ${textSecondary}`}>
              <p className="font-medium text-sm">Showing {filteredProducts.length} products</p>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
          <div className={`clay-card w-full max-w-xl p-8 rounded-[2rem] ${isDark ? '' : 'border border-white'}`}>
            <h3 className={`text-2xl font-extrabold mb-8 ${textPrimary}`}>
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Product Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} placeholder="e.g. Ergonomic Chair" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>SKU</label>
                  <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} font-mono outline-none`} disabled={isEditing} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Category</label>
                  <input required type="text" list="categories-list" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} />
                  <datalist id="categories-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Warehouse</label>
                  <input required type="text" list="prod-warehouses-list" value={formData.warehouse} onChange={e => setFormData({...formData, warehouse: e.target.value})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} />
                  <datalist id="prod-warehouses-list">{warehouses.map(w => <option key={w} value={w} />)}</datalist>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Unit Types</label>
                  <input required type="text" list="units-list" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} placeholder="pcs, boxes" />
                  <datalist id="units-list">{units.map(u => <option key={u} value={u} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Reorder Level</label>
                  <input required type="number" min="0" value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: parseInt(e.target.value)})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Initial Stock</label>
                  <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className={`w-full px-5 py-4 clay-input rounded-2xl ${textPrimary} outline-none ${isEditing ? 'opacity-50' : ''}`} disabled={isEditing} />
                </div>
              </div>
              <div className="flex gap-4 justify-end mt-8 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`clay-button-secondary px-8 py-4 rounded-2xl font-bold transition-transform active:scale-95`}>Cancel</button>
                <button type="submit" className="clay-button-primary px-8 py-4 rounded-2xl text-white font-bold transition-transform active:scale-95">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQrModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQrModal(false)}>
          <div className={`clay-card p-10 rounded-[2rem] text-center flex flex-col items-center ${isDark ? '' : 'border border-white'}`} onClick={e => e.stopPropagation()}>
            <div className="size-16 clay-inset rounded-2xl flex items-center justify-center mb-4">
              <FiPackage className="text-[#4030e8] text-2xl" />
            </div>
            <h3 className={`text-2xl font-extrabold mb-1 ${textPrimary}`}>{selectedProduct.name}</h3>
            <p className={`font-mono text-sm mb-8 ${textSecondary}`}>SKU: {selectedProduct.sku}</p>
            <div className="bg-white p-6 rounded-3xl shadow-xl mb-8 border border-slate-100">
              <QRCode value={selectedProduct.sku} size={240} />
            </div>
            <button onClick={() => setShowQrModal(false)} className="clay-button-secondary w-full py-4 rounded-2xl font-bold transition-transform active:scale-95">Close</button>
          </div>
        </div>
      )}

      {showQrScanner && (
        <QRScanner onScan={handleQrScan} onClose={() => setShowQrScanner(false)} />
      )}
    </div>
  );
}
