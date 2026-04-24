import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { getAssistantResponse } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2, Wifi, WifiOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useNetwork } from '../hooks/useNetwork';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const Chat: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data } = useFinance();
  const isOnline = useNetwork();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Olá! Sou seu assistente do Nossa Grana. Como posso ajudar a **${data.familia.nome}** hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isOnline) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await getAssistantResponse(userMsg, data);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Ops, tive um probleminha. Pode tentar de novo?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-white z-[100] flex flex-col sm:max-w-md sm:right-6 sm:bottom-6 sm:top-auto sm:h-[600px] sm:rounded-[32px] sm:shadow-2xl sm:border sm:border-gray-100"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50 sm:rounded-t-[32px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00875A] text-white rounded-xl">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Assistente Nossa Grana</h2>
            <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest", isOnline ? "text-[#00875A]" : "text-red-500")}>
              {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
          <X size={24} className="text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "p-2 rounded-xl h-fit",
              msg.role === 'user' ? "bg-gray-100 text-gray-400" : "bg-emerald-100 text-[#00875A]"
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
              msg.role === 'user' ? "bg-[#00875A] text-white rounded-tr-none" : "bg-white text-gray-700 rounded-tl-none border border-gray-50"
            )}>
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="p-2 rounded-xl bg-emerald-100 text-[#00875A] h-fit">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-50 shadow-sm">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-100 bg-white sm:rounded-b-[32px]">
        {!isOnline && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl text-center font-medium">
            Você está offline. O assistente está indisponível agora.
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isOnline ? "Pergunte algo..." : "Assistente indisponível offline..."}
            disabled={!isOnline || isLoading}
            className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#00875A] transition-all text-sm disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isOnline}
            className="p-4 bg-[#00875A] text-white rounded-2xl shadow-lg shadow-emerald-100 hover:bg-[#00704a] disabled:opacity-50 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
