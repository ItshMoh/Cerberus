'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ExternalLink, Search, Loader2 } from 'lucide-react';
import { getAuditLogs } from '@/lib/api';

interface LogEntry {
  timestamp: string;
  vault: string;
  action: string;
  reason: string;
  txId?: string;
  params?: Record<string, unknown>;
}

const ActionBadge = ({ action }: { action: string }) => {
  const colors: Record<string, string> = {
    'WIDEN_RANGE': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'TIGHTEN_RANGE': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'NARROW_RANGE': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'EMERGENCY_EXIT': 'bg-red-500/10 text-red-400 border-red-500/20',
    'PANIC_AND_DEPOSIT': 'bg-red-500/10 text-red-400 border-red-500/20',
    'HARVEST': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'HARVEST_AND_SWAP_TO_USDC': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'HARVEST_NOW': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'DEPOSIT': 'bg-green-500/10 text-green-400 border-green-500/20',
    'WITHDRAW': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'NO_ACTION': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    'WARNING_ONLY': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${colors[action] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
      {action}
    </span>
  );
};

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch {
    return ts;
  }
}

export default function AuditLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [vaultFilter, setVaultFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        limit: 100,
        ...(vaultFilter ? { vault: vaultFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
      });
      if (data.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [vaultFilter, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = search
    ? logs.filter(l => l.reason?.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Audit Log</h1>
          <p className="text-sm text-[#dcdcd0]/70 mt-1">Immutable record of all agent actions on HCS.</p>
        </div>
        <button onClick={fetchLogs} className="text-sm text-[#ff5a1f] hover:underline">Refresh</button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#dcdcd0]/50" size={16} />
          <input
            type="text"
            placeholder="Search reasons..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5a1f]"
          />
        </div>
        <div className="flex gap-4">
          <select value={vaultFilter} onChange={e => setVaultFilter(e.target.value)} className="bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5a1f]">
            <option value="">All Vaults</option>
            <option value="0x88b88B54294B2EFD97D5f3604167257975FCeC6B">CLXY-SAUCE</option>
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5a1f]">
            <option value="">All Actions</option>
            <option value="WIDEN_RANGE">Rebalance</option>
            <option value="EMERGENCY_EXIT">Emergency Exit</option>
            <option value="HARVEST">Harvest</option>
          </select>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#ff5a1f] animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Shield className="w-16 h-16 text-[#dcdcd0]/20 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No agent actions yet</h3>
            <p className="text-sm text-[#dcdcd0]/70 max-w-sm">Configure a strategy and start the keeper to see actions here.</p>
          </div>
        ) : (
          <>
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
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-[#dcdcd0]/70 group-hover:text-white transition-colors" title={log.timestamp}>
                          {formatTime(log.timestamp)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-white font-mono">
                          {log.vault ? `${log.vault.slice(0, 6)}...${log.vault.slice(-4)}` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#dcdcd0]/90 truncate max-w-md">{log.reason}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {log.txId ? (
                          <a
                            href={`https://hashscan.io/testnet/transaction/${log.txId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#ff5a1f] hover:text-[#e04d1a] transition-colors"
                          >
                            {log.txId.slice(0, 12)}...
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-xs text-[#dcdcd0]/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-white/10 text-center text-xs text-[#dcdcd0]/50">
              Showing {filteredLogs.length} entries
            </div>
          </>
        )}
      </div>
    </div>
  );
}
