'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const VaultCard = ({ name, tokens, tvl, apy, position, range, status, id }: { name: string; tokens: string[]; tvl: string; apy: string; position: string; range: string; status: string; id: string }) => (
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
      <div className="flex items-center gap-2 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-medium text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {status}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-6">
      <div>
        <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">TVL</div>
        <div className="font-mono text-sm text-white">{tvl}</div>
      </div>
      <div>
        <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">APY</div>
        <div className="font-mono text-sm text-green-400">{apy}</div>
      </div>
      <div>
        <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Position</div>
        <div className="font-mono text-sm text-white">{position}</div>
      </div>
    </div>

    <div className="flex items-center justify-between text-xs text-[#dcdcd0]/70 mb-6 pb-6 border-b border-white/10">
      <span>Range: <span className="text-white">{range}</span></span>
      <span>Keeper: <span className="text-green-400">Running</span></span>
    </div>

    <div className="flex items-center gap-3">
      <Link href={`/dashboard/vaults/${id}`} className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors">
        Configure
      </Link>
      <Link href={`/dashboard/vaults/${id}`} className="flex-1 text-center py-2 bg-[#ff5a1f] hover:bg-[#e04d1a] text-white rounded-lg text-xs font-medium transition-colors">
        View Details &rarr;
      </Link>
    </div>
  </div>
);

export default function VaultsList() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Your Vaults</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#ff5a1f] hover:bg-[#e04d1a] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />
          New Vault
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <VaultCard id="1" name="HBAR/USDC" tokens={['HBAR', 'USDC']} tvl="$45,200" apy="24.3%" position="$5,200" range="Narrow (±2.5%)" status="Active" />
        <VaultCard id="2" name="SAUCE/HBAR" tokens={['SAUCE', 'HBAR']} tvl="$12,400" apy="42.1%" position="$1,800" range="Wide (±10%)" status="Active" />
        <VaultCard id="3" name="USDC/USDT" tokens={['USDC', 'USDT']} tvl="$890,000" apy="8.5%" position="$12,500" range="Peg (±0.5%)" status="Active" />
      </div>
    </div>
  );
}
