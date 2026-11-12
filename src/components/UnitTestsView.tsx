import React, { useState } from 'react';
import { runGmlanUnitTests, TestResult } from '../lib/gmlan/unitTests';
import {
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal,
  XCircle,
} from 'lucide-react';

export const UnitTestsView: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>(() => runGmlanUnitTests());
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(runGmlanUnitTests());
      setIsRunning(false);
    }, 250);
  };

  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  return (
    <div className="space-y-6">
      {/* Test Runner Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              GMLAN ARCHITECTURAL & PROTOCOL UNIT VERIFICATION SUITE
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Automated verification covering 11-bit/29-bit CAN codecs, ISO 15765-2 CAN-TP reassembly, Mode $AE DeviceControl, Mode $06 UASID scaling, and safety speed lockouts.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              {passedCount} / {total} PASSED
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
              {totalDuration.toFixed(1)} ms
            </span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>RUN ALL INTEGRATION TESTS</span>
          </button>
        </div>
      </div>

      {/* Tests Results List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {results.map((test) => (
            <div
              key={test.id}
              className="p-4 hover:bg-slate-950/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{test.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {test.category}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1 font-normal font-sans">
                    {test.details}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span className="text-slate-500 text-[11px] tabular-nums">
                  {test.durationMs.toFixed(2)} ms
                </span>
                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    test.passed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
