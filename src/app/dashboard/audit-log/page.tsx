'use client';

import React from 'react';
import { Shield, ExternalLink, Filter, Search } from 'lucide-react';

const logs = [
  { id: '1', time: '2m ago', vault: 'HBAR/USDC', action: 'WIDEN_RANGE', reason: 'Detected 4.5% volatility spike in last 20m', tx: '0x123...abc' },
  { id: '2', time: '1h ago', vault: 'SAUCE/HBAR', action: 'HARVEST', reason: 'Bearish sentiment score (-0.6) crossed threshold', tx: '0x456...def' },
  { id: '3', time: '4h ago', vault: 'USDC/USDT', action: 'EMERGENCY_EXIT', reason: 'USDT peg dropped below 0.98 threshold', tx: '0x789...ghi' },
  { id: '4', time: '1d ago', vault: 'HBAR/USDC', action: 'NARROW_RANGE', reason: 'Volatility stabilized below 1.5% for 60m', tx: '0xabc...123' },
  { id: '5', time: '2d ago', vault: 'SAUCE/HBAR', action: 'DEPOSIT', reason: 'User initiated deposit', tx: '0xdef...456' },
];

const ActionBadge = ({ action }: { action: string }) => {
  const colors: Record<string, string> = {
    'WIDEN_RANGE': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'NARROW_RANGE': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'EMERGENCY_EXIT': 'bg-red-500/10 text-red-400 border-red-500/20',
    'HARVEST': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'DEPOSIT': 'bg-green-500/10 text-green-400 border-green-500/20',
    'WITHDRAW': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${colors[action] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
      {action}
    </span>
  );
};

export default function AuditLog() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Audit Log</h1>
          <p className="text-sm text-[#dcdcd0]/70 mt-1">Immutable record of all agent actions on HCS.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#dcdcd0]/50" size={16} />
          <input
            type="text"
            placeholder="Search reasons..."
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5a1f]"
          />
        </div>
        <div className="flex gap-4">
          <select className="bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5a1f]">
            <option>All Vaults</option>
            <option>HBAR/USDC</option>
            <option>SAUCE/HBAR</option>
          </select>
          <select className="bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5a1f]">
            <option>All Actions</option>
            <option>Rebalance</option>
            <option>Emergency Exit</option>
            <option>Harvest</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors">
            <Filter size={16} />
            More Filters
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-xs font-medium text-[#dcdcd0]/70 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-medium text-[#dcdcd0]/70 uppercase tracking-wider">Vault</th>
                <th className="px-6 py-4 text-xs font-medium text-[#dcdcd0]/70 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-medium text-[#dcdcd0]/70 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-xs font-medium text-[#dcdcd0]/70 uppercase tracking-wider text-right">Tx Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs text-[#dcdcd0]/70 group-hover:text-white transition-colors">{log.time}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#2a2a2a] border border-[var(--bg-dark)] flex items-center justify-center text-[8px] font-bold">{log.vault[0]}</div>
                        <div className="w-5 h-5 rounded-full bg-[#2a2a2a] border border-[var(--bg-dark)] flex items-center justify-center text-[8px] font-bold">{log.vault.split('/')[1][0]}</div>
                      </div>
                      <span className="text-sm font-medium text-white">{log.vault}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[#dcdcd0]/90 truncate max-w-md">{log.reason}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <a href="#" className="inline-flex items-center gap-1 text-xs text-[#ff5a1f] hover:text-[#e04d1a] transition-colors">
                      {log.tx}
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Shield className="w-16 h-16 text-[#dcdcd0]/20 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No agent actions yet</h3>
            <p className="text-sm text-[#dcdcd0]/70 max-w-sm">Configure a strategy on one of your vaults to get started with automated management.</p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="p-4 border-t border-white/10 flex justify-center">
            <button className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
