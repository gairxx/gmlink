import React, { useState } from 'react';
import { GMLAN_MESSAGE_CATALOG } from '../lib/gmlan/messages';
import { GM_UASID_TABLE, UasidSpec } from '../lib/gmlan/uds';
import { BookOpen, Cpu, FileText, Layers, Shield, Terminal, Zap } from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const [selectedMsgId, setSelectedMsgId] = useState<number>(0x0C9);
  const selectedSpec = GMLAN_MESSAGE_CATALOG[selectedMsgId] || GMLAN_MESSAGE_CATALOG[0x0C9];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            GMLAN ARCHITECTURAL SPECIFICATION & PROTOCOL REFERENCE BIBLE
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-4xl">
          Complete engineering reference documentation covering GM vehicle bus topologies (SW-CAN 33.3k Pin 1 & HS-CAN 500k Pins 6/14), STN/ELM327 adapter commands, GMLAN message schemas, Mode $AE DeviceControl, and OBD Mode $06 UASID scaling tables.
        </p>
      </div>

      {/* Section 1: Physical & Data Link Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">SW-CAN (Single-Wire GMLAN)</h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 font-mono">
            <li><span className="text-slate-500">Baud Rate:</span> 33.333 kbps nominal</li>
            <li><span className="text-slate-500">OBD-II Pin:</span> Pin 1 (Ref: Pins 4/5 GND)</li>
            <li><span className="text-slate-500">Wake-up:</span> High-Voltage Wake-up (12V pulse)</li>
            <li><span className="text-slate-500">Target Modules:</span> BCM, IPC/Cluster, Radio/DIC, HVAC, RFA</li>
            <li><span className="text-slate-500">Adapter Command:</span> <code className="text-cyan-400">STP 62</code> (OBDLink)</li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">HS-CAN (Dual-Wire CAN)</h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 font-mono">
            <li><span className="text-slate-500">Baud Rate:</span> 500 kbps nominal</li>
            <li><span className="text-slate-500">OBD-II Pins:</span> Pin 6 (CAN-H), Pin 14 (CAN-L)</li>
            <li><span className="text-slate-500">Termination:</span> 120Ω split (60Ω bus total)</li>
            <li><span className="text-slate-500">Target Modules:</span> ECM (Engine), TCM, EBCM (ABS/ESC)</li>
            <li><span className="text-slate-500">Adapter Command:</span> <code className="text-cyan-400">AT SP 6</code> (ISO 15765-4)</li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Safety & Fail-Safe Architecture</h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 font-mono">
            <li><span className="text-slate-500">Default Mode:</span> Listen-Only (ATMA silent)</li>
            <li><span className="text-slate-500">Speed Lockout:</span> Speed &gt; 0 km/h blocks actuators</li>
            <li><span className="text-slate-500">Fail-Safe Watchdog:</span> Auto ReturnToNormal ($20) on 10s idle</li>
            <li><span className="text-slate-500">Bus-Off Recovery:</span> Automatic TX abort on buffer saturation</li>
          </ul>
        </div>
      </div>

      {/* Section 2: Interactive Message Catalog Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              GMLAN MESSAGE DECODING & ENCODING CATALOG
            </h3>
            <p className="text-xs text-slate-400">
              Select an Arbitration ID to view byte offsets, bit masks, scaling factors, and engineering units.
            </p>
          </div>
        </div>

        {/* Message Selector Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.values(GMLAN_MESSAGE_CATALOG).map((msg) => (
            <button
              key={msg.id}
              onClick={() => setSelectedMsgId(msg.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                selectedMsgId === msg.id
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {msg.hexId} ({msg.name})
            </button>
          ))}
        </div>

        {/* Selected Message Specification Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4 flex-wrap gap-2">
            <div>
              <span className="text-base font-bold text-cyan-400 font-mono">
                {selectedSpec.hexId} — {selectedSpec.name}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">{selectedSpec.description}</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                Bus: <strong className="text-white">{selectedSpec.bus}</strong>
              </span>
              <span className="text-slate-400">
                DLC: <strong className="text-white">{selectedSpec.dlc}</strong>
              </span>
              <span className="text-slate-400">
                Period: <strong className="text-white">{selectedSpec.periodMs} ms</strong>
              </span>
            </div>
          </div>

          {/* Byte Layout Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">BYTE</th>
                  <th className="py-2 px-3">BITS</th>
                  <th className="py-2 px-3">FIELD NAME</th>
                  <th className="py-2 px-3">DATA TYPE</th>
                  <th className="py-2 px-3">SCALING / FORMULA</th>
                  <th className="py-2 px-3">UNITS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {selectedSpec.byteLayout.map((layout, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 font-bold text-cyan-400">
                      Byte {layout.byteIndex}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {layout.bitRange || '7:0'}
                    </td>
                    <td className="py-2 px-3 text-white font-medium">
                      {layout.field}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {layout.type}
                    </td>
                    <td className="py-2 px-3 font-mono text-cyan-300">
                      {layout.scaling}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {layout.units}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: OBD Mode $06 UASID Scaling Reference Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white tracking-wide mb-2">
          GM MODE $06 UASID (UNIT AND SCALING ID) TRANSLATION SPECIFICATION
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          SAE J1979 and GM manufacturer diagnostic conversion factors for translating raw 16-bit counts into physical engineering units.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">UASID (HEX)</th>
                <th className="py-2 px-3">ENGINEERING UNIT</th>
                <th className="py-2 px-3">SCALING MULTIPLIER</th>
                <th className="py-2 px-3">OFFSET</th>
                <th className="py-2 px-3">TYPICAL APPLICATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {(Object.values(GM_UASID_TABLE) as UasidSpec[]).map((u) => (
                <tr key={u.uasid} className="hover:bg-slate-950/40">
                  <td className="py-2 px-3 text-cyan-400 font-bold">
                    0x{u.uasid.toString(16).padStart(2, '0').toUpperCase()}
                  </td>
                  <td className="py-2 px-3 text-white font-bold">{u.unit}</td>
                  <td className="py-2 px-3 font-mono text-cyan-300">{u.scaling}</td>
                  <td className="py-2 px-3 text-slate-400">{u.offset}</td>
                  <td className="py-2 px-3 text-slate-400">
                    {u.unit === 'ratio'
                      ? 'Catalyst conversion efficiency ratio'
                      : u.unit === 'mV' || u.unit === 'V'
                      ? 'O2 sensor swing voltage'
                      : u.unit === 'ms'
                      ? 'O2 rich-to-lean switch response time'
                      : u.unit === 'counts'
                      ? 'Cylinder misfire revolution delta counter'
                      : u.unit === 'Pa' || u.unit === 'kPa'
                      ? 'EVAP fuel tank vacuum decay rate'
                      : u.unit === '°C'
                      ? 'Engine coolant & catalyst bed temperature'
                      : 'Duty-cycle percentages'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
