import React, { useState } from 'react';
import { GmlanAdapterEngine } from '../lib/gmlan/adapter';
import { DeviceControlRoutine, VehicleTelemetry } from '../lib/gmlan/types';
import { createDeviceControlFrame } from '../lib/gmlan/uds';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Disc,
  Flame,
  Gauge,
  HelpCircle,
  Play,
  RotateCcw,
  ShieldAlert,
  Wind,
  Zap,
} from 'lucide-react';

interface DeviceControlViewProps {
  adapter: GmlanAdapterEngine;
  telemetry: VehicleTelemetry;
}

export const DeviceControlView: React.FC<DeviceControlViewProps> = ({ adapter, telemetry }) => {
  const [selectedCyl, setSelectedCyl] = useState<number>(1);
  const activeRoutine = adapter.simulator.deviceControl.activeRoutine;
  const watchdogSec = adapter.simulator.deviceControl.watchdogRemainingSec;
  const isSpeedLocked = telemetry.vehicleSpeedMph > 0;

  const handleExecuteRoutine = (routine: DeviceControlRoutine, param: number = 0) => {
    if (isSpeedLocked && routine !== 'RETURN_TO_NORMAL') {
      alert(`Safety Lockout Active: Cannot command active chassis/actuator override while vehicle speed is ${telemetry.vehicleSpeedMph.toFixed(1)} mph. Bring vehicle to a complete stop.`);
      return;
    }

    const frame = createDeviceControlFrame(routine, 0x03, param);
    adapter.transmitFrame(frame);
  };

  const handleReturnToNormal = () => {
    const frame = createDeviceControlFrame('RETURN_TO_NORMAL', 0x20);
    adapter.transmitFrame(frame);
    adapter.simulator.returnToNormalMode('USER_EXIT');
  };

  return (
    <div className="space-y-6">
      {/* Top Warning Banner / Interlock Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                GM MODE $AE / UDS 0x2F DEVICE CONTROL & ACTUATOR OVERRIDES
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Active bidirectional actuator overriding. Enforces automatic ReturnToNormalMode ($20) watchdog fail-safe.
            </p>
          </div>

          {/* Emergency Return to Factory Control Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReturnToNormal}
              className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>RETURN TO NORMAL MODE ($20)</span>
            </button>
          </div>
        </div>

        {/* Watchdog Countdown & Active Test Status */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              WATCHDOG FAIL-SAFE
            </span>
            <span
              className={`font-bold tabular-nums text-sm ${
                activeRoutine ? 'text-amber-400 animate-pulse' : 'text-slate-400'
              }`}
            >
              {activeRoutine ? `${watchdogSec}s REMAINING` : '10s (IDLE)'}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              SPEED LOCKOUT
            </span>
            <span
              className={`font-bold ${
                isSpeedLocked ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isSpeedLocked ? `BLOCKED (${telemetry.vehicleSpeedMph.toFixed(0)} MPH)` : 'ARMED (0 MPH)'}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              ACTIVE ROUTINE
            </span>
            <span className="text-cyan-400 font-bold truncate max-w-[140px]">
              {activeRoutine || 'NORMAL OPERATION'}
            </span>
          </div>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Test 1: Gauge Sweep */}
        <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-colors ${activeRoutine === 'GAUGE_SWEEP' ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Cluster Gauge Sweep</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              0xAE 01 03
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4 min-h-[2.5rem]">
            Full scale sweep of speedometer to 160 MPH and tachometer to 8000 RPM to verify analog stepper motors.
          </p>
          <button
            onClick={() => handleExecuteRoutine('GAUGE_SWEEP')}
            disabled={isSpeedLocked}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>COMMAND GAUGE SWEEP</span>
          </button>
        </div>

        {/* Test 2: Indicator Bulb Check */}
        <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-colors ${activeRoutine === 'BULB_CHECK' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Warning Lamp Bulb Check</h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              0xAE 02 03
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4 min-h-[2.5rem]">
            Illuminates all cluster warning lamps: Check Engine, ABS, StabiliTrak, Airbag, Oil Pressure, and TPMS.
          </p>
          <button
            onClick={() => handleExecuteRoutine('BULB_CHECK')}
            disabled={isSpeedLocked}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>ILLUMINATE ALL LAMPS</span>
          </button>
        </div>

        {/* Test 3: ABS Bleed Routine */}
        <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-colors ${activeRoutine === 'ABS_BLEED' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Disc className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">ABS Automated Bleed</h3>
            </div>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
              0xAE 03 03
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4 min-h-[2.5rem]">
            Cycles the EBCM hydraulic pump motor and opens inlet/outlet solenoid valves sequentially across 4 wheels.
          </p>
          <button
            onClick={() => handleExecuteRoutine('ABS_BLEED')}
            disabled={isSpeedLocked}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-rose-300 border border-rose-500/40 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>CYCLE ABS VALVES & PUMP</span>
          </button>
        </div>

        {/* Test 4: EVAP Purge & Fuel Pump Prime */}
        <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-colors ${activeRoutine === 'EVAP_PURGE_VENT' ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">EVAP Solenoid & Fuel Prime</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              0xAE 04 03
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4 min-h-[2.5rem]">
            Activates canister purge and vent solenoids, and engages high-pressure fuel pump relay for 5 seconds.
          </p>
          <button
            onClick={() => handleExecuteRoutine('EVAP_PURGE_VENT')}
            disabled={isSpeedLocked}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>ACTIVATE EVAP & FUEL PUMP</span>
          </button>
        </div>

        {/* Test 5: Cooling Fan Control (Low / High) */}
        <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-colors ${activeRoutine === 'COOLING_FAN_LOW' || activeRoutine === 'COOLING_FAN_HIGH' ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Cooling Fan Relays</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              0xAE 06 / 07
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4 min-h-[2.5rem]">
            Commands dual radiator electric cooling fan relays to verify low (50%) and high (100%) duty speed operation.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExecuteRoutine('COOLING_FAN_LOW')}
              disabled={isSpeedLocked}
              className="py-2.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              LOW (50%)
            </button>
            <button
              onClick={() => handleExecuteRoutine('COOLING_FAN_HIGH')}
              disabled={isSpeedLocked}
              className="py-2.5 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              HIGH (100%)
            </button>
          </div>
        </div>

        {/* Test 6: Cylinder Power Balance / Injector Cutout */}
        <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-colors ${activeRoutine === 'CYLINDER_CUTOUT' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Cylinder Power Balance</h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              0xAE 10 [Cyl]
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Cuts fuel injector to individual cylinder (1-8). Observe RPM drop to isolate weak cylinder combustion.
          </p>
          <div className="flex items-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCyl(c)}
                className={`flex-1 py-1 text-xs font-mono rounded border cursor-pointer ${
                  selectedCyl === c
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                C{c}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleExecuteRoutine('CYLINDER_CUTOUT', selectedCyl)}
            disabled={isSpeedLocked}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>CUTOUT CYLINDER {selectedCyl}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
