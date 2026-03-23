'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot } from 'lucide-react';

export default function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Cerberus AI. How can I help you manage your DeFi positions today?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    setTimeout(() => {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `I detected a 4.5% volatility spike in the HBAR/USDC pool. I widened your range to protect against impermanent loss.`
      }]);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#2a2a2a] border-l border-white/10 shadow-2xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#333]">
            <div className="flex items-center gap-2">
              <Bot className="text-[#ff5a1f]" size={20} />
              <span className="font-serif font-medium text-[#dcdcd0]">Cerberus AI</span>
            </div>
            <button onClick={onClose} className="text-[#dcdcd0]/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#ff5a1f] text-white rounded-tr-none'
                      : 'bg-[#413e35] text-[#dcdcd0] border-l-2 border-[#ff5a1f] rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length < 3 && (
            <div className="p-4 flex gap-2 overflow-x-auto border-t border-white/5">
              {['Why the last rebalance?', 'Current sentiment?', 'My position value?'].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="whitespace-nowrap px-3 py-1.5 bg-[#413e35] hover:bg-[#ff5a1f]/20 text-[#dcdcd0] text-xs rounded-full border border-white/10 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#333]">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-[#413e35] text-[#dcdcd0] border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-[#ff5a1f] transition-colors"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#ff5a1f] hover:bg-white/5 rounded-md transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
