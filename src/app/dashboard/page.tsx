'use client';

import React, { useState, useEffect, useCallback } from 'react';
// recharts removed — dashboard now shows live data cards instead of mock charts
import { Shield, Activity, Vault, ArrowUpRight, ArrowDownRight, Minus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getVaultTest, rebalanceCheck, harvestCheck, keeperStatus, getAuditLogs } from '@/lib/api';

const StatCard = ({ title, value, change, icon: Icon, trend }: { title: string; value: string; change?: string; icon: React.ElementType; trend?: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col relative overflow-hidden group hover:border-[#ff5a1f]/50 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <Icon size={20} className="text-[#dcdcd0]/50" />
      {change && (
        <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : trend === 'down' ? <ArrowDownRight size={14} className="mr-1" /> : <Minus size={14} className="mr-1" />}
          {change}
        </div>
      )}
    </div>
    <div className="text-2xl font-mono text-white mb-1">{value}</div>
    <div className="text-xs text-[#dcdcd0]/70 font-medium">{title}</div>
    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#ff5a1f]/10 rounded-full blur-2xl group-hover:bg-[#ff5a1f]/20 transition-colors" />
  </div>
);

const SentimentGauge = ({ score, label }: { score: number; label: string }) => {
  const normalizedScore = (score + 1) / 2;
  const rotation = normalizedScore * 180;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#ff5a1f]/50 transition-colors">
      <div className="text-xs text-[#dcdcd0]/70 font-medium mb-4 w-full text-left">Current Sentiment</div>

      <div className="relative w-32 h-16 overflow-hidden mb-2">
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-white/10" />

        <svg className="absolute top-0 left-0 w-32 h-32" viewBox="0 0 100 100">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round" />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="absolute bottom-0 left-1/2 w-1 h-16 bg-white origin-bottom -translate-x-1/2 rounded-full transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(-50%) rotate(${rotation - 90}deg)` }}
        >
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full" />
        </div>
      </div>

      <div className="text-xl font-bold text-white mb-1">{label}</div>
      <div className="text-xs text-[#dcdcd0]/50">Score: {score.toFixed(2)}</div>

      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#ff5a1f]/10 rounded-full blur-2xl group-hover:bg-[#ff5a1f]/20 transition-colors" />
    </div>
  );
};

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

interface VolatilityInfo {
  currentPrice: number;
  priceDeltaPercent: number;
  isHighVolatility: boolean;
  threshold: number;
  windowMinutes: number;
  dataPoints: number;
}

interface SentimentInfo {
  score: number;
  label: string;
}

interface LendingData {
  ok: boolean;
  network: string;
  lendingPool: string;
  type: string;
  marketData: string;
  available: boolean;
  vault?: string;
  balances?: { amount0: string; amount1: string } | { error: string };
  price?: { price: string } | { error: string };
  isCalm?: boolean;
  status?: { paused: boolean } | { error: string };
}

interface AuditEntry {
  timestamp: string;
  action: string;
  reason: string;
  txId?: string;
}

function formatRelativeTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch { return ts; }
}

function actionColor(action: string): { color: string; bg: string } {
  if (action.includes('RANGE') || action.includes('REBALANCE') || action.includes('WIDEN') || action.includes('TIGHTEN') || action.includes('NARROW'))
    return { color: 'text-blue-400', bg: 'bg-blue-400/10' };
  if (action.includes('HARVEST') || action.includes('SWAP'))
    return { color: 'text-purple-400', bg: 'bg-purple-400/10' };
  if (action.includes('EMERGENCY') || action.includes('PANIC'))
    return { color: 'text-red-400', bg: 'bg-red-400/10' };
  return { color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [lendingData, setLendingData] = useState<LendingData | null>(null);
  const [volatility, setVolatility] = useState<VolatilityInfo | null>(null);
  const [sentiment, setSentiment] = useState<SentimentInfo | null>(null);
  const [keeperRunning, setKeeperRunning] = useState(false);
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [actionCount, setActionCount] = useState(0);
  const auth = useAuth();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultRes, volRes, sentRes, keeperRes, logsRes] = await Promise.allSettled([
        getVaultTest(),
        rebalanceCheck(auth.sessionToken),
        harvestCheck(auth.sessionToken),
        keeperStatus(auth.sessionToken),
        getAuditLogs({ limit: 5 }),
      ]);

      if (vaultRes.status === 'fulfilled' && vaultRes.value.ok) setLendingData(vaultRes.value);
      if (volRes.status === 'fulfilled' && volRes.value.ok) setVolatility(volRes.value.volatility);
      if (sentRes.status === 'fulfilled' && sentRes.value.ok && sentRes.value.sentiment) {
        setSentiment({ score: sentRes.value.sentiment.score ?? 0, label: sentRes.value.sentiment.label ?? 'Neutral' });
      }
      if (keeperRes.status === 'fulfilled' && keeperRes.value.ok) setKeeperRunning(keeperRes.value.status?.status === 'running');
      if (logsRes.status === 'fulfilled' && logsRes.value.ok && logsRes.value.logs) {
        setRecentLogs(logsRes.value.logs.slice(0, 5));
        setActionCount(logsRes.value.logs.length);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [auth.sessionToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const vaultPrice = lendingData?.price && typeof lendingData.price === 'object' && 'price' in lendingData.price && !('error' in lendingData.price) ? Number(lendingData.price.price) / 1e18 : null;
  const isCalm = typeof lendingData?.isCalm === 'boolean' ? lendingData.isCalm : null;
  const vaultAddr = lendingData?.vault ? `${lendingData.vault.slice(0, 6)}...${lendingData.vault.slice(-4)}` : '—';

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
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <button onClick={fetchAll} className="text-sm text-[#ff5a1f] hover:underline">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CLXY-SAUCE Vault"
          value={vaultAddr}
          change={isCalm !== null ? (isCalm ? 'Calm' : 'Volatile') : undefined}
          trend={isCalm ? 'up' : 'down'}
          icon={Vault}
        />
        <StatCard
          title="Keeper Status"
          value={keeperRunning ? 'Running' : 'Stopped'}
          change={keeperRunning ? 'Active' : 'Inactive'}
          trend={keeperRunning ? 'up' : 'down'}
          icon={Shield}
        />
        <StatCard
          title="Recent Agent Actions"
          value={String(actionCount)}
          icon={Activity}
        />
        <SentimentGauge
          score={sentiment?.score ?? 0}
          label={sentiment?.label ?? 'Unknown'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volatility Monitor */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Volatility Monitor (HBAR/USD)</h3>
            <div className="text-xs text-[#dcdcd0]/70">{volatility ? `${volatility.dataPoints} data points` : 'Loading...'}</div>
          </div>
          {volatility ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Current Price</div>
                  <div className="font-mono text-lg text-white">${volatility.currentPrice.toFixed(4)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Price Delta</div>
                  <div className={`font-mono text-lg ${volatility.isHighVolatility ? 'text-red-400' : 'text-green-400'}`}>
                    {volatility.priceDeltaPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Threshold</div>
                  <div className="font-mono text-lg text-white">{volatility.threshold}%</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Window</div>
                  <div className="font-mono text-lg text-white">{volatility.windowMinutes} min</div>
                </div>
              </div>
              <div className="text-xs text-center text-[#dcdcd0]/70">
                Status: <span className={volatility.isHighVolatility ? 'text-red-400' : 'text-green-400'}>
                  {volatility.isHighVolatility ? 'HIGH VOLATILITY' : 'Normal'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[#dcdcd0]/50 text-sm">No volatility data available</div>
          )}
        </div>

        {/* Vault Info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Vault Status</h3>
            <Link href="/dashboard/vaults/CLXY-SAUCE" className="text-xs text-[#ff5a1f] hover:underline">View Details</Link>
          </div>
          {lendingData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Vault Price</div>
                  <div className="font-mono text-lg text-white">{vaultPrice !== null ? vaultPrice.toFixed(6) : '—'}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Is Calm</div>
                  <div className={`font-mono text-lg ${isCalm ? 'text-green-400' : 'text-red-400'}`}>
                    {isCalm !== null ? (isCalm ? 'Yes' : 'No') : '—'}
                  </div>
                </div>
              </div>
              {lendingData.balances && typeof lendingData.balances === 'object' && !('error' in lendingData.balances) && (
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-2">Balances</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#dcdcd0]/70">Token 0 (CLXY)</span>
                    <span className="font-mono text-white">{(Number(lendingData.balances.amount0) / 1e8).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#dcdcd0]/70">Token 1 (SAUCE)</span>
                    <span className="font-mono text-white">{(Number(lendingData.balances.amount1) / 1e6).toFixed(4)}</span>
                  </div>
                </div>
              )}
              {lendingData.status && typeof lendingData.status === 'object' && 'paused' in lendingData.status && (
                <div className="text-xs text-center text-[#dcdcd0]/70">
                  Strategy: <span className={lendingData.status.paused ? 'text-red-400' : 'text-green-400'}>
                    {lendingData.status.paused ? 'Paused' : 'Active'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[#dcdcd0]/50 text-sm">No vault data available</div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Active Vaults</h2>
          <Link href="/dashboard/vaults" className="text-sm text-[#ff5a1f] hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VaultCard
            id="CLXY-SAUCE"
            name="CLXY/SAUCE"
            tokens={['CLXY', 'SAUCE']}
            tvl={vaultPrice !== null ? `${vaultPrice.toFixed(4)}` : '—'}
            apy="—"
            position={lendingData?.balances && typeof lendingData.balances === 'object' && 'amount0' in lendingData.balances ? `${(Number(lendingData.balances.amount0) / 1e8).toFixed(2)} / ${(Number(lendingData.balances.amount1) / 1e6).toFixed(2)}` : '—'}
            range={isCalm ? 'Calm' : 'Volatile'}
            status={keeperRunning ? 'Keeper Running' : 'Keeper Stopped'}
          />
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Recent Agent Activity</h3>
          <Link href="/dashboard/audit-log" className="text-sm text-[#ff5a1f] hover:underline">View Full Log</Link>
        </div>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-[#dcdcd0]/50 text-sm">No agent actions recorded yet. Start the keeper to see activity.</div>
        ) : (
          <div className="space-y-4">
            {recentLogs.map((log, i) => {
              const { color, bg } = actionColor(log.action);
              return (
                <div key={i} className="flex items-start gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors">
                  <div className={`p-2 rounded-full ${bg} ${color}`}>
                    <Activity size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-mono text-xs mr-2">{log.action}</span>
                      {log.reason}
                    </p>
                    <p className="text-xs text-[#dcdcd0]/50 mt-1">{formatRelativeTime(log.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
