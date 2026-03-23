'use client';

import React, { useState } from 'react';
import { Wallet, Bell, ShieldAlert, Copy, CheckCircle2, Activity, Brain, AlertTriangle, Power, Info, Save, History } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [copied, setCopied] = useState(false);

  const [masterToggle, setMasterToggle] = useState(true);
  const [volCheckInt, setVolCheckInt] = useState(1);
  const [depegCheckInt, setDepegCheckInt] = useState(10);
  const [harvestCheckInt, setHarvestCheckInt] = useState(4);

  const [autoRebalance, setAutoRebalance] = useState(true);
  const [volThreshold, setVolThreshold] = useState(3.0);
  const [timeWindow, setTimeWindow] = useState(20);
  const [narrowWidth, setNarrowWidth] = useState(100);
  const [wideWidth, setWideWidth] = useState(400);
  const [cooldown, setCooldown] = useState(5);
  const [settleMultiplier, setSettleMultiplier] = useState(2);

  const [depegProtection, setDepegProtection] = useState(true);
  const [stablecoinFeed, setStablecoinFeed] = useState('USDC/USD');
  const [warningThreshold, setWarningThreshold] = useState(0.99);
  const [criticalThreshold, setCriticalThreshold] = useState(0.98);

  const [smartHarvester, setSmartHarvester] = useState(true);
  const [rewardToken, setRewardToken] = useState('SAUCE');
  const [bearishThreshold, setBearishThreshold] = useState(-0.2);
  const [bullishThreshold, setBullishThreshold] = useState(0.2);
  const [harvestInterval, setHarvestInterval] = useState(240);

  const [inAppToasts, setInAppToasts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  const [panicText, setPanicText] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText('0x1234...5678');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Address copied to clipboard');
  };

  const handleSaveStrategy = () => {
    toast.success('Strategy saved', {
      description: 'Keeper will use your new settings on the next cycle.',
    });
  };

  const handlePanic = () => {
    if (panicText === 'PANIC') {
      toast.error('Emergency Exit Initiated', {
        description: 'Withdrawing all funds from active vaults to your wallet.',
      });
      setPanicText('');
    }
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full relative transition-colors ${enabled ? 'bg-[#ff5a1f]' : 'bg-white/10'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Settings</h1>
        <p className="text-sm text-[#dcdcd0]/70">Global configuration, wallet management, and notifications.</p>
      </div>

      {/* 1. Wallet Connection */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="text-[#ff5a1f]" size={24} />
          <h2 className="text-xl font-semibold text-white">Wallet Connection</h2>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-[#2a2a2a] border border-white/5 rounded-lg p-4">
          <div>
            <div className="text-xs text-[#dcdcd0]/50 uppercase tracking-wider mb-1">Connected Address</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white text-lg">0x1234...5678</span>
              <button onClick={handleCopy} className="text-[#dcdcd0]/50 hover:text-white transition-colors">
                {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-[#dcdcd0]/70">Account ID: 0.0.123456</span>
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-mono text-[#c2c2a3]">Testnet</span>
            </div>
          </div>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors">
            Disconnect
          </button>
        </div>
      </section>

      {/* 2. Keeper Configuration */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-[#ff5a1f]" size={24} />
            <h2 className="text-xl font-semibold text-white">Keeper Configuration</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white font-medium">Master Toggle</span>
            <Toggle enabled={masterToggle} onChange={() => setMasterToggle(!masterToggle)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#dcdcd0]/70">Volatility Check</span>
              <span className="font-mono text-white">{volCheckInt} min</span>
            </div>
            <input type="range" min="1" max="5" step="1" value={volCheckInt} onChange={e => setVolCheckInt(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#dcdcd0]/70">De-peg Check</span>
              <span className="font-mono text-white">{depegCheckInt} sec</span>
            </div>
            <input type="range" min="10" max="60" step="10" value={depegCheckInt} onChange={e => setDepegCheckInt(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#dcdcd0]/70">Harvest Check</span>
              <span className="font-mono text-white">{harvestCheckInt} hours</span>
            </div>
            <input type="range" min="1" max="24" step="1" value={harvestCheckInt} onChange={e => setHarvestCheckInt(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
          </div>
        </div>
      </section>

      {/* 3. Volatility-Aware Range Manager */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="text-[#ff5a1f]" size={24} />
            <h2 className="text-xl font-semibold text-white">Volatility-Aware Range Manager</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white font-medium">Auto-Rebalance</span>
            <Toggle enabled={autoRebalance} onChange={() => setAutoRebalance(!autoRebalance)} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Volatility Threshold</span>
                <span className="font-mono text-white">{volThreshold}%</span>
              </div>
              <input type="range" min="0.1" max="20" step="0.1" value={volThreshold} onChange={e => setVolThreshold(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Time Window</span>
                <span className="font-mono text-white">{timeWindow} min</span>
              </div>
              <input type="range" min="1" max="120" step="1" value={timeWindow} onChange={e => setTimeWindow(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#dcdcd0]/70 mb-1">Narrow Width</label>
              <input type="number" value={narrowWidth} onChange={e => setNarrowWidth(Number(e.target.value))} className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ff5a1f] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#dcdcd0]/70 mb-1">Wide Width</label>
              <input type="number" value={wideWidth} onChange={e => setWideWidth(Number(e.target.value))} className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ff5a1f] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#dcdcd0]/70 mb-1">Cooldown (min)</label>
              <input type="number" value={cooldown} onChange={e => setCooldown(Number(e.target.value))} className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ff5a1f] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-[#dcdcd0]/70 mb-1">Settle Multiplier</label>
              <input type="number" value={settleMultiplier} onChange={e => setSettleMultiplier(Number(e.target.value))} className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ff5a1f] focus:outline-none" />
            </div>
          </div>

          <div className="bg-[#2a2a2a] border border-white/5 rounded-lg p-4 flex gap-3 items-start">
            <Info className="text-[#ff5a1f] shrink-0 mt-0.5" size={18} />
            <div className="space-y-2">
              <p className="text-sm text-[#dcdcd0]/80">
                If HBAR/USD moves more than {volThreshold}% within {timeWindow} minutes, the range automatically widens to {wideWidth}. Once calm for {settleMultiplier * timeWindow} minutes, it tightens back to {narrowWidth}.
              </p>
              <p className="text-sm text-white font-medium">
                Current rule: Widen to {wideWidth} if price moves {volThreshold}% in {timeWindow}min. Tighten to {narrowWidth} after {settleMultiplier * timeWindow}min of calm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. De-peg Circuit Breaker */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-[#ff5a1f]" size={24} />
            <h2 className="text-xl font-semibold text-white">De-peg Circuit Breaker</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white font-medium">Circuit Breaker</span>
            <Toggle enabled={depegProtection} onChange={() => setDepegProtection(!depegProtection)} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[#dcdcd0]/70 mb-2">Monitored Stablecoin Feed</label>
            <select
              value={stablecoinFeed}
              onChange={e => setStablecoinFeed(e.target.value)}
              className="w-full md:w-64 bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ff5a1f] focus:outline-none"
            >
              <option value="USDC/USD">USDC/USD</option>
              <option value="USDT/USD">USDT/USD</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Warning Threshold</span>
                <span className="font-mono text-white">{warningThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="0.90" max="1.00" step="0.01" value={warningThreshold} onChange={e => setWarningThreshold(Number(e.target.value))} className="w-full accent-yellow-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Critical Threshold</span>
                <span className="font-mono text-red-400">{criticalThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="0.80" max="0.99" step="0.01" value={criticalThreshold} onChange={e => setCriticalThreshold(Number(e.target.value))} className="w-full accent-red-500" />
            </div>
          </div>

          <div className="bg-[#2a2a2a] border border-white/5 rounded-lg p-4 flex gap-3 items-start">
            <Info className="text-[#ff5a1f] shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-[#dcdcd0]/80">
              If the stablecoin price drops below {criticalThreshold.toFixed(2)}, the agent calls panic() to withdraw all liquidity and moves funds to a safe HBAR lending pool.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Smart Harvester */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="text-[#ff5a1f]" size={24} />
            <h2 className="text-xl font-semibold text-white">Smart Harvester</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white font-medium">Sentiment Harvester</span>
            <Toggle enabled={smartHarvester} onChange={() => setSmartHarvester(!smartHarvester)} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[#dcdcd0]/70 mb-2">Reward Token Symbol</label>
            <input
              type="text"
              value={rewardToken}
              onChange={e => setRewardToken(e.target.value)}
              className="w-full md:w-64 bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ff5a1f] focus:outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Bearish Threshold</span>
                <span className="font-mono text-white">{bearishThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="-1.0" max="0" step="0.1" value={bearishThreshold} onChange={e => setBearishThreshold(Number(e.target.value))} className="w-full accent-red-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Bullish Threshold</span>
                <span className="font-mono text-white">{bullishThreshold.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1.0" step="0.1" value={bullishThreshold} onChange={e => setBullishThreshold(Number(e.target.value))} className="w-full accent-green-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dcdcd0]/70">Harvest Interval</span>
                <span className="font-mono text-white">{harvestInterval} min</span>
              </div>
              <input type="range" min="10" max="1440" step="10" value={harvestInterval} onChange={e => setHarvestInterval(Number(e.target.value))} className="w-full accent-[#ff5a1f]" />
            </div>
          </div>

          <div className="bg-[#2a2a2a] border border-white/5 rounded-lg p-4 flex gap-3 items-start">
            <Info className="text-[#ff5a1f] shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-[#dcdcd0]/80">
              Bearish sentiment → harvest immediately and swap to USDC. Bullish → delay harvest. Neutral → harvest on normal schedule.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Save Strategy */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveStrategy}
          className="flex items-center gap-2 px-6 py-3 bg-[#ff5a1f] hover:bg-[#e04d1a] text-white rounded-lg font-medium transition-colors shadow-lg shadow-[#ff5a1f]/20"
        >
          <Save size={18} />
          Save Strategy
        </button>
      </div>

      {/* 7. Notifications */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="text-[#ff5a1f]" size={24} />
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-white/5 rounded-lg">
            <div>
              <div className="font-medium text-white">In-App Toasts</div>
              <div className="text-xs text-[#dcdcd0]/50 mt-1">Show popup notifications for agent actions.</div>
            </div>
            <Toggle enabled={inAppToasts} onChange={() => setInAppToasts(!inAppToasts)} />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-white/5 rounded-lg">
            <div>
              <div className="font-medium text-white">Critical Sound Alerts</div>
              <div className="text-xs text-[#dcdcd0]/50 mt-1">Play a sound when a de-peg or emergency exit occurs.</div>
            </div>
            <Toggle enabled={soundAlerts} onChange={() => setSoundAlerts(!soundAlerts)} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <History size={16} className="text-[#dcdcd0]/70" />
            Recent Notification History
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {[
              { time: '10 mins ago', msg: 'Harvested 150 SAUCE (Neutral sentiment)', type: 'info' },
              { time: '2 hours ago', msg: 'Range widened to 400 (Volatility spike detected)', type: 'warning' },
              { time: '5 hours ago', msg: 'Range tightened to 100 (Market calm)', type: 'success' },
              { time: '1 day ago', msg: 'Strategy settings updated', type: 'info' },
            ].map((notif, i) => (
              <div key={i} className="flex items-start justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${notif.type === 'warning' ? 'bg-yellow-500' : notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-sm text-[#dcdcd0]">{notif.msg}</span>
                </div>
                <span className="text-xs text-[#dcdcd0]/50 whitespace-nowrap ml-4">{notif.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Danger Zone */}
      <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="text-xl font-semibold text-red-500">Danger Zone</h2>
        </div>
        <p className="text-sm text-[#dcdcd0]/70 mb-6">Emergency actions that immediately affect your portfolio.</p>

        <div className="bg-[#2a2a2a] border border-red-500/20 rounded-lg p-4">
          <h3 className="font-medium text-white mb-2">Panic All Vaults</h3>
          <p className="text-xs text-[#dcdcd0]/50 mb-4">
            This will immediately withdraw all funds from all active vaults and return them to your wallet.
            This action cannot be undone and may incur high gas fees.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Type PANIC to confirm"
              value={panicText}
              onChange={(e) => setPanicText(e.target.value)}
              className="flex-1 bg-[#413e35] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handlePanic}
              disabled={panicText !== 'PANIC'}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Power size={16} />
              Emergency Exit
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
