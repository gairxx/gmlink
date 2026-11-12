import React, { useState, useEffect, useRef } from 'react';
import { GmlanAdapterEngine } from '../lib/gmlan/adapter';
import { GMLAN_MESSAGE_CATALOG } from '../lib/gmlan/messages';
import { BusType, CanFrame } from '../lib/gmlan/types';
import {
  Download,
  Filter,
  Layers,
  Pause,
  Play,
  Radio,
  Send,
  Trash2,
} from 'lucide-react';

interface CanSnifferViewProps {
  adapter: GmlanAdapterEngine;
}

export const CanSnifferView: React.FC<CanSnifferViewProps> = ({ adapter }) => {
  const [frames, setFrames] = useState<CanFrame[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [busFilter, setBusFilter] = useState<'ALL' | BusType>('ALL');

  // Manual Frame Injector State
  const [injectBus, setInjectBus] = useState<BusType>('HS_CAN');
  const [injectIdHex, setInjectIdHex] = useState('7E0');
  const [injectDataHex, setInjectDataHex] = useState('02 10 01 00 00 00 00 00');
  const [burstCount, setBurstCount] = useState(1);
  const [burstIntervalMs, setBurstIntervalMs] = useState(50);

  // ELM327 filter mask config
  const [craFilter, setCraFilter] = useState('');

  const tableEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = adapter.subscribeFrames((frame) => {
      if (!isPaused) {
        setFrames((prev) => [frame, ...prev.slice(0, 199)]);
      }
    });
    return unsub;
  }, [adapter, isPaused]);

  // Transmit custom frame
  const handleInjectFrame = () => {
    const arbId = parseInt(injectIdHex, 16);
    if (isNaN(arbId)) {
      alert('Invalid Arbitration ID (Hex).');
      return;
    }

    const cleanHex = injectDataHex.replace(/[^0-9a-fA-F]/g, '');
    const dataBytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      dataBytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
    }

    const frame: CanFrame = {
      id: arbId,
      isExtended: arbId > 0x7ff,
      bus: injectBus,
      direction: 'TX',
      dlc: dataBytes.length,
      timestamp: Date.now(),
      data: dataBytes,
    };

    let count = 0;
    const interval = setInterval(() => {
      adapter.transmitFrame(frame);
      count++;
      if (count >= burstCount) {
        clearInterval(interval);
      }
    }, burstIntervalMs);
  };

  const handleApplyCra = () => {
    adapter.configureFilter(craFilter);
  };

  const handleExportCsv = () => {
    const headers = 'Timestamp,Bus,Direction,Type,ID_Hex,DLC,Data_Hex,Message_Name\n';
    const rows = frames
      .map((f) => {
        const hexId = '0x' + f.id.toString(16).toUpperCase();
        const hexData = f.data.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        const spec = GMLAN_MESSAGE_CATALOG[f.id];
        return `${new Date(f.timestamp).toISOString()},${f.bus},${f.direction},${f.isExtended ? '29-bit' : '11-bit'},${hexId},${f.dlc},"${hexData}","${spec?.name || 'Raw Broadcast'}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmlan_packet_capture_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFrames = frames.filter((f) => {
    if (busFilter !== 'ALL' && f.bus !== busFilter) return false;
    if (filterQuery) {
      const hexId = f.id.toString(16).toLowerCase();
      const spec = GMLAN_MESSAGE_CATALOG[f.id];
      const name = spec?.name.toLowerCase() || '';
      const q = filterQuery.toLowerCase();
      return hexId.includes(q) || name.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Packet Sniffer Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            LIVE GMLAN BUS SNIFFER & PACKET ANALYZER
          </h2>
          <p className="text-xs text-slate-400">
            Real-time frame capture, delta timestamps, symbolic name decoding, and ELM327 hardware filter controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isPaused
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE BUFFER'}</span>
          </button>

          {/* Clear Buffer */}
          <button
            onClick={() => setFrames([])}
            className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Hardware Filter Control */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search & Bus Filter (8 cols) */}
        <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Filter by Arbitration ID (e.g. 0C9, 7E0) or Name (Engine, Speed, DIC)..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs font-mono text-slate-200 focus:outline-none placeholder:text-slate-600"
          />

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['ALL', 'HS_CAN', 'SW_CAN'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBusFilter(b)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  busFilter === b
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b === 'ALL' ? 'ALL BUSES' : b === 'HS_CAN' ? 'HS 500k' : 'SW 33.3k'}
              </button>
            ))}
          </div>
        </div>

        {/* ELM327 Hardware Filter (4 cols) */}
        <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
            AT CRA:
          </span>
          <input
            type="text"
            placeholder="e.g. 0C9"
            value={craFilter}
            onChange={(e) => setCraFilter(e.target.value.toUpperCase())}
            className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-cyan-400 uppercase focus:outline-none"
          />
          <button
            onClick={handleApplyCra}
            className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
          >
            SET MASK
          </button>
        </div>
      </div>

      {/* Frame Stream Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="max-h-[460px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 z-10">
              <tr>
                <th className="py-2.5 px-3">TIME</th>
                <th className="py-2.5 px-3">BUS</th>
                <th className="py-2.5 px-3">DIR</th>
                <th className="py-2.5 px-3">ARB ID</th>
                <th className="py-2.5 px-3">NAME & DESCRIPTION</th>
                <th className="py-2.5 px-3">DLC</th>
                <th className="py-2.5 px-3">RAW PAYLOAD (HEX)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {filteredFrames.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No frames matching filter in active buffer.
                  </td>
                </tr>
              ) : (
                filteredFrames.map((f, idx) => {
                  const spec = GMLAN_MESSAGE_CATALOG[f.id];
                  const hexId = '0x' + f.id.toString(16).toUpperCase().padStart(3, '0');
                  const timeStr = new Date(f.timestamp).toISOString().substring(14, 23);

                  return (
                    <tr
                      key={`${f.timestamp}-${idx}`}
                      className="hover:bg-slate-950/60 transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap tabular-nums">
                        {timeStr}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            f.bus === 'HS_CAN'
                              ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {f.bus === 'HS_CAN' ? 'HS-500k' : 'SW-33.3k'}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            f.direction === 'TX' ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {f.direction}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-cyan-300 whitespace-nowrap">
                        {hexId}
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-white font-medium truncate max-w-[220px]">
                          {spec?.name || (f.id >= 0x7e0 && f.id <= 0x7e8 ? 'UDS Diagnostic Session' : 'Broadcast Message')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {spec?.senderEcu || 'ECU'}
                        </div>
                      </td>
                      <td className="py-2 px-3 tabular-nums text-slate-400">
                        {f.dlc}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold">
                        <div className="flex gap-1.5">
                          {f.data.map((byte, bIdx) => (
                            <span
                              key={bIdx}
                              className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-200 border border-slate-800/80 tabular-nums"
                            >
                              {byte.toString(16).padStart(2, '0').toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual CAN Frame Injector Terminal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              MANUAL CAN FRAME INJECTION TERMINAL
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Supports periodic repetition burst injection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate-400 mb-1">Bus Target:</label>
            <select
              value={injectBus}
              onChange={(e) => setInjectBus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
            >
              <option value="HS_CAN">HS-CAN 500k</option>
              <option value="SW_CAN">SW-CAN 33.3k</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate-400 mb-1">Arb ID (Hex):</label>
            <input
              type="text"
              value={injectIdHex}
              onChange={(e) => setInjectIdHex(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 uppercase"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-mono text-slate-400 mb-1">Payload Bytes (Hex):</label>
            <input
              type="text"
              value={injectDataHex}
              onChange={(e) => setInjectDataHex(e.target.value.toUpperCase())}
              placeholder="02 10 01 00 00 00 00 00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white tracking-wider uppercase"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-mono text-slate-400 mb-1">Burst:</label>
            <input
              type="number"
              min="1"
              max="50"
              value={burstCount}
              onChange={(e) => setBurstCount(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs font-mono text-slate-200"
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={handleInjectFrame}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>TRANSMIT FRAME</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
