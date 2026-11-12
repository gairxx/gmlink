/**
 * GMLAN ProLink - GM OBD-II Vehicle Diagnostic & Telemetry Suite
 * High-Speed & Low-Speed GMLAN Architecture Platform
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Header, ActiveTab } from './components/Header';
import { GaugeCluster } from './components/GaugeCluster';
import { VehicleControls } from './components/VehicleControls';
import { DicDisplay } from './components/DicDisplay';
import { DeviceControlView } from './components/DeviceControlView';
import { Mode06DtcView } from './components/Mode06DtcView';
import { CanSnifferView } from './components/CanSnifferView';
import { UdsSessionView } from './components/UdsSessionView';
import { UnitTestsView } from './components/UnitTestsView';
import { DocumentationView } from './components/DocumentationView';
import { GmlanAdapterEngine, AdapterHandshakeStatus } from './lib/gmlan/adapter';
import { BusType, VehicleTelemetry } from './lib/gmlan/types';
import { Activity, ShieldAlert, Cpu, Radio } from 'lucide-react';

export default function App() {
  // Instantiate adapter engine once
  const adapter = useMemo(() => new GmlanAdapterEngine(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');
  const [status, setStatus] = useState<AdapterHandshakeStatus>(adapter.status);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(() =>
    adapter.simulator.getTelemetrySnapshot()
  );
  const [, setRerender] = useState({});

  useEffect(() => {
    // Subscribe to status and telemetry updates
    const unsubStatus = adapter.subscribeStatus((newStatus) => setStatus(newStatus));
    const unsubTelem = adapter.subscribeTelemetry((newTelem) => setTelemetry(newTelem));

    // Connect automatically to Virtual CAN Bus (vcan0) on startup for instant live interactive feedback
    adapter.connectVirtual().catch(console.error);

    return () => {
      unsubStatus();
      unsubTelem();
      adapter.disconnect();
    };
  }, [adapter]);

  const handleToggleConnect = () => {
    if (status.isConnected) {
      adapter.disconnect();
    } else {
      adapter.connectVirtual().catch(console.error);
    }
  };

  const handleSwitchBus = (bus: BusType) => {
    adapter.switchBus(bus);
  };

  const handleToggleListenOnly = () => {
    adapter.setListenOnlyMode(!status.listenOnlyMode);
  };

  const handleControlsUpdate = () => {
    setRerender({});
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        onToggleConnect={handleToggleConnect}
        onSwitchBus={handleSwitchBus}
        onToggleListenOnly={handleToggleListenOnly}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Active Tab View Rendering */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <GaugeCluster telemetry={telemetry} />
            <VehicleControls
              simulator={adapter.simulator}
              telemetry={telemetry}
              onUpdate={handleControlsUpdate}
            />
          </div>
        )}

        {activeTab === 'dic' && (
          <DicDisplay adapter={adapter} telemetry={telemetry} />
        )}

        {activeTab === 'device_control' && (
          <DeviceControlView adapter={adapter} telemetry={telemetry} />
        )}

        {activeTab === 'mode06_dtc' && <Mode06DtcView adapter={adapter} />}

        {activeTab === 'sniffer' && <CanSnifferView adapter={adapter} />}

        {activeTab === 'uds_session' && <UdsSessionView adapter={adapter} />}

        {activeTab === 'tests' && <UnitTestsView />}

        {activeTab === 'docs' && <DocumentationView />}
      </main>

      {/* Footer System Status Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 px-6 py-3 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  status.isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-300">
                {status.isConnected ? status.adapterModel : 'Offline / Disconnected'}
              </span>
            </div>

            <span className="text-slate-600">·</span>

            <span className="text-slate-400">
              Protocol: <strong className="text-cyan-400">{status.selectedBus === 'HS_CAN' ? 'HS-CAN (500k)' : 'SW-CAN (33.3k STP 62)'}</strong>
            </span>

            <span className="text-slate-600">·</span>

            <span className="text-slate-400">
              Bus Voltage: <strong className="text-slate-200">{telemetry.busVoltage12V.toFixed(2)}V</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>ISO 14229 / ISO 15765-2 / GM Mode $AE Specification</span>
            <span className="text-slate-600">·</span>
            <span>TesterPresent 0x3E Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
