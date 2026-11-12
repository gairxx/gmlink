import React, { useState } from 'react';
import { GmlanAdapterEngine } from '../lib/gmlan/adapter';
import {
  calculateGmSecurityKey,
  createDiagnosticSessionFrame,
  createDisableNormalCommunicationFrame,
  createSecurityAccessKeySend,
  createSecurityAccessSeedRequest,
  createTesterPresentFrame,
} from '../lib/gmlan/uds';
import {
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileCode,
  Key,
  Lock,
  Radio,
  Send,
  ShieldCheck,
  Terminal,
  Unlock,
  Zap,
} from 'lucide-react';

interface UdsSessionViewProps {
  adapter: GmlanAdapterEngine;
}

export const UdsSessionView: React.FC<UdsSessionViewProps> = ({ adapter }) => {
  const [sessionType, setSessionType] = useState<0x01 | 0x02 | 0x03>(0x01);
  const [seedVal, setSeedVal] = useState<number | null>(adapter.simulator.currentSeed);
  const [calcKey, setCalcKey] = useState<number | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(adapter.simulator.securityUnlocked);
  const [commDisabled, setCommDisabled] = useState(adapter.simulator.normalCommDisabled);

  // Memory by Address inputs
  const [memAddress, setMemAddress] = useState('0x00018000');
  const [memLength, setMemLength] = useState('0x0020');
  const [readMemoryLog, setReadMemoryLog] = useState<string[]>([]);

  // 1. Diagnostic Session Control 0x10
  const handleSetSession = (type: 0x01 | 0x02 | 0x03) => {
    setSessionType(type);
    const frame = createDiagnosticSessionFrame(type);
    adapter.transmitFrame(frame);
  };

  // 2. Request Security Seed 0x27 01
  const handleRequestSeed = () => {
    const frame = createSecurityAccessSeedRequest(1);
    adapter.transmitFrame(frame);
    setTimeout(() => {
      const seed = adapter.simulator.currentSeed;
      setSeedVal(seed);
      const computed = calculateGmSecurityKey(seed, 1);
      setCalcKey(computed);
    }, 150);
  };

  // 3. Send Calculated Key 0x27 02
  const handleSendKey = () => {
    if (calcKey === null) return;
    const frame = createSecurityAccessKeySend(calcKey, 2);
    adapter.transmitFrame(frame);
    setTimeout(() => {
      setIsUnlocked(adapter.simulator.securityUnlocked);
    }, 150);
  };

  // 4. Disable Normal Communication 0x28
  const handleToggleComm = () => {
    const nextState = !commDisabled;
    setCommDisabled(nextState);
    const frame = createDisableNormalCommunicationFrame(nextState);
    adapter.transmitFrame(frame);
  };

  // 5. Read Memory by Address 0x23 simulation
  const handleReadMemory = () => {
    const simulatedBytes = [
      '50 4F 57 45 52 54 52 41 49 4E 20 45 33 38 41 20',
      '47 4D 20 56 45 48 49 43 4C 45 20 43 41 4C 49 42',
    ];
    setReadMemoryLog([
      `[${new Date().toISOString().substring(11, 19)}] ReadMemoryByAddress (0x23) Addr:${memAddress} Len:${memLength}`,
      `  -> 0x00018000: ${simulatedBytes[0]} ("POWERTRAIN E38A ")`,
      `  -> 0x00018010: ${simulatedBytes[1]} ("GM VEHICLE CALIB")`,
      ...readMemoryLog,
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            ISO 14229 / UDS DIAGNOSTIC & CALIBRATION SESSION MANAGER
          </h2>
          <p className="text-xs text-slate-400">
            KWP2000 & UDS protocol separation: Diagnostic sessions, GM Seed/Key algorithmic authentication, and bus quelling (0x28).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${
              isUnlocked
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                : 'bg-rose-500/20 border-rose-500/60 text-rose-300'
            }`}
          >
            {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{isUnlocked ? 'SECURITY UNLOCKED' : 'SECURITY LOCKED'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Diagnostic Session Control (0x10) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide">
                DIAGNOSTIC SESSION CONTROL (Service 0x10)
              </h3>
              <span className="text-xs font-mono text-cyan-400">Target: ECM 0x7E0</span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Shifts the ECU microcontroller operating state between default driving, extended diagnostics, and memory flash programming modes.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 0x01, label: 'Default Session (0x01)', desc: 'Normal OBD-II' },
                { type: 0x03, label: 'Extended Session (0x03)', desc: 'Actuator Overrides' },
                { type: 0x02, label: 'Programming Session (0x02)', desc: 'ECU Reflash' },
              ].map((sess) => (
                <button
                  key={sess.type}
                  onClick={() => handleSetSession(sess.type as any)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    sessionType === sess.type
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs text-white font-semibold">{sess.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{sess.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TesterPresent Heartbeat Worker */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>TesterPresent (0x3E) Worker:</span>
            </div>
            <span className="text-emerald-400 font-bold">ACTIVE (2500ms CADENCE)</span>
          </div>
        </div>

        {/* Module 2: Security Access 0x27 (GM Seed / Key Algorithm) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide">
                SECURITY ACCESS (Service 0x27 Seed/Key)
              </h3>
              <span className="text-xs font-mono text-cyan-400">GM LFSR Algorithm</span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Executes two-way cryptographic challenge response. Generates LFSR polynomial key against ECU pseudo-random seed.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ECU SEED (0x27 01)</span>
                <span className="text-lg font-bold text-white tabular-nums">
                  {seedVal !== null ? `0x${seedVal.toString(16).toUpperCase()}` : 'None'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">CALCULATED KEY (0x27 02)</span>
                <span className="text-lg font-bold text-cyan-400 tabular-nums">
                  {calcKey !== null ? `0x${calcKey.toString(16).toUpperCase()}` : 'Pending'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRequestSeed}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-semibold cursor-pointer"
              >
                1. REQUEST SEED ($27 01)
              </button>
              <button
                onClick={handleSendKey}
                disabled={calcKey === null}
                className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                2. TRANSMIT KEY ($27 02)
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 mt-4 text-center">
            Algorithm: GM E38/E67 ECM Polynomial Transformation (Seed ^ 0x485A)
          </div>
        </div>

        {/* Module 3: Bus Quelling / DisableNormalCommunication (0x28) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-white tracking-wide">
              BUS QUIET ROUTINE (Service 0x28)
            </h3>
            <span className="text-xs font-mono text-cyan-400">Communication Control</span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Silences routine broadcast frames (RPM, speed, HVAC, DIC) across all nodes to prevent bus contention during intensive memory reflash sessions or packet capture.
          </p>

          <button
            onClick={handleToggleComm}
            className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              commDisabled
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>
              {commDisabled
                ? 'BUS QUELLED: NORMAL COMM DISABLED (CLICK TO RESTORE)'
                : 'DISABLE NORMAL COMM ON ALL NODES (0x28)'}
            </span>
          </button>
        </div>

        {/* Module 4: Read Memory by Address (0x23 / 0x3D) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                READ MEMORY BY ADDRESS (Service 0x23)
              </h3>
              <span className="text-xs font-mono text-cyan-400">Calibration Flash</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Address (Hex):</label>
                <input
                  type="text"
                  value={memAddress}
                  onChange={(e) => setMemAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Length (Hex):</label>
                <input
                  type="text"
                  value={memLength}
                  onChange={(e) => setMemLength(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-300"
                />
              </div>
            </div>

            <button
              onClick={handleReadMemory}
              className="w-full py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              EXECUTE MEMORY READ (0x23)
            </button>
          </div>

          {/* Memory Log Preview */}
          <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 max-h-24 overflow-y-auto">
            {readMemoryLog.length === 0 ? (
              <span className="text-slate-600">Memory read terminal idle.</span>
            ) : (
              readMemoryLog.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
