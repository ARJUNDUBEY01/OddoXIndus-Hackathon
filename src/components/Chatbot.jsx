import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiMinimize2, FiMaximize2, FiDatabase } from 'react-icons/fi';
import { supabase } from '../services/supabaseClient';
import Groq from 'groq-sdk';
import { useTheme } from '../context/ThemeContext';

const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY, 
  dangerouslyAllowBrowser: true 
});

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm the Inventra AI Assistant. Ask me anything about your current inventory, stock levels, or products." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingModel, setLoadingModel] = useState(true);
  const messagesEndRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    // Model is remote, no local loading needed anymore
    setLoadingModel(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isMinimized, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // 1. Fetch live database snapshot directly (No Embeddings/Vector Search needed)
      let productsData = [];
      let receiptsData = [];
      
      try {
        const [prodRes, recRes] = await Promise.all([
          supabase.from('products').select('name, sku, category, stock, warehouse, reorder_level'),
          supabase.from('receipts').select('supplier, warehouse, status, date')
        ]);
        if (prodRes.error) throw prodRes.error;
        if (recRes.error) throw recRes.error;
        
        productsData = prodRes.data || [];
        receiptsData = recRes.data || [];
      } catch (dbErr) {
        throw new Error("Failed to query live database: " + dbErr.message);
      }

      const dbSnapshot = `=== LIVE INVENTORY DATA ===\nProducts:\n${JSON.stringify(productsData, null, 2)}\n\nRecent Receipts:\n${JSON.stringify(receiptsData, null, 2)}`;

      const systemPrompt = `You are "Inventra AI", an integrated, professional AI assistant for an inventory management software named Inventra.
You answer user questions accurately using the real-time database snapshot provided below.
Provide rich, dynamic answers in natural language. If they ask about totals or trends, calculate it from the given JSON context. Do not mention "JSON" or "database" to the user, just answer their question naturally based on the data.

Real-time Database Snapshot:
${dbSnapshot} `;

      // 3. Generate response using Groq
      let completion;
      try {
        completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            userMessage
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3
        });
      } catch (groqErr) {
        throw new Error("Groq API error: " + groqErr.message);
      }

      const reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

    } catch (error) {
      console.error("Chatbot Error:", error);
      let errorMsg = error.message;
      if (!import.meta.env.VITE_GROQ_API_KEY) {
        errorMsg = "VITE_GROQ_API_KEY is not defined. Please restart your Vite dev server.";
      }
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 size-16 rounded-[1.5rem] bg-[#4030e8] flex items-center justify-center text-white shadow-[6px_6px_16px_rgba(64,48,232,0.3),inset_2px_2px_6px_rgba(255,255,255,0.4),inset_-2px_-2px_6px_rgba(0,0,0,0.2)] z-[100] transition-transform hover:scale-110 active:scale-95 group"
      >
        <FiMessageSquare className="text-2xl group-hover:scale-110 transition-transform" />
        {loadingModel && (
          <div className="absolute -top-2 -right-2 size-4 bg-orange-500 rounded-full animate-ping"></div>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 z-[100] w-[350px] md:w-[400px] flex flex-col transition-all duration-300 transform origin-bottom-right shadow-2xl ${isMinimized ? 'h-[72px] translate-y-2' : 'h-[600px] max-h-[85vh] translate-y-0'} ${isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-[#f6f6f8] border-white'} rounded-[2rem] border overflow-hidden`} style={{ boxShadow: isDark ? '8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(255,255,255,0.03), inset 2px 2px 4px rgba(255,255,255,0.05)' : '12px 12px 24px rgba(0, 0, 0, 0.05), inset 4px 4px 8px rgba(255,255,255,0.5)' }}>
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer z-10 ${isDark ? 'bg-slate-800/80 backdrop-blur border-b border-slate-700/50' : 'bg-white/50 backdrop-blur border-b border-black/5'}`} 
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-xl bg-[#4030e8] flex items-center justify-center text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)]">
            <FiDatabase className="text-lg" />
            <div className="absolute -bottom-1 -right-1 size-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
          </div>
          <div>
            <h3 className={`font-black text-lg leading-none ${textPrimary}`}>Inventra AI</h3>
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{loadingModel ? 'Loading Model...' : 'Online - RAG Active'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
            {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
            <FiX className="text-xl" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-transparent">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 text-sm font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-[#4030e8] text-white rounded-[1.5rem] rounded-tr-sm shadow-[inset_2px_2px_4px_rgba(255,255,255,0.2)]' 
                    : `rounded-[1.5rem] rounded-tl-sm ${isDark ? 'bg-slate-900/60 text-slate-200 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]' : 'bg-white text-slate-700 border border-slate-100'}`
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`p-4 rounded-[1.5rem] rounded-tl-sm flex gap-1.5 items-center ${isDark ? 'bg-slate-900/60' : 'bg-white border border-slate-100'}`}>
                  <div className="size-2 bg-[#4030e8] rounded-full animate-bounce"></div>
                  <div className="size-2 bg-[#4030e8] rounded-full animate-bounce delay-100"></div>
                  <div className="size-2 bg-[#4030e8] rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className={`p-4 z-10 ${isDark ? 'bg-slate-800 border-t border-slate-700/50' : 'bg-[#f6f6f8] border-t border-black/5'}`}>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={loadingModel ? "Loading AI Brain..." : "Ask about inventory..."}
                disabled={loadingModel || isTyping}
                className={`flex-1 min-w-0 px-5 py-4 text-sm font-medium outline-none rounded-2xl ${
                  isDark 
                    ? 'bg-slate-900/80 text-white placeholder-slate-500 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]' 
                    : 'bg-white text-slate-800 placeholder-slate-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] border border-slate-200'
                } disabled:opacity-50`}
              />
              <button 
                type="submit" 
                disabled={loadingModel || isTyping || !input.trim()}
                className="size-14 rounded-2xl bg-[#4030e8] flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] transition-transform active:scale-95"
              >
                <FiSend className="text-white text-xl ml-1" />
              </button>
            </div>
            <p className={`text-center text-[10px] mt-3 font-bold uppercase tracking-widest ${textSecondary}`}>
              Inventra RAG &bull; Powered by Groq 
            </p>
          </form>
        </>
      )}
    </div>
  );
}
