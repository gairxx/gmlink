import React, { useState } from 'react';
import { GmlanAdapterEngine } from '../lib/gmlan/adapter';
import { DpidGroup, GmDtc, GmlanNode, Mode06TestResult } from '../lib/gmlan/types';
import {
  DEFAULT_DPID_GROUPS,
  GMLAN_KNOWN_NODES,
  GM_MODE06_PRESETS,
  SAMPLE_GM_DTCS,
  UdsServiceId,
} from '../lib/gmlan/uds';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  ListFilter,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';

interface Mode06DtcViewProps {
  adapter: GmlanAdapterEngine;
}

export const Mode06DtcView: React.FC<Mode06DtcViewProps> = ({ adapter }) => {
  const [testResults, setTestResults] = useState<Mode06TestResult[]>([...GM_MODE06_PRESETS]);
  const [nodes, setNodes] = useState<GmlanNode[]>([...GMLAN_KNOWN_NODES]);
  const [dtcs, setDtcs] = useState<GmDtc[]>([...SAMPLE_GM_DTCS]);
  const [dpidGroups, setDpidGroups] = useState([...DEFAULT_DPID_GROUPS]);
  const [isScanning, setIsScanning] = useState(false);
  const [dtcFilter, setDtcFilter] = useState<'ALL' | 'ACTIVE' | 'HISTORY'>('ALL');

  // Trigger Mode $06 Query to ECM 0x7E0
  const handleQueryMode06 = () => {
    setIsScanning(true);
    // Send Mode 06 request frame
    adapter.transmitFrame({
      id: 0x7e0,
      isExtended: false,
      bus: 'HS_CAN',
      direction: 'TX',
      dlc: 8,
      timestamp: Date.now(),
      data: [0x02, UdsServiceId.MODE_06_ONBOARD_MONITOR, 0x01, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
    });

    setTimeout(() => {
      setIsScanning(false);
    }, 400);
  };

  // Clear DTCs (Service 0x14)
  const handleClearDtcs = () => {
    adapter.transmitFrame({
      id: 0x7df, // Functional Broadcast to all ECUs
      isExtended: false,
      bus: 'HS_CAN',
      direction: 'TX',
      dlc: 8,
      timestamp: Date.now(),
      data: [0x04, UdsServiceId.CLEAR_DIAGNOSTIC_INFORMATION, 0xff, 0xff, 0xff, 0xaa, 0xaa, 0xaa],
    });
    setDtcs([]);
  };

  // Toggle DPID streaming group
  const handleToggleDpid = (dpidId: number) => {
    setDpidGroups((prev) =>
      prev.map((g) => (g.dpid === dpidId ? { ...g, isActive: !g.isActive } : g))
    );
  };

  const filteredDtcs = dtcs.filter((d) => (dtcFilter === 'ALL' ? true : d.status === dtcFilter));

  return (
    <div className="space-y-6">
      {/* Top Controls Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            GM ONBOARD TEST & DIAGNOSTIC SYSTEM CHECK
          </h2>
          <p className="text-xs text-slate-400">
            OBD Mode $06 UASID Monitor Engine, GMLAN Functional Node Topology, and 2-Character Symptom Byte DTC Parser.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleQueryMode06}
            disabled={isScanning}
            className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>RUN MODE $06 SWEEP</span>
          </button>
        </div>
      </div>

      {/* Grid: Discovered ECU Nodes & DTC System Check */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Discovered ECUs via 0x100 / 0x101 / 0x102 (4 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                GMLAN NODE DISCOVERY (0x100 - 0x102)
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                {nodes.filter((n) => n.isOnline).length} / {nodes.length} ONLINE
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {nodes.map((node) => (
                <div
                  key={node.nodeId}
                  className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    <div>
                      <div className="text-white font-bold">
                        {node.name}{' '}
                        <span className="text-slate-500 font-normal">
                          (0x{node.nodeId.toString(16).toUpperCase()})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{node.longName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {node.bus === 'HS_CAN' ? 'HS-CAN 500k' : 'SW-CAN 33.3k'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Data Packet Identifier (DPID) Scaffolding */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                DPID STREAM GROUPS (Service 0x2C / 0x22)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                High-Frequency Bundles
              </span>
            </div>

            <div className="space-y-2">
              {dpidGroups.map((group) => (
                <div
                  key={group.dpid}
                  className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="text-white font-bold">{group.name}</span>
                    <span className="text-slate-500 ml-2">
                      (DPID 0x{group.dpid.toString(16).toUpperCase()})
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {group.pids.map((p: { name: string }) => p.name).join(' · ')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleDpid(group.dpid)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      group.isActive
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {group.isActive ? `${group.transmissionRateHz} Hz ACTIVE` : 'ARM DPID'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DTC System Check with Symptom Byte Categories (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  GM 5-CHAR DTC & 2-CHAR SYMPTOM BYTE PARSER
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                  {(['ALL', 'ACTIVE', 'HISTORY'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDtcFilter(filter)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        dtcFilter === filter
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleClearDtcs}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800 text-rose-300 flex items-center gap-1 cursor-pointer"
                  title="Clear Diagnostic Faults (Service 0x14)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CLEAR (0x14)</span>
                </button>
              </div>
            </div>

            {filteredDtcs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                NO DIAGNOSTIC TROUBLE CODES STORED (ECU DTC MEMORY CLEAR)
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredDtcs.map((dtc) => (
                  <div
                    key={`${dtc.code}-${dtc.symptomByte}`}
                    className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl text-xs font-mono"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-amber-400">
                          {dtc.code}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
                          SYMPTOM: {dtc.symptomByte}
                        </span>
                        <span className="text-slate-500">[{dtc.ecu}]</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          dtc.status === 'ACTIVE'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : dtc.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dtc.status}
                      </span>
                    </div>

                    <div className="text-white font-medium text-xs mb-1">
                      {dtc.faultDescription}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="text-cyan-400">Category:</span> {dtc.symptomCategory} — {dtc.symptomDescription}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500 mt-4 text-center">
            Standard ISO 14229 / GMLAN 5-character SAE format + GM manufacturer 2-character failure subtype
          </div>
        </div>
      </div>

      {/* Mode $06 Onboard Monitor Test Engine Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              OBD MODE $06 ONBOARD MONITOR TEST ENGINE & UASID TRANSLATION TABLE
            </h3>
            <span className="text-xs text-slate-400">
              Evaluates emissions monitors, O2 response, catalytic converter oxidation, and 8-cylinder misfire counters against factory min/max boundaries.
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">
              PASS: {testResults.filter((r) => r.status === 'PASS').length}
            </span>
            <span className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800 text-rose-400">
              FAIL: {testResults.filter((r) => r.status === 'FAIL').length}
            </span>
          </div>
        </div>

        {/* Test Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">MID / TID</th>
                <th className="py-2.5 px-3">MONITOR & TEST DESCRIPTION</th>
                <th className="py-2.5 px-3">UASID UNIT</th>
                <th className="py-2.5 px-3">MEASURED VALUE</th>
                <th className="py-2.5 px-3">MIN LIMIT</th>
                <th className="py-2.5 px-3">MAX LIMIT</th>
                <th className="py-2.5 px-3 text-right">EVALUATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {testResults.map((t) => (
                <tr key={`${t.mid}-${t.tid}`} className="hover:bg-slate-950/40">
                  <td className="py-2.5 px-3 text-cyan-400 font-bold whitespace-nowrap">
                    ${t.mid.toString(16).padStart(2, '0').toUpperCase()} / ${t.tid.toString(16).padStart(2, '0').toUpperCase()}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-white font-medium">{t.midName}</div>
                    <div className="text-[10px] text-slate-400">{t.tidName}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    ${t.uasid.toString(16).padStart(2, '0').toUpperCase()} ({t.unit})
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white tabular-nums">
                    {t.testValueFormatted}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums text-slate-400">
                    {t.minLimitFormatted}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums text-slate-400">
                    {t.maxLimitFormatted}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        t.status === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {t.status === 'PASS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{t.status}</span>
                    </span>
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
