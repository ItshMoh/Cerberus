'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Settings, ArrowDownToLine, History, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getVaultTest, getStrategies, saveStrategy, updateStrategy, getAuditLogs } from '@/lib/api';

interface VaultData {
  vault?: string;
  strategy?: string;
  lendingPool?: string;
  balances?: unknown;
  price?: unknown;
  isCalm?: unknown;
  status?: unknown;
  positionInfo?: unknown;
  marketData?: unknown;
  available?: boolean;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  reason: string;
  vault?: string;
  txId?: string;
}

interface BalancesData {
  amount0: string;
  amount1: string;
}

interface PositionInfoData {
  main?: {
    tickLower?: string | number;
    tickUpper?: string | number;
  };
  positionWidth?: string | number;
}

export default function VaultDetail() {
  const { id } = useParams();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('position');
  const [loading, setLoading] = useState(true);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AuditEntry[]>([]);

  // Strategy state
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [volEnabled, setVolEnabled] = useState(true);
  const [volThreshold, setVolThreshold] = useState(5);
  const [volWindow, setVolWindow] = useState(20);
  const [depegEnabled, setDepegEnabled] = useState(false);
  const [depegThreshold, setDepegThreshold] = useState(0.98);
  const [harvestEnabled, setHarvestEnabled] = useState(true);
  const [savingStrategy, setSavingStrategy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultRes, logsRes, stratRes] = await Promise.allSettled([
        getVaultTest(),
        getAuditLogs({ limit: 20 }),
        auth.sessionToken ? getStrategies(auth.sessionToken) : Promise.resolve({ ok: false }),
      ]);

      if (vaultRes.status === 'fulfilled' && vaultRes.value.ok) setVaultData(vaultRes.value);
      if (logsRes.status === 'fulfilled' && logsRes.value.ok && logsRes.value.logs) {
        setHistoryLogs(logsRes.value.logs);
      }
      if (stratRes.status === 'fulfilled' && stratRes.value.ok && stratRes.value.strategies?.length > 0) {
        const s = stratRes.value.strategies[0];
        setStrategyId(s.id);
        if (s.volatility) {
          setVolThreshold(s.volatility.threshold ?? 5);
          setVolWindow(s.volatility.timeWindowMinutes ?? 20);
        }
        if (s.depeg) {
          setDepegEnabled(true);
          setDepegThreshold(s.depeg.criticalThreshold ?? 0.98);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [auth.sessionToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveStrategy = async () => {
    if (!auth.sessionToken) {
      toast.error('Connect your wallet first');
      return;
    }
    setSavingStrategy(true);
    try {
      const config = {
        vaultAddress: vaultData?.vault || '0x88b88B54294B2EFD97D5f3604167257975FCeC6B',
        volatility: { threshold: volThreshold, timeWindowMinutes: volWindow },
        depeg: depegEnabled ? { monitoredFeed: 'USDC/USD', warningThreshold: 0.99, criticalThreshold: depegThreshold } : undefined,
        harvest: harvestEnabled ? { rewardTokenSymbol: 'SAUCE', bearishThreshold: -0.5, bullishThreshold: 0.5, normalHarvestIntervalMinutes: 240 } : undefined,
      };

      const res = strategyId
        ? await updateStrategy(auth.sessionToken, strategyId, config)
        : await saveStrategy(auth.sessionToken, config);

      if (res.ok) {
        if (res.strategy?.id) setStrategyId(res.strategy.id);
        toast.success('Strategy saved');
      } else {
        toast.error(res.error || 'Failed to save strategy');
      }
    } catch {
      toast.error('Failed to save strategy');
    } finally {
      setSavingStrategy(false);
    }
  };

  const vaultPrice = vaultData?.price && typeof vaultData.price === 'object' && 'price' in vaultData.price && !('error' in vaultData.price) ? (Number(vaultData.price.price) / 1e18) : null;
  const isCalm = typeof vaultData?.isCalm === 'boolean' ? vaultData.isCalm : null;
  const balances: BalancesData | null =
    vaultData?.balances &&
    typeof vaultData.balances === 'object' &&
    !('error' in vaultData.balances) &&
    'amount0' in vaultData.balances &&
    'amount1' in vaultData.balances
      ? (vaultData.balances as BalancesData)
      : null;
  const posInfo: PositionInfoData | null =
    vaultData?.positionInfo &&
    typeof vaultData.positionInfo === 'object' &&
    !('error' in vaultData.positionInfo)
      ? (vaultData.positionInfo as PositionInfoData)
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-[#ff5a1f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Top Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border-2 border-[var(--bg-dark)] flex items-center justify-center font-bold">C</div>
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border-2 border-[var(--bg-dark)] flex items-center justify-center font-bold">S</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CLXY/SAUCE Vault</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1.5 px-2 py-0.5 ${isCalm ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'} border rounded-full text-[10px] font-medium`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isCalm ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  {isCalm ? 'Calm' : 'Volatile'}
                </span>
                <span className="text-xs text-[#dcdcd0]/50 font-mono">{id}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Vault Price</div>
              <div className="font-mono text-lg text-white">{vaultPrice !== null ? vaultPrice.toFixed(6) : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Token 0 (CLXY)</div>
              <div className="font-mono text-lg text-white">{balances ? (Number(balances.amount0) / 1e8).toFixed(4) : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Token 1 (SAUCE)</div>
              <div className="font-mono text-lg text-white">{balances ? (Number(balances.amount1) / 1e6).toFixed(4) : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Condition</div>
              <div className={`font-mono text-lg ${isCalm ? 'text-green-400' : 'text-yellow-400'}`}>{isCalm !== null ? (isCalm ? 'Calm' : 'Volatile') : '—'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-white/10">
          {[
            { id: 'position', label: 'Position', icon: Activity },
            { id: 'strategy', label: 'Strategy', icon: Settings },
            { id: 'deposit', label: 'Deposit/Withdraw', icon: ArrowDownToLine },
            { id: 'history', label: 'History', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-[#ff5a1f]' : 'text-[#dcdcd0]/70 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff5a1f]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-h-[400px]">
        {activeTab === 'position' && (
          <div className="space-y-8 animate-in fade-in">
            <div>
              <h3 className="text-lg font-semibold text-white mb-6">Position Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <h4 className="text-sm font-medium text-[#dcdcd0]/70 mb-4">Position Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Token 0 (CLXY)</span>
                      <span className="font-mono">{balances ? (Number(balances.amount0) / 1e8).toFixed(4) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Token 1 (SAUCE)</span>
                      <span className="font-mono">{balances ? (Number(balances.amount1) / 1e6).toFixed(4) : '—'}</span>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center font-medium">
                      <span className="text-white">Vault Price</span>
                      <span className="font-mono">{vaultPrice !== null ? vaultPrice.toFixed(6) : '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <h4 className="text-sm font-medium text-[#dcdcd0]/70 mb-4">Range Info</h4>
                  <div className="space-y-3">
                    {posInfo ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-white">Main Lower Tick</span>
                          <span className="font-mono">{posInfo.main?.tickLower ?? '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white">Main Upper Tick</span>
                          <span className="font-mono">{posInfo.main?.tickUpper ?? '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white">Position Width</span>
                          <span className="font-mono">{posInfo.positionWidth ?? '—'}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-[#dcdcd0]/50">Position info unavailable</div>
                    )}
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center font-medium">
                      <span className="text-white">Is Calm</span>
                      <span className={`font-mono ${isCalm ? 'text-green-400' : 'text-red-400'}`}>{isCalm !== null ? (isCalm ? 'Yes' : 'No') : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-8 animate-in fade-in max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Volatility Manager</h3>
              <p className="text-sm text-[#dcdcd0]/70 mb-6">Automatically adjust position ranges during high volatility.</p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5">
                  <div>
                    <div className="font-medium text-white">Enable Volatility Manager</div>
                    <div className="text-xs text-[#dcdcd0]/50">Active monitoring of price swings</div>
                  </div>
                  <button onClick={() => setVolEnabled(!volEnabled)} className={`w-12 h-6 ${volEnabled ? 'bg-[#ff5a1f]' : 'bg-white/10'} rounded-full relative transition-colors`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${volEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className={volEnabled ? '' : 'opacity-50 pointer-events-none'}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">Volatility Threshold</span>
                    <span className="font-mono text-[#ff5a1f]">{volThreshold}%</span>
                  </div>
                  <input type="range" min="0.1" max="20" step="0.1" value={volThreshold} onChange={e => setVolThreshold(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
                </div>

                <div className={volEnabled ? '' : 'opacity-50 pointer-events-none'}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">Time Window</span>
                    <span className="font-mono text-[#ff5a1f]">{volWindow} min</span>
                  </div>
                  <input type="range" min="1" max="120" step="1" value={volWindow} onChange={e => setVolWindow(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">De-peg Circuit Breaker</h3>
              <p className="text-sm text-[#dcdcd0]/70 mb-6">Emergency exit if a stablecoin loses its peg.</p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5">
                  <div>
                    <div className="font-medium text-white">Enable Circuit Breaker</div>
                    <div className="text-xs text-[#dcdcd0]/50">Monitor stablecoin stability</div>
                  </div>
                  <button onClick={() => setDepegEnabled(!depegEnabled)} className={`w-12 h-6 ${depegEnabled ? 'bg-[#ff5a1f]' : 'bg-white/10'} rounded-full relative transition-colors`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${depegEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className={depegEnabled ? '' : 'opacity-50 pointer-events-none'}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">Critical Threshold</span>
                    <span className="font-mono text-[#ff5a1f]">{depegThreshold}</span>
                  </div>
                  <input type="range" min="0.90" max="0.99" step="0.01" value={depegThreshold} onChange={e => setDepegThreshold(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Smart Harvester</h3>
              <p className="text-sm text-[#dcdcd0]/70 mb-6">Auto-compound or sell rewards based on market sentiment.</p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/5">
                  <div>
                    <div className="font-medium text-white">Enable Smart Harvester</div>
                    <div className="text-xs text-[#dcdcd0]/50">Sentiment-driven reward management</div>
                  </div>
                  <button onClick={() => setHarvestEnabled(!harvestEnabled)} className={`w-12 h-6 ${harvestEnabled ? 'bg-[#ff5a1f]' : 'bg-white/10'} rounded-full relative transition-colors`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${harvestEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveStrategy}
              disabled={savingStrategy || !auth.connected}
              className="w-full py-4 bg-[#ff5a1f] hover:bg-[#e04d1a] disabled:bg-[#ff5a1f]/30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {savingStrategy ? 'Saving...' : !auth.connected ? 'Connect Wallet to Save' : 'Save Strategy Configuration'}
            </button>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Deposit</h3>
              <p className="text-sm text-[#dcdcd0]/50">
                Deposits are executed via Hedera smart contract calls through the keeper agent.
                Configure your strategy and start the keeper to manage deposits automatically.
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="text-sm text-[#dcdcd0]/70">Vault Address</div>
                <div className="font-mono text-xs text-white mt-1 break-all">{vaultData?.vault || '—'}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="text-sm text-[#dcdcd0]/70">Strategy Address</div>
                <div className="font-mono text-xs text-white mt-1 break-all">{vaultData?.strategy || '—'}</div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Withdraw</h3>
              <p className="text-sm text-[#dcdcd0]/50">
                Emergency withdrawals are triggered automatically by the de-peg circuit breaker when enabled.
                Manual withdrawals can be initiated through the Cerberus AI chat.
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="text-sm text-[#dcdcd0]/70 mb-2">Current Balances</div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">CLXY</span>
                  <span className="font-mono">{balances ? (Number(balances.amount0) / 1e8).toFixed(4) : '—'}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-white">SAUCE</span>
                  <span className="font-mono">{balances ? (Number(balances.amount1) / 1e6).toFixed(4) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in">
            <h3 className="text-lg font-semibold text-white mb-6">Vault History</h3>
            {historyLogs.length === 0 ? (
              <div className="text-center py-12 text-[#dcdcd0]/50 text-sm">No history yet. Start the keeper to see actions here.</div>
            ) : (
              <div className="space-y-4">
                {historyLogs.map((log, i) => {
                  const isRebalance = log.action.includes('RANGE') || log.action.includes('WIDEN') || log.action.includes('TIGHTEN');
                  const isHarvest = log.action.includes('HARVEST');
                  const isEmergency = log.action.includes('EMERGENCY') || log.action.includes('PANIC');
                  const color = isEmergency ? 'text-red-400' : isHarvest ? 'text-purple-400' : isRebalance ? 'text-blue-400' : 'text-yellow-400';
                  const bg = isEmergency ? 'bg-red-400/10' : isHarvest ? 'bg-purple-400/10' : isRebalance ? 'bg-blue-400/10' : 'bg-yellow-400/10';
                  const diff = Date.now() - new Date(log.timestamp).getTime();
                  const timeAgo = diff < 60000 ? `${Math.floor(diff / 1000)}s ago` : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago` : diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago` : `${Math.floor(diff / 86400000)}d ago`;

                  return (
                    <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-lg">
                      <div className={`p-2 rounded-full ${bg} ${color}`}>
                        <Activity size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">
                          <span className="font-mono text-xs mr-2">{log.action}</span>
                          {log.reason}
                        </p>
                        <p className="text-xs text-[#dcdcd0]/50 mt-1">{timeAgo}</p>
                      </div>
                      {log.txId && (
                        <a
                          href={`https://hashscan.io/testnet/transaction/${log.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#ff5a1f] hover:underline"
                        >
                          View Tx
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
