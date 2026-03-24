'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Cerberus AI. How can I help you manage your DeFi positions today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auth = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.sessionToken ? { 'x-session-token': auth.sessionToken } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Chat request failed' }));
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.error || res.statusText}` }]);
        setIsLoading(false);
        return;
      }

      // Stream the response
      const reader = res.body?.getReader();
      if (!reader) {
        setMessages([...newMessages, { role: 'assistant', content: 'No response stream available.' }]);
        setIsLoading(false);
        return;
      }

      let assistantContent = '';
      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE-style data lines from Vercel AI SDK
        const lines = chunk.split('\n');
        for (const line of lines) {
          // Vercel AI SDK text stream format
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2));
              assistantContent += text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            } catch {}
          }
        }
      }

      // If we got no content from streaming, show the raw text
      if (!assistantContent) {
        // Fallback: try reading as plain text
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1].content === '') {
            updated[updated.length - 1] = { role: 'assistant', content: 'Response received but could not parse stream.' };
          }
          return updated;
        });
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, auth.sessionToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
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
                  className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#ff5a1f] text-white rounded-tr-none'
                      : 'bg-[#413e35] text-[#dcdcd0] border-l-2 border-[#ff5a1f] rounded-tl-none'
                  }`}
                >
                  {msg.content || (isLoading && idx === messages.length - 1 ? (
                    <Loader2 size={16} className="animate-spin text-[#ff5a1f]" />
                  ) : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length < 3 && (
            <div className="p-4 flex gap-2 overflow-x-auto border-t border-white/5">
              {['Why the last rebalance?', 'Current sentiment on SAUCE?', 'My vault status?'].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="whitespace-nowrap px-3 py-1.5 bg-[#413e35] hover:bg-[#ff5a1f]/20 text-[#dcdcd0] text-xs rounded-full border border-white/10 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-[#333]">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className="w-full bg-[#413e35] text-[#dcdcd0] border border-white/10 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-[#ff5a1f] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#ff5a1f] hover:bg-white/5 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
