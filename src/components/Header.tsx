import React from 'react';
import { Shield, ShieldAlert, Cpu, Activity, Radio } from 'lucide-react';
import { AdapterHandshakeStatus } from '../lib/gmlan/adapter';
import { BusType } from '../lib/gmlan/types';

export type ActiveTab =
  | 'telemetry'
  | 'dic'
  | 'device_control'
  | 'mode06_dtc'
  | 'sniffer'
  | 'uds_session'
  | 'tests'
  | 'docs';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  status: AdapterHandshakeStatus;
  onToggleConnect: () => void;
  onSwitchBus: (bus: BusType) => void;
  onToggleListenOnly: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  status,
  onToggleConnect,
  onSwitchBus,
  onToggleListenOnly,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950 px-6 py-3.5 text-slate-100 sticky top-0 z-50">
      <div className="flex items-center justify-between gap-8 max-w-7xl mx-auto">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
            GM
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              GMLAN ProLink
            </span>
            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
              SW-CAN 33.3k · HS-CAN 500k · Mode $AE
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'telemetry' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Live Telemetry
          </button>
          <button
            onClick={() => setActiveTab('dic')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'dic' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Cluster & DIC
          </button>
          <button
            onClick={() => setActiveTab('device_control')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'device_control' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Device Control ($AE)
          </button>
          <button
            onClick={() => setActiveTab('mode06_dtc')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'mode06_dtc' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Mode $06 & DTCs
          </button>
          <button
            onClick={() => setActiveTab('sniffer')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'sniffer' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            CAN Bus Sniffer
          </button>
          <button
            onClick={() => setActiveTab('uds_session')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'uds_session' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            ISO 14229 / UDS
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'tests' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Verification Tests
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'docs' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            GMLAN Bible
          </button>
        </nav>

        {/* Zone 3: Hardware State & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Bus Selector */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            <button
              onClick={() => onSwitchBus('HS_CAN')}
              className={`px-2.5 py-1 rounded transition-colors ${
                status.selectedBus === 'HS_CAN'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Powertrain High-Speed 500 kbps (Pins 6 & 14)"
            >
              HS-CAN 500k
            </button>
            <button
              onClick={() => onSwitchBus('SW_CAN')}
              className={`px-2.5 py-1 rounded transition-colors ${
                status.selectedBus === 'SW_CAN'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Body / DIC Single-Wire 33.333 kbps (Pin 1)"
            >
              SW-CAN 33.3k
            </button>
          </div>

          {/* Safety Listen-Only Mode Toggle */}
          <button
            onClick={onToggleListenOnly}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors border ${
              status.listenOnlyMode
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-600/70 text-amber-300 hover:bg-amber-900/40'
            }`}
            title={status.listenOnlyMode ? 'Listen-Only Mode (Passive). Click to Unlock Transmission.' : 'Active Transmission Enabled. Click to Engage Listen-Only.'}
          >
            {status.listenOnlyMode ? (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Listen-Only</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">TX Unlocked</span>
              </>
            )}
          </button>

          {/* Connect / Disconnect */}
          <button
            onClick={onToggleConnect}
            disabled={status.isConnecting}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              status.isConnected
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{status.isConnecting ? 'Connecting...' : status.isConnected ? 'Disconnect' : 'Connect Adapter'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Links Row */}
      <div className="flex xl:hidden items-center gap-3 overflow-x-auto pt-3 border-t border-slate-800/60 mt-2 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'telemetry' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Telemetry
        </button>
        <button
          onClick={() => setActiveTab('dic')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'dic' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Cluster & DIC
        </button>
        <button
          onClick={() => setActiveTab('device_control')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'device_control' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Device Control ($AE)
        </button>
        <button
          onClick={() => setActiveTab('mode06_dtc')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'mode06_dtc' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Mode $06 & DTCs
        </button>
        <button
          onClick={() => setActiveTab('sniffer')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'sniffer' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          CAN Sniffer
        </button>
        <button
          onClick={() => setActiveTab('uds_session')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'uds_session' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          UDS & Security
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'tests' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Tests
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'docs' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          GMLAN Bible
        </button>
      </div>
    </header>
  );
};
