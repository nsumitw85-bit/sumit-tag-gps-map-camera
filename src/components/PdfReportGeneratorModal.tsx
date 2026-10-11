import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  User,
  MapPin,
  Download,
  CheckCircle2,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { AppSettings, PhotoRecord, Ward, Worker } from '../types';
import { translations } from '../i18n/translations';
import { generateMunicipalPdfReport } from '../services/pdfReport';

interface PdfReportGeneratorModalProps {
  photos: PhotoRecord[];
  workers: Worker[];
  wards: Ward[];
  settings: AppSettings;
}

export const PdfReportGeneratorModal: React.FC<PdfReportGeneratorModalProps> = ({
  photos,
  workers,
  wards,
  settings,
}) => {
  const t = translations[settings.language];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWardNumber, setSelectedWardNumber] = useState('all');
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [reportTitle, setReportTitle] = useState('OFFICIAL MUNICIPAL FIELD SANITATION REPORT');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter photos based on selection
  const matchingPhotos = photos.filter((p) => {
    // Ward filter
    if (selectedWardNumber !== 'all' && !p.wardNumber.includes(selectedWardNumber)) {
      return false;
    }
    // Worker filter
    if (selectedWorkerId !== 'all') {
      const targetWorker = workers.find((w) => w.id === selectedWorkerId);
      if (targetWorker && p.workerId !== targetWorker.workerId) {
        return false;
      }
    }
    // Date filter
    if (startDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const startMs = new Date(sYear, sMonth - 1, sDay, 0, 0, 0).getTime();
      if (p.captureTimestamp < startMs) return false;
    }
    if (endDate) {
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      const endMs = new Date(eYear, eMonth - 1, eDay, 23, 59, 59).getTime();
      if (p.captureTimestamp > endMs) return false;
    }
    return true;
  });

  const handleGeneratePdf = async () => {
    if (matchingPhotos.length === 0) {
      alert('No geotagged photographs match the selected filter criteria.');
      return;
    }

    setIsGenerating(true);
    try {
      const blob = await generateMunicipalPdfReport(
        matchingPhotos,
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          wardNumber: selectedWardNumber !== 'all' ? selectedWardNumber : undefined,
          workerId: selectedWorkerId !== 'all' ? selectedWorkerId : undefined,
        },
        reportTitle
      );

      // Download PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SumitTag_Municipal_Report_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      alert('Error generating PDF report: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-500" />
          <span>{t.pdfReportsTitle}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export standardized A4 audit reports containing photo proofs, verified coordinates, address, and supervisor signature blocks.
        </p>
      </div>

      {/* Main Filter & Generator Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>Filter Parameters</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Start & End Dates */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.startDate}</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.endDate}</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          {/* Ward Selection */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.selectWardFilter}</span>
            </label>
            <select
              value={selectedWardNumber}
              onChange={(e) => setSelectedWardNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="all">All Municipal Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.wardNumber}>
                  {w.wardNumber} - {w.wardName}
                </option>
              ))}
            </select>
          </div>

          {/* Worker Selection */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.selectWorkerFilter}</span>
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="all">All Field Workers</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.fullName} ({w.workerId})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Report Title */}
          <div className="md:col-span-2">
            <label className="block text-slate-400 font-semibold mb-1">
              Official Report Header Title
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Live Matching Photos Count */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {matchingPhotos.length}
            </div>
            <div>
              <div className="text-white font-bold text-sm">Photographs matching criteria</div>
              <div className="text-xs text-slate-400">
                Ready to compile into printable A4 multi-page document
              </div>
            </div>
          </div>

          <button
            onClick={handleGeneratePdf}
            disabled={isGenerating || matchingPhotos.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all ${
              matchingPhotos.length === 0 || isGenerating
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-700/30'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.generatingPdf}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{t.downloadPdf}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
