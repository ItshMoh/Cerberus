'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { Settings, ArrowDownToLine, History, Activity } from 'lucide-react';
import { toast } from 'sonner';

const positionData = [
  { price: 0.100, liquidity: 100 },
  { price: 0.105, liquidity: 150 },
  { price: 0.110, liquidity: 300 },
  { price: 0.115, liquidity: 450 },
  { price: 0.120, liquidity: 400 },
  { price: 0.125, liquidity: 200 },
  { price: 0.130, liquidity: 100 },
];

export default function VaultDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('position');
  const [depositAmount, setDepositAmount] = useState('');

  const handleDeposit = () => {
    toast.success('Deposit successful', {
      description: `Successfully deposited ${depositAmount} HBAR into the vault.`,
    });
    setDepositAmount('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Top Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border-2 border-[var(--bg-dark)] flex items-center justify-center font-bold">H</div>
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border-2 border-[var(--bg-dark)] flex items-center justify-center font-bold">U</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">HBAR/USDC Vault</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-medium text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Active
                </span>
                <span className="text-xs text-[#dcdcd0]/50">ID: {id}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Your Deposit</div>
              <div className="font-mono text-lg text-white">$5,200</div>
            </div>
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Current APY</div>
              <div className="font-mono text-lg text-green-400">24.3%</div>
            </div>
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Fees Earned</div>
              <div className="font-mono text-lg text-white">$142.50</div>
            </div>
            <div>
              <div className="text-[10px] text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Width</div>
              <div className="font-mono text-lg text-white">Narrow</div>
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
              <h3 className="text-lg font-semibold text-white mb-6">Price Range & Liquidity</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={positionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="price" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <ReferenceArea {...{ x1: 0.105, x2: 0.125, fill: "rgba(74, 222, 128, 0.1)" } as any} />
                    <ReferenceLine x={0.115} stroke="#ff5a1f" strokeDasharray="3 3" label={{ position: 'top', value: 'Current Price', fill: '#ff5a1f', fontSize: 10 }} />
                    <Bar dataKey="liquidity" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="liquidity" stroke="#dcdcd0" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <h4 className="text-sm font-medium text-[#dcdcd0]/70 mb-4">Position Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white">Token 0 (HBAR)</span>
                    <span className="font-mono">24,500 ($2,817)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Token 1 (USDC)</span>
                    <span className="font-mono">2,383 ($2,383)</span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center font-medium">
                    <span className="text-white">Total Value</span>
                    <span className="font-mono">$5,200</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <h4 className="text-sm font-medium text-[#dcdcd0]/70 mb-4">Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white">Impermanent Loss</span>
                    <span className="font-mono text-red-400">-$42.50 (-0.8%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Fees Earned</span>
                    <span className="font-mono text-green-400">+$142.50 (+2.7%)</span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center font-medium">
                    <span className="text-white">Net PnL</span>
                    <span className="font-mono text-green-400">+$100.00 (+1.9%)</span>
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
                  <div className="w-12 h-6 bg-[#ff5a1f] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">Volatility Threshold</span>
                    <span className="font-mono text-[#ff5a1f]">4.5%</span>
                  </div>
                  <input type="range" min="1" max="10" step="0.1" defaultValue="4.5" className="w-full accent-[#ff5a1f]" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">Time Window</span>
                    <span className="font-mono text-[#ff5a1f]">20 min</span>
                  </div>
                  <input type="range" min="5" max="60" step="1" defaultValue="20" className="w-full accent-[#ff5a1f]" />
                </div>

                <div>
                  <label className="block text-sm text-white mb-2">Defensive Action</label>
                  <select className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#ff5a1f]">
                    <option>Widen Range</option>
                    <option>Withdraw to Stables</option>
                  </select>
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
                  <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>

                <div className="opacity-50 pointer-events-none">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">De-peg Threshold</span>
                    <span className="font-mono text-[#ff5a1f]">0.98</span>
                  </div>
                  <input type="range" min="0.90" max="0.99" step="0.01" defaultValue="0.98" className="w-full accent-[#ff5a1f]" />
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
                  <div className="w-12 h-6 bg-[#ff5a1f] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white mb-2">Bullish Action (Score &gt; 0.5)</label>
                  <select className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#ff5a1f]">
                    <option>Auto-compound</option>
                    <option>Hold Rewards</option>
                    <option>Sell to USDC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white mb-2">Bearish Action (Score &lt; -0.5)</label>
                  <select defaultValue="Sell to USDC" className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#ff5a1f]">
                    <option>Auto-compound</option>
                    <option>Hold Rewards</option>
                    <option>Sell to USDC</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-[#ff5a1f] hover:bg-[#e04d1a] text-white rounded-lg font-medium transition-colors">
              Save Strategy Configuration
            </button>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Deposit</h3>
              <div>
                <label className="block text-sm text-[#dcdcd0]/70 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg p-4 text-white text-lg focus:outline-none focus:border-[#ff5a1f]"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button className="text-xs font-medium text-[#ff5a1f] hover:text-white transition-colors">MAX</button>
                    <span className="text-white font-medium">HBAR</span>
                  </div>
                </div>
                <div className="text-xs text-[#dcdcd0]/50 mt-2 text-right">Balance: 12,450 HBAR</div>
              </div>
              <button
                onClick={handleDeposit}
                className="w-full py-4 bg-[#ff5a1f] hover:bg-[#e04d1a] text-white rounded-lg font-medium transition-colors"
              >
                Deposit
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Withdraw</h3>
              <div>
                <label className="block text-sm text-[#dcdcd0]/70 mb-2">Amount to Withdraw</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {['25%', '50%', '75%', '100%'].map(pct => (
                    <button key={pct} className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-white transition-colors">
                      {pct}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg p-4 text-white text-lg focus:outline-none focus:border-[#ff5a1f]"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-white font-medium">Shares</span>
                  </div>
                </div>
              </div>
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors">
                Withdraw
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in">
            <h3 className="text-lg font-semibold text-white mb-6">Vault History</h3>
            <div className="space-y-4">
              {[
                { type: 'rebalance', text: 'Widened range on HBAR/USDC vault — 4.5% spike', time: '10 mins ago', color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { type: 'harvest', text: 'Harvested SAUCE rewards — bearish sentiment (-0.6)', time: '2 hours ago', color: 'text-purple-400', bg: 'bg-purple-400/10' },
                { type: 'deposit', text: 'Deposited 5,000 HBAR', time: '2 days ago', color: 'text-green-400', bg: 'bg-green-400/10' },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-lg">
                  <div className={`p-2 rounded-full ${activity.bg} ${activity.color}`}>
                    <Activity size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{activity.text}</p>
                    <p className="text-xs text-[#dcdcd0]/50 mt-1">{activity.time}</p>
                  </div>
                  <button className="text-xs text-[#ff5a1f] hover:underline">View Tx</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
