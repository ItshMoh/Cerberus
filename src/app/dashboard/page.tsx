'use client';

import React, { useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceDot, ReferenceLine } from 'recharts';
import { Shield, Activity, Vault, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import Link from 'next/link';

const portfolioData = [
  { time: '00:00', value: 121000 },
  { time: '04:00', value: 122500 },
  { time: '08:00', value: 124200 },
  { time: '12:00', value: 123800 },
  { time: '16:00', value: 125100 },
  { time: '20:00', value: 124900 },
  { time: '24:00', value: 125430 },
];

const volatilityData = [
  { time: '10:00', price: 0.112 },
  { time: '10:10', price: 0.114 },
  { time: '10:20', price: 0.118, spike: true },
  { time: '10:30', price: 0.115 },
  { time: '10:40', price: 0.113 },
  { time: '10:50', price: 0.111 },
  { time: '11:00', price: 0.112 },
];

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

export default function DashboardOverview() {
  const [timeframe, setTimeframe] = useState('24H');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Value Locked" value="$125,430" change="3.2% (24h)" trend="up" icon={Vault} />
        <StatCard title="Active Vaults" value="3" icon={Shield} />
        <StatCard title="Agent Actions (24h)" value="12" icon={Activity} />
        <SentimentGauge score={0.65} label="Bullish" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Portfolio Performance</h3>
            <div className="flex bg-white/5 rounded-lg p-1">
              {['24H', '7D', '30D'].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeframe === t ? 'bg-[#ff5a1f] text-white' : 'text-[#dcdcd0]/70 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5a1f" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff5a1f" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#ff5a1f" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Volatility Monitor (HBAR/USDC)</h3>
            <div className="text-xs text-[#dcdcd0]/70">Last 60 min</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volatilityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 0.002', 'dataMax + 0.002']} stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <ReferenceArea {...{ y1: 0.111, y2: 0.115, fill: "rgba(74, 222, 128, 0.1)" } as any} />
                <ReferenceLine y={0.112} stroke="#ff5a1f" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="price" stroke="#dcdcd0" strokeWidth={1.5} dot={false} />
                {volatilityData.map((entry, index) => entry.spike && (
                  <ReferenceDot key={index} x={entry.time} y={entry.price} r={4} fill="#ef4444" stroke="none" />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-xs text-center text-[#dcdcd0]/70">
            Current delta: <span className="text-red-400">4.5%</span> in last 20min
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Active Vaults</h2>
          <Link href="/dashboard/vaults" className="text-sm text-[#ff5a1f] hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VaultCard id="1" name="HBAR/USDC" tokens={['HBAR', 'USDC']} tvl="$45,200" apy="24.3%" position="$5,200" range="Narrow (±2.5%)" status="Active" />
          <VaultCard id="2" name="SAUCE/HBAR" tokens={['SAUCE', 'HBAR']} tvl="$12,400" apy="42.1%" position="$1,800" range="Wide (±10%)" status="Active" />
          <VaultCard id="3" name="USDC/USDT" tokens={['USDC', 'USDT']} tvl="$890,000" apy="8.5%" position="$12,500" range="Peg (±0.5%)" status="Active" />
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Recent Agent Activity</h3>
          <Link href="/dashboard/audit-log" className="text-sm text-[#ff5a1f] hover:underline">View Full Log</Link>
        </div>
        <div className="space-y-4">
          {[
            { type: 'rebalance', text: 'Widened range on HBAR/USDC vault — 4.5% spike', time: '10 mins ago', color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { type: 'harvest', text: 'Harvested SAUCE rewards — bearish sentiment (-0.6)', time: '2 hours ago', color: 'text-purple-400', bg: 'bg-purple-400/10' },
            { type: 'alert', text: 'Emergency exit on USDC/USDT vault — peg at 0.975', time: '1 day ago', color: 'text-red-400', bg: 'bg-red-400/10' },
          ].map((activity, i) => (
            <div key={i} className="flex items-start gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors">
              <div className={`p-2 rounded-full ${activity.bg} ${activity.color}`}>
                <Activity size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{activity.text}</p>
                <p className="text-xs text-[#dcdcd0]/50 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
