'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Vault, ScrollText, Settings, MessageCircle, Shield, Menu, X, Wallet, Home } from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';

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
  const pathname = usePathname();

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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium cursor-pointer hover:bg-white/10 transition-colors">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Keeper: Running
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
            <Wallet size={16} />
            Connect Wallet
          </button>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'bg-[#ff5a1f] text-white' : 'bg-white/5 hover:bg-white/10 text-[#dcdcd0]'}`}
          >
            <MessageCircle size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
