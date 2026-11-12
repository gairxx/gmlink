import React from 'react';
import { GmVehicleBusSimulator } from '../lib/gmlan/busSimulator';
import { VehicleTelemetry } from '../lib/gmlan/types';
import { Power, Lock, Unlock, Compass, Gauge, AlertCircle } from 'lucide-react';

interface VehicleControlsProps {
  simulator: GmVehicleBusSimulator;
  telemetry: VehicleTelemetry;
  onUpdate: () => void;
}

export const VehicleControls: React.FC<VehicleControlsProps> = ({
  simulator,
  telemetry,
  onUpdate,
}) => {
  const handleIgnition = () => {
    simulator.engineRunning = !simulator.engineRunning;
    onUpdate();
  };

  const handleThrottle = (val: number) => {
    simulator.throttlePct = val;
    onUpdate();
  };

  const handleBrake = (val: number) => {
    simulator.brakePosPct = val;
    simulator.brakePressed = val > 0;
    onUpdate();
  };

  const handleSteering = (val: number) => {
    simulator.steeringAngleDeg = val;
    onUpdate();
  };

  const handleGear = (gear: 'P' | 'R' | 'N' | 'D') => {
    simulator.gear = gear;
    onUpdate();
  };

  const handleLocks = () => {
    simulator.doorsLocked = !simulator.doorsLocked;
    onUpdate();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">
            VEHICLE OPERATOR BENCH
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Simulated GM Vehicle Physical Controls
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ignition & Power */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 mb-2">
            ENGINE IGNITION
          </div>
          <button
            onClick={handleIgnition}
            className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              telemetry.engineRunning
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{telemetry.engineRunning ? 'STOP ENGINE' : 'START ENGINE'}</span>
          </button>
          <div className="text-[10px] font-mono text-slate-500 mt-2 text-center">
            {telemetry.engineRunning ? 'ECM RUNNING · 14.2V ALT' : 'IGNITION OFF · 12.3V BATT'}
          </div>
        </div>

        {/* Transmission PRNDL */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 mb-2">
            TRANSMISSION SHIFTER
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['P', 'R', 'N', 'D'] as const).map((g) => (
              <button
                key={g}
                onClick={() => handleGear(g)}
                className={`py-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                  telemetry.gear === g
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2 text-center">
            Current: {telemetry.gear === 'P' ? 'Park' : telemetry.gear === 'R' ? 'Reverse' : telemetry.gear === 'N' ? 'Neutral' : 'Drive'}
          </div>
        </div>

        {/* Accelerator / Throttle Slider */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
            <span>ACCELERATOR (0x0C9)</span>
            <span className="text-cyan-400 font-bold tabular-nums">
              {simulator.throttlePct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={simulator.throttlePct}
            onChange={(e) => handleThrottle(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>Idle (0%)</span>
            <span>WOT (100%)</span>
          </div>
        </div>

        {/* Brake & Steering Controls */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
            <span>BRAKE PEDAL (0x0C9)</span>
            <span className="text-rose-400 font-bold tabular-nums">
              {simulator.brakePosPct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={simulator.brakePosPct}
            onChange={(e) => handleBrake(parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>Released</span>
            <span>Full Stop</span>
          </div>
        </div>
      </div>

      {/* Steering Angle Slider */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Steering Wheel (0x05B):</span>
          <span className="text-white font-bold tabular-nums">
            {simulator.steeringAngleDeg > 0 ? `+${simulator.steeringAngleDeg}°` : `${simulator.steeringAngleDeg}°`}
          </span>
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="range"
            min="-180"
            max="180"
            step="5"
            value={simulator.steeringAngleDeg}
            onChange={(e) => handleSteering(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
        </div>
        <button
          onClick={() => handleSteering(0)}
          className="px-2.5 py-1 text-xs font-mono bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 cursor-pointer"
        >
          Center (0°)
        </button>

        {/* Lock Switch */}
        <button
          onClick={handleLocks}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
        >
          {telemetry.doorsLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Doors: LOCKED</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Doors: UNLOCKED</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
