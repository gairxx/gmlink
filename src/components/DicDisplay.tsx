import React, { useState } from 'react';
import { GmlanAdapterEngine } from '../lib/gmlan/adapter';
import { playGmChime } from '../lib/gmlan/audioChimes';
import {
  encode0x004,
  encode0x00F,
  encode0x045,
  encode0x064,
  encode0x182,
  encode0x185,
  encode0x186Frames,
} from '../lib/gmlan/messages';
import { DicIcons, HvacStatus, RfaFunction, VehicleTelemetry } from '../lib/gmlan/types';
import {
  Bell,
  CheckCircle2,
  Fan,
  Flame,
  Key,
  KeyRound,
  Lightbulb,
  Radio,
  Sliders,
  Sparkles,
  Thermometer,
  Volume2,
} from 'lucide-react';

interface DicDisplayProps {
  adapter: GmlanAdapterEngine;
  telemetry: VehicleTelemetry;
}

export const DicDisplay: React.FC<DicDisplayProps> = ({ adapter, telemetry }) => {
  // DIC text inputs
  const [line1Input, setLine1Input] = useState('TRACK MODE ON');
  const [line2Input, setLine2Input] = useState('LAP TIME 01:24.8');
  const [dispMode, setDispMode] = useState<'NORMAL' | 'FLASH' | 'SCROLL' | 'PRIORITY_POPUP'>('NORMAL');

  // Chime inputs
  const [chimeTone, setChimeTone] = useState<'REMINDER' | 'WARNING' | 'CRITICAL' | 'KEY_IN_IGNITION' | 'SEATBELT'>('WARNING');
  const [chimeVolume, setChimeVolume] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [chimeRepeat, setChimeRepeat] = useState(3);

  // Local icon editing state
  const [icons, setIcons] = useState<DicIcons>({ ...telemetry.dic.icons });

  // HVAC state
  const [localHvac, setLocalHvac] = useState<HvacStatus>({ ...telemetry.hvac });

  // Send DIC Text via 0x185 & 0x186 multi-frame packets
  const handleSendDicText = () => {
    // 1. Send layout params 0x185
    const parmsFrame = encode0x185(dispMode, 250, 5);
    adapter.transmitFrame(parmsFrame);

    // 2. Stream line 1 frames
    if (line1Input) {
      const line1Frames = encode0x186Frames(1, line1Input);
      for (const f of line1Frames) {
        adapter.transmitFrame(f);
      }
    }

    // 3. Stream line 2 frames
    if (line2Input) {
      const line2Frames = encode0x186Frames(2, line2Input);
      for (const f of line2Frames) {
        adapter.transmitFrame(f);
      }
    }
  };

  // Toggle warning lamp icons via 0x182
  const handleToggleIcon = (key: keyof DicIcons) => {
    const updated = { ...icons, [key]: !icons[key] };
    setIcons(updated);
    const frame = encode0x182(updated);
    adapter.transmitFrame(frame);
  };

  // Trigger chime command 0x00F and 0x045 with Web Audio
  const handleTriggerChime = () => {
    // 0x045 volume frame
    adapter.transmitFrame(encode0x045(chimeVolume === 'LOW' ? 0 : chimeVolume === 'MEDIUM' ? 1 : 2));

    // 0x00F chime trigger frame
    adapter.transmitFrame(encode0x00F(chimeTone, chimeRepeat, 250));

    // Play synthetic chime tone in browser
    playGmChime(chimeTone, chimeVolume, chimeRepeat);
  };

  // Trigger RFA keyless entry command 0x004
  const handleKeyless = (func: RfaFunction) => {
    adapter.transmitFrame(encode0x004(func, 1));
    if (func === 'LOCK' || func === 'UNLOCK') {
      playGmChime('REMINDER', 'LOW', 1);
    } else if (func === 'PANIC') {
      playGmChime('CRITICAL', 'HIGH', 4);
    }
  };

  // Update HVAC 0x064
  const handleHvacChange = (changes: Partial<HvacStatus>) => {
    const updated = { ...localHvac, ...changes };
    setLocalHvac(updated);
    adapter.transmitFrame(encode0x064(updated));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Real DIC Screen Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              DRIVER INFORMATION CENTER (DIC) BUS INTERFACE
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            GMLAN Messages: 0x182 · 0x185 · 0x186 · 0x00F · 0x045
          </span>
        </div>

        {/* Realistic Cluster Dot-Matrix OLED Screen */}
        <div className="bg-black border-4 border-slate-800 rounded-xl p-6 shadow-[inset_0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="absolute top-2 left-4 text-[10px] font-mono text-emerald-700">
            GM CLUSTER DIC MATRIX [21 CHARS / LINE]
          </div>
          <div className="absolute top-2 right-4 text-[10px] font-mono text-emerald-700">
            MODE: {dispMode}
          </div>

          <div className="py-4">
            <div className="font-dic text-emerald-400 text-2xl sm:text-3xl font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(52,211,153,0.6)] min-h-[2.5rem]">
              {telemetry.dic.line1 || 'SYSTEM READY'}
            </div>
            <div className="font-dic text-emerald-500 text-lg sm:text-xl font-medium tracking-wider uppercase drop-shadow-[0_0_6px_rgba(52,211,153,0.4)] mt-2 min-h-[1.75rem]">
              {telemetry.dic.line2 || 'GMLAN BUS ACTIVE'}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-emerald-950/80 text-xs font-mono text-emerald-600/90 flex-wrap gap-2">
            <span>VSS: {telemetry.vehicleSpeedMph.toFixed(1)} MPH</span>
            <span>BATTERY: {telemetry.busVoltage12V.toFixed(2)} V</span>
            <span>TEMP: {telemetry.outsideAirTempF.toFixed(0)} °F</span>
            <span>GEAR: {telemetry.gear}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: DIC Text Payload Injection (0x185 & 0x186) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white tracking-wide">
              DIC TEXT STREAMING (0x185 & 0x186)
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">
              Multi-Frame ASCII
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Line 1 Text (Max 21 characters):
              </label>
              <input
                type="text"
                maxLength={21}
                value={line1Input}
                onChange={(e) => setLine1Input(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-dic text-emerald-400 uppercase focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Line 2 Text (Max 21 characters):
              </label>
              <input
                type="text"
                maxLength={21}
                value={line2Input}
                onChange={(e) => setLine2Input(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-dic text-emerald-400 uppercase focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Display Mode (0x185):
                </label>
                <select
                  value={dispMode}
                  onChange={(e) => setDispMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="FLASH">Flash Alert</option>
                  <option value="SCROLL">Marquee Scroll</option>
                  <option value="PRIORITY_POPUP">Priority Popup</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSendDicText}
                  className="w-full py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  TRANSMIT TO DIC
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-500 block mb-2">
                Factory OEM DIC Message Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { l1: 'LOW TIRE PRESSURE', l2: 'CHECK ALL TIRES' },
                  { l1: 'ENGINE OIL CHANGE', l2: 'DUE SOON' },
                  { l1: 'TRACTION DISABLED', l2: 'STABILITRAK OFF' },
                  { l1: 'ICE POSSIBLE', l2: 'DRIVE WITH CARE' },
                  { l1: 'DOOR AJAR', l2: 'DRIVER FRONT' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setLine1Input(preset.l1);
                      setLine2Input(preset.l2);
                    }}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-950 text-slate-300 hover:text-white rounded border border-slate-800 cursor-pointer"
                  >
                    {preset.l1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Chime Command & Volume (0x00F & 0x045) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white tracking-wide">
                AUDIO CHIME COMMAND (0x00F & 0x045)
              </h3>
              <span className="text-[11px] font-mono text-cyan-400">
                Radio / IPC Driver
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Tone Select (0x00F):
                  </label>
                  <select
                    value={chimeTone}
                    onChange={(e) => setChimeTone(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value="REMINDER">Reminder Chime (784 Hz)</option>
                    <option value="WARNING">Warning Chime (830 Hz)</option>
                    <option value="CRITICAL">Critical Alarm (932 Hz)</option>
                    <option value="KEY_IN_IGNITION">Key in Ignition</option>
                    <option value="SEATBELT">Seatbelt Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Volume Level (0x045):
                  </label>
                  <select
                    value={chimeVolume}
                    onChange={(e) => setChimeVolume(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value="LOW">Low (Quiet)</option>
                    <option value="MEDIUM">Medium (Normal)</option>
                    <option value="HIGH">High (Loud)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Repeat Count (0x00F Byte 1): {chimeRepeat} beeps
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={chimeRepeat}
                  onChange={(e) => setChimeRepeat(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              <button
                onClick={handleTriggerChime}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Bell className="w-4 h-4" />
                <span>TRIGGER AUDIO CHIME CADENCE</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 mt-4 text-center">
            Plays genuine synthesized GM chime bell harmonics via Web Audio
          </div>
        </div>

        {/* Module 3: DIC Warning Lamp & Icon Toggles (0x182) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white tracking-wide">
              WARNING LAMP / ICON CONTROL (0x182)
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">
              Arb_Text_Req_Set_Disp_Icon
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            {[
              { id: 'checkEngine', label: 'Check Engine' },
              { id: 'abs', label: 'ABS Warning' },
              { id: 'tractionControl', label: 'StabiliTrak' },
              { id: 'oilPressure', label: 'Oil Pressure' },
              { id: 'batteryLow', label: 'Battery / Alt' },
              { id: 'airbag', label: 'Airbag / Restraint' },
              { id: 'highBeam', label: 'High Beam' },
              { id: 'doorAjar', label: 'Door Ajar' },
              { id: 'tpmsWarning', label: 'TPMS Warning' },
              { id: 'seatbelt', label: 'Seatbelt' },
              { id: 'security', label: 'Security Passlock' },
            ].map((item) => {
              const active = icons[item.id as keyof DicIcons];
              return (
                <button
                  key={item.id}
                  onClick={() => handleToggleIcon(item.id as keyof DicIcons)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] text-slate-500">0x182 Bit</div>
                  <div>{item.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module 4: Body Controls - Keyless Fob (0x004) & HVAC (0x064) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white tracking-wide">
              RFA KEYLESS FOB EMULATION (0x004)
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">
              Remote Actuator
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleKeyless('LOCK')}
              className="py-2.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>LOCK ALL</span>
            </button>
            <button
              onClick={() => handleKeyless('UNLOCK')}
              className="py-2.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>UNLOCK</span>
            </button>
            <button
              onClick={() => handleKeyless('TRUNK_RELEASE')}
              className="py-2.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>TRUNK</span>
            </button>
            <button
              onClick={() => handleKeyless('REMOTE_START')}
              className="py-2.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>REMOTE START</span>
            </button>
            <button
              onClick={() => handleKeyless('PANIC')}
              className="py-2.5 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800 text-rose-300 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 col-span-2 cursor-pointer"
            >
              <span>PANIC ALARM</span>
            </button>
          </div>

          {/* HVAC Panel */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Fan className="w-3.5 h-3.5 text-cyan-400" />
                CLIMATE CONTROL HVAC (0x064)
              </span>
              <span className="text-xs font-mono text-white font-bold">
                Fan: {localHvac.fanSpeed} / 8
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block mb-1">DRIVER TEMP (°F)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="60"
                    max="90"
                    step="1"
                    value={localHvac.driverTempSettingF}
                    onChange={(e) => handleHvacChange({ driverTempSettingF: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-bold text-white tabular-nums w-8">
                    {localHvac.driverTempSettingF}°
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block mb-1">FAN SPEED (0-8)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={localHvac.fanSpeed}
                    onChange={(e) => handleHvacChange({ fanSpeed: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-bold text-white tabular-nums w-8">
                    {localHvac.fanSpeed}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleHvacChange({ acClutchEngaged: !localHvac.acClutchEngaged })}
                className={`flex-1 py-1.5 rounded text-xs font-mono border cursor-pointer ${
                  localHvac.acClutchEngaged
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                A/C COMPRESSOR
              </button>
              <button
                onClick={() => handleHvacChange({ defrostActive: !localHvac.defrostActive })}
                className={`flex-1 py-1.5 rounded text-xs font-mono border cursor-pointer ${
                  localHvac.defrostActive
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                FRONT DEFROST
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
