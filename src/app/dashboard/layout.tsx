'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Vault, ScrollText, Settings, MessageCircle, Shield, Menu, X, Wallet, Home, LogOut } from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/context/AuthContext';
import { keeperStatus } from '@/lib/api';

const NavItem: React.FC<{ icon: React.ElementType; label: string; href: string; isActive: boolean }> = ({ icon: Icon, label, href, isActive }) => (
  <Link
    href={href}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]'
        : 'text-[#dcdcd0]/70 hover:bg-white/5 hover:text-[#dcdcd0]'
    }`}
  >
    <Icon size={18} />
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [keeperRunning, setKeeperRunning] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [accountIdInput, setAccountIdInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const pollKeeper = useCallback(async () => {
    try {
      const data = await keeperStatus(auth.sessionToken);
      if (data.ok) setKeeperRunning(data.status?.status === 'running');
    } catch {}
  }, [auth.sessionToken]);

  useEffect(() => {
    const initialPollId = setTimeout(() => {
      void pollKeeper();
    }, 0);
    const id = setInterval(pollKeeper, 10000);
    return () => {
      clearTimeout(initialPollId);
      clearInterval(id);
    };
  }, [pollKeeper]);

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError('');
    const result = await auth.connect(accountIdInput, privateKeyInput);
    setConnecting(false);
    if (result.ok) {
      setConnectOpen(false);
      setAccountIdInput('');
      setPrivateKeyInput('');
    } else {
      setConnectError(result.error || 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    await auth.disconnect();
    router.push('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Vault, label: 'Vaults', href: '/dashboard/vaults' },
    { icon: ScrollText, label: 'Audit Log', href: '/dashboard/audit-log' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#423f36] text-[#dcdcd0] flex flex-col font-sans selection:bg-[#ff5a1f] selection:text-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#423f36] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Shield className="text-[#ff5a1f]" size={24} />
          <span className="font-serif text-xl tracking-tight">Cerberus</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="text-[#dcdcd0]/70 hover:text-[#dcdcd0]">
            <MessageCircle size={24} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[#dcdcd0]/70 hover:text-[#dcdcd0]">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#423f36] border-b border-white/10 overflow-hidden"
          >
            <nav className="p-4 space-y-2">
              <NavItem icon={Home} label="Home" href="/" isActive={false} />
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                />
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Top Navbar */}
      <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-white/10 sticky top-0 bg-[#423f36]/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 border-r border-white/10 pr-8">
            <Shield className="text-[#ff5a1f]" size={24} />
            <span className="font-serif text-xl tracking-tight">Cerberus</span>
          </div>

          <nav className="flex items-center gap-2">
            <NavItem icon={Home} label="Home" href="/" isActive={false} />
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Keeper Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium cursor-pointer hover:bg-white/10 transition-colors">
            <span className={`w-2 h-2 rounded-full ${keeperRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            Keeper: {keeperRunning ? 'Running' : 'Stopped'}
          </div>

          {/* Wallet */}
          {auth.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#dcdcd0]/70">{auth.accountId}</span>
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-mono text-[#c2c2a3]">{auth.network}</span>
              <button onClick={handleDisconnect} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#dcdcd0]/70 hover:text-white transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConnectOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'bg-[#ff5a1f] text-white' : 'bg-white/5 hover:bg-white/10 text-[#dcdcd0]'}`}
          >
            <MessageCircle size={20} />
          </button>
        </div>
      </header>

      {/* Connect Modal */}
      <AnimatePresence>
        {connectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConnectOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#2a2a2a] border border-white/10 rounded-xl p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white mb-1">Connect Your Vault</h2>
              <p className="text-xs text-[#dcdcd0]/50 mb-6">Your key is stored only in the server session and never saved to disk.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#dcdcd0]/70 mb-1">Hedera Account ID</label>
                  <input
                    type="text"
                    placeholder="0.0.12345"
                    value={accountIdInput}
                    onChange={e => setAccountIdInput(e.target.value)}
                    className="w-full bg-[#413e35] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff5a1f]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#dcdcd0]/70 mb-1">ECDSA Private Key</label>
                  <input
                    type="password"
                    placeholder="0x..."
                    value={privateKeyInput}
                    onChange={e => setPrivateKeyInput(e.target.value)}
                    className="w-full bg-[#413e35] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff5a1f]"
                  />
                </div>
                {connectError && (
                  <p className="text-sm text-red-400">{connectError}</p>
                )}
                <button
                  onClick={handleConnect}
                  disabled={connecting || !accountIdInput || !privateKeyInput}
                  className="w-full py-3 bg-[#ff5a1f] hover:bg-[#e04d1a] disabled:bg-[#ff5a1f]/30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
