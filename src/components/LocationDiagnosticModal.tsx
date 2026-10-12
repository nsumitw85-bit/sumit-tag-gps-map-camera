import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RotateCcw,
  MapPin,
  ShieldCheck,
  Check,
  Loader2,
  Info
} from 'lucide-react';
import { LocationDiagnosticSuite, FullDiagnosticReport } from '../services/locationDiagnosticSuite';
import { GpsData, AddressInfo } from '../types';

interface LocationDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGps: GpsData | null;
  currentAddress: AddressInfo | null;
}

export const LocationDiagnosticModal: React.FC<LocationDiagnosticModalProps> = ({
  isOpen,
  onClose,
  currentGps,
  currentAddress,
}) => {
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const rep = await LocationDiagnosticSuite.runAllTests();
      setReport(rep);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base">
                Location & Postal Accuracy Diagnostics
              </h3>
              <p className="text-[11px] text-slate-400">
                13-Point Verification Suite • India Post & Tivsa Reference Test
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Device Location vs Reference Notice */}
        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Live Device Location Fix
            </span>
            <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] px-2 py-0.5 rounded border border-blue-500/30">
              Live Hardware Feed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-500">GPS:</span>{' '}
              <span className="text-slate-200">
                {currentGps
                  ? `${currentGps.latitude.toFixed(5)}°, ${currentGps.longitude.toFixed(5)}° (±${Math.round(currentGps.accuracy)}m)`
                  : 'Acquiring GPS fix...'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">GPS Status:</span>{' '}
              <span className={currentGps?.isReady ? 'text-emerald-400' : 'text-amber-400'}>
                {currentGps?.status || 'Acquiring GPS...'}
              </span>
            </div>
            <div className="col-span-2 truncate">
              <span className="text-slate-500">Address Status:</span>{' '}
              <span className="text-slate-200">{currentAddress?.addressStatus || 'Resolving Address'}</span>{' '}
              <span className="text-slate-500">• PIN:</span>{' '}
              <span className="text-cyan-300 font-bold">{currentAddress?.postcode || 'PIN code not verified'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/60">
            Note: Reference tests below verify the underlying algorithms using ground-truth data (e.g. Tivsa reference PIN: 444903) and do not overwrite your live location.
          </p>
        </div>

        {/* Summary Card */}
        {report && (
          <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex-shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  report.allPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {report.allPassed ? <Check className="w-5 h-5" /> : '!'}
              </div>
              <div>
                <span className="text-white font-bold block text-sm">
                  {report.allPassed
                    ? 'All 13 Verification Tests Passed Successfully'
                    : `${report.passedCount} of ${report.totalTests} Tests Passed`}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Tivsa reference, PIN independence, stale cache & race-condition protection verified.
                </span>
              </div>
            </div>
            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Rerun Tests</span>
            </button>
          </div>
        )}

        {/* Scrollable Test List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {report?.results.map((res) => (
            <div
              key={res.testNumber}
              className={`p-3 rounded-2xl border transition-all ${
                res.passed
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      res.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {res.passed ? '✓' : '✗'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">
                        {res.testNumber}. {res.name}
                      </span>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {res.category}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5">{res.message}</p>
                    {res.details && (
                      <div className="mt-1 font-mono text-[10px] text-slate-400 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800/60">
                        {Object.entries(res.details).map(([k, v]) => (
                          <span key={k} className="mr-3 inline-block">
                            <span className="text-slate-500">{k}:</span>{' '}
                            <span className="text-blue-300">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500 flex-shrink-0">
                  {res.durationMs}ms
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span className="text-[11px]">Department of Posts & Maharashtra Boundary Compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
