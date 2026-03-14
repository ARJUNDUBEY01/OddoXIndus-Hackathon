import React, { useState, useEffect } from 'react';
import { ledger } from '../blockchain/Blockchain';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { FiShield, FiAlertTriangle, FiLayers, FiLink } from 'react-icons/fi';

export default function BlockchainLedger() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(null);
  const { isDark } = useTheme();

  useEffect(() => {
    loadChain();
  }, []);

  const loadChain = async () => {
    setLoading(true);
    await ledger.initialize();
    setBlocks([...ledger.chain].reverse());
    setLoading(false);
  };

  const verifyChain = () => {
    const valid = ledger.isChainValid();
    setIsValid(valid);
    if (valid) {
      toast.success('Blockchain integrity verified. No tampering detected.');
    } else {
      toast.error('WARNING: Blockchain data has been tampered with!');
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-[#f6f6f8]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <Navbar title="Blockchain Ledger" />
        
        <main className="flex-1 p-6 md:p-8 w-full max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 clay-card p-6 md:p-8 rounded-[2rem]">
            <div className="flex items-center gap-4">
              <div className="size-14 clay-input rounded-2xl flex items-center justify-center">
                <FiLayers className="text-[#4030e8] text-2xl" />
              </div>
              <div>
                <h2 className={`text-2xl font-extrabold tracking-tight ${textPrimary}`}>
                  Immutable Stock Ledger
                </h2>
                <p className={`font-medium mt-1 ${textSecondary}`}>Every inventory action is cryptographically secured.</p>
              </div>
            </div>
            
            <button 
              onClick={verifyChain}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all shadow-lg text-white active:scale-95 ${
                isValid === false 
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-[6px_6px_12px_rgba(244,63,94,0.3),inset_3px_3px_6px_rgba(255,255,255,0.3),inset_-3px_-3px_6px_rgba(0,0,0,0.1)]' 
                  : 'clay-button-primary'
              }`}
            >
              {isValid === false ? <FiAlertTriangle className="text-xl" /> : <FiShield className="text-xl" />}
              Verify Chain Integrity
            </button>
          </div>

          {isValid === false && (
            <div className="p-6 bg-rose-100 dark:bg-rose-500/10 border-2 border-rose-500/50 rounded-2xl text-rose-700 dark:text-rose-400 flex items-start gap-4 shadow-xl">
              <div className="p-3 bg-rose-500/20 rounded-xl">
                <FiAlertTriangle className="w-8 h-8 flex-shrink-0" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Security Alert: Chain Integrity Compromised</h3>
                <p className="font-medium mt-1">
                  The cryptographic hashes do not match. The ledger data has been tampered with outside of the secure application flow.
                </p>
              </div>
            </div>
          )}

          {isValid === true && (
            <div className="p-6 bg-emerald-100 dark:bg-emerald-500/10 border-2 border-emerald-500/50 rounded-2xl text-emerald-700 dark:text-emerald-400 flex items-center gap-4 shadow-xl">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <FiShield className="w-8 h-8 flex-shrink-0" />
              </div>
              <p className="text-lg font-black tracking-tight">All blocks verified. Integrity is 100% secure.</p>
            </div>
          )}

          <div className="space-y-6">
            {loading ? (
              <div className={`text-center py-16 font-bold animate-pulse ${textSecondary}`}>Loading secure ledger...</div>
            ) : blocks.length === 0 ? (
              <div className={`text-center py-16 font-bold ${textSecondary}`}>Ledger is empty.</div>
            ) : (
              blocks.map((block, i) => (
                <div key={block.index} className="clay-card p-6 md:p-8 rounded-[2rem] relative z-10">
                  {i !== blocks.length - 1 && (
                    <div className={`absolute left-[3.25rem] md:left-[3.5rem] -bottom-6 w-1.5 h-6 z-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                  )}
                  
                  <div className="flex flex-col md:flex-row gap-6 relative z-10">
                    <div className="md:w-1/3 flex items-start gap-4">
                      <div className="size-16 rounded-2xl clay-button-secondary flex flex-col items-center justify-center font-mono border-none flex-shrink-0 shadow-lg">
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${textSecondary}`}>Block</span>
                        <span className={`text-xl font-black ${textPrimary}`}>#{block.index}</span>
                      </div>
                      <div className="pt-1">
                        <span className={`inline-block px-3 py-1 mb-2 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          block.data.action === 'RECEIPT' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' :
                          block.data.action === 'DELIVERY' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                          block.data.action === 'TRANSFER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                          block.data.action === 'ADJUSTMENT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                          'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {block.data.action || 'ROOT GENESIS'}
                        </span>
                        <p className={`font-bold text-sm ${textPrimary}`}>
                          {new Date(block.timestamp).toLocaleDateString()}
                        </p>
                        <p className={`font-medium text-xs ${textSecondary}`}>
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex-1 clay-input rounded-2xl p-5 md:p-6 flex flex-col justify-center">
                      <div className="mb-6 text-sm">
                        {block.data.product_name ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                              <span className={`font-black text-lg ${textPrimary}`}>{block.data.product_name}</span>
                              <span className={`font-extrabold text-lg px-3 py-1 bg-white/50 dark:bg-black/20 rounded-lg ${textPrimary}`}>
                                {block.data.action === 'DELIVERY' ? '-' : block.data.action === 'RECEIPT' ? '+' : ''}
                                {Math.abs(block.data.quantity || block.data.quantity_received || block.data.quantity_delivered || block.data.difference || 0)}
                              </span>
                            </div>
                            <span className={`font-medium italic ${textSecondary}`}>ID: {block.data.product_id}</span>
                            
                            {block.data.action === 'TRANSFER' && (
                              <div className={`mt-3 p-3 bg-white/30 dark:bg-black/20 rounded-xl font-bold ${textPrimary}`}>
                                {block.data.from} &rarr; {block.data.to}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`font-medium ${textSecondary}`}>{block.data.details || JSON.stringify(block.data)}</span>
                        )}
                      </div>
                      
                      <div className="space-y-3 font-mono text-[10px] md:text-xs">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg">
                          <span className={`font-bold w-16 uppercase tracking-wider ${textSecondary}`}>Tx Hash</span>
                          <span className="text-[#4030e8] break-all font-bold tracking-tight">{block.hash}</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 px-2.5">
                          <span className={`font-bold w-16 uppercase tracking-wider flex items-center gap-1 opacity-70 ${textSecondary}`}>
                            <FiLink /> Prev
                          </span>
                          <span className={`break-all font-medium opacity-70 ${textSecondary}`}>{block.previousHash}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
