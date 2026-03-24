'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getVaultTest, keeperStatus } from '@/lib/api';

interface VaultInfo {
  vault?: string;
  lendingPool?: string;
  balances?: unknown;
  price?: unknown;
  isCalm?: unknown;
  status?: unknown;
  positionInfo?: unknown;
  marketData?: unknown;
  available?: boolean;
}

const VaultCard = ({ name, tokens, tvl, position, range, status, id, keeperActive }: {
  name: string; tokens: string[]; tvl: string; position: string; range: string; status: string; id: string; keeperActive: boolean;
}) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#ff5a1f]/50 transition-colors group relative overflow-hidden">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {tokens.map((t: string, i: number) => (
            <div key={i} className="w-8 h-8 rounded-full bg-[#2a2a2a] border-2 border-[var(--bg-dark)] flex items-center justify-center text-xs font-bold">
              {t[0]}
            </div>
          ))}
        </div>
        <span className="font-semibold text-white">{name}</span>
      </div>
      <div className={`flex items-center gap-2 px-2.5 py-1 ${status === 'Active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'} border rounded-full text-[10px] font-medium`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
        {status}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-6">
      <div>
        <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Price</div>
        <div className="font-mono text-sm text-white">{tvl}</div>
      </div>
      <div>
        <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Balances</div>
        <div className="font-mono text-sm text-white">{position}</div>
      </div>
      <div>
        <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Condition</div>
        <div className="font-mono text-sm text-white">{range}</div>
      </div>
    </div>

    <div className="flex items-center justify-between text-xs text-[#dcdcd0]/70 mb-6 pb-6 border-b border-white/10">
      <span>Vault: <span className="text-white font-mono">{id.slice(0, 6)}...{id.slice(-4)}</span></span>
      <span>Keeper: <span className={keeperActive ? 'text-green-400' : 'text-red-400'}>{keeperActive ? 'Running' : 'Stopped'}</span></span>
    </div>

    <div className="flex items-center gap-3">
      <Link href={`/dashboard/vaults/CLXY-SAUCE`} className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">
        Configure
      </Link>
      <Link href={`/dashboard/vaults/CLXY-SAUCE`} className="flex-1 text-center py-2 bg-[#ff5a1f] hover:bg-[#e04d1a] text-white rounded-lg text-xs font-medium transition-colors">
        View Details &rarr;
      </Link>
    </div>
  </div>
);

export default function VaultsList() {
  const [loading, setLoading] = useState(true);
  const [vaultData, setVaultData] = useState<VaultInfo | null>(null);
  const [keeperRunning, setKeeperRunning] = useState(false);
  const auth = useAuth();

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultRes, keeperRes] = await Promise.allSettled([
        getVaultTest(),
        keeperStatus(auth.sessionToken),
      ]);
      if (vaultRes.status === 'fulfilled' && vaultRes.value.ok) setVaultData(vaultRes.value);
      if (keeperRes.status === 'fulfilled' && keeperRes.value.ok) setKeeperRunning(keeperRes.value.status?.status === 'running');
    } catch {} finally {
      setLoading(false);
    }
  }, [auth.sessionToken]);

  useEffect(() => { fetchVaults(); }, [fetchVaults]);

  const vaultPrice = vaultData?.price && typeof vaultData.price === 'object' && 'price' in vaultData.price && !('error' in vaultData.price) ? (Number(vaultData.price.price) / 1e18).toFixed(6) : '—';
  const isCalm = typeof vaultData?.isCalm === 'boolean' ? vaultData.isCalm : null;
  const isPaused = vaultData?.status && typeof vaultData.status === 'object' && 'paused' in vaultData.status ? vaultData.status.paused : null;
  const balances = vaultData?.balances && typeof vaultData.balances === 'object' && !('error' in vaultData.balances) ? vaultData.balances as { amount0: string; amount1: string } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-[#ff5a1f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Your Vaults</h1>
        <button onClick={fetchVaults} className="text-sm text-[#ff5a1f] hover:underline">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vaultData ? (
          <VaultCard
            id={vaultData.vault || vaultData.lendingPool || 'unknown'}
            name="CLXY/SAUCE"
            tokens={['CLXY', 'SAUCE']}
            tvl={vaultPrice}
            position={balances ? `${(Number(balances.amount0) / 1e8).toFixed(2)} / ${(Number(balances.amount1) / 1e6).toFixed(2)}` : '—'}
            range={isCalm === null ? '—' : isCalm ? 'Calm' : 'Volatile'}
            status={isPaused === null ? 'Unknown' : isPaused ? 'Paused' : 'Active'}
            keeperActive={keeperRunning}
          />
        ) : (
          <div className="col-span-full text-center py-16 text-[#dcdcd0]/50 text-sm">
            No vault data available. Make sure the server is running.
          </div>
        )}
      </div>
    </div>
  );
}
