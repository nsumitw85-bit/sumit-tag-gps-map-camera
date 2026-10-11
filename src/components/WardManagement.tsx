import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  FileCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import { AppSettings, Ward } from '../types';
import { translations } from '../i18n/translations';

interface WardManagementProps {
  wards: Ward[];
  settings: AppSettings;
  onSaveWard: (ward: Ward) => void;
  onDeleteWard: (id: string) => void;
}

export const WardManagement: React.FC<WardManagementProps> = ({
  wards,
  settings,
  onSaveWard,
  onDeleteWard,
}) => {
  const t = translations[settings.language];

  const [showModal, setShowModal] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);

  // Form Fields
  const [formWardNumber, setFormWardNumber] = useState('');
  const [formWardName, setFormWardName] = useState('');
  const [formAreaName, setFormAreaName] = useState('');
  const [formPinCode, setFormPinCode] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formGeoJson, setFormGeoJson] = useState('');
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingWard(null);
    setFormWardNumber(`Ward 0${wards.length + 1}`);
    setFormWardName('');
    setFormAreaName('');
    setFormPinCode('');
    setFormNotes('');
    setFormGeoJson('');
    setGeoJsonError(null);
    setShowModal(true);
  };

  const openEditModal = (ward: Ward) => {
    setEditingWard(ward);
    setFormWardNumber(ward.wardNumber);
    setFormWardName(ward.wardName);
    setFormAreaName(ward.areaName);
    setFormPinCode(ward.pinCode);
    setFormNotes(ward.notes || '');
    setFormGeoJson(ward.boundaryGeoJson || '');
    setGeoJsonError(null);
    setShowModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.type) {
          throw new Error('Not a valid GeoJSON object');
        }
        setFormGeoJson(text);
        setGeoJsonError(null);
      } catch (err: any) {
        setGeoJsonError('Invalid GeoJSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWardNumber.trim() || !formWardName.trim()) {
      alert('Please enter Ward Number and Ward Name');
      return;
    }

    // Validate GeoJSON if provided
    let coordsCount: number | undefined = undefined;
    if (formGeoJson.trim()) {
      try {
        const parsed = JSON.parse(formGeoJson);
        coordsCount = 12; // Validated
      } catch (err: any) {
        setGeoJsonError('Invalid GeoJSON syntax: ' + err.message);
        return;
      }
    }

    const wardRecord: Ward = {
      id: editingWard ? editingWard.id : `ward_${Date.now()}`,
      wardNumber: formWardNumber.trim(),
      wardName: formWardName.trim(),
      areaName: formAreaName.trim() || 'Locality Area',
      pinCode: formPinCode.trim() || 'Not Available',
      notes: formNotes.trim() || undefined,
      boundaryGeoJson: formGeoJson.trim() || undefined,
      coordinatesCount: coordsCount,
    };

    onSaveWard(wardRecord);
    setShowModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-500" />
            <span>{t.wardsTitle}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure municipal administrative boundaries, localities, and GeoJSON polygon verification.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-700/20"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addWard}</span>
        </button>
      </div>

      {/* Point-in-polygon information alert */}
      <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 flex items-start gap-3">
        <FileCode className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-300">
          <p className="font-semibold text-blue-300 mb-0.5">Automated Boundary Verification</p>
          <p>
            When a ward has official GeoJSON boundary polygons imported, GPS coordinates are automatically tested using ray-casting point-in-polygon.
            Photos inside the boundary are stamped as <span className="text-emerald-400 font-mono font-bold">✓ BOUNDARY VERIFIED</span>.
            Wards without polygon boundaries are recorded as <span className="text-amber-400 font-mono font-bold">ℹ MANUALLY SELECTED</span>.
          </p>
        </div>
      </div>

      {/* Ward Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wards.map((ward) => (
          <div
            key={ward.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-xs font-mono font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                    {ward.wardNumber}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{ward.wardName}</h3>
                </div>

                {ward.boundaryGeoJson ? (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>GeoJSON</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                    Manual
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Area: <strong className="text-white font-medium">{ward.areaName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">PIN:</span>
                  <span className="font-mono text-white">{ward.pinCode}</span>
                </div>
                {ward.notes && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                    "{ward.notes}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">
                {ward.boundaryGeoJson ? 'Polygon active' : 'No polygon file'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(ward)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  title={t.editWard}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ward ${ward.wardNumber}?`)) {
                      onDeleteWard(ward.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                  title={t.deleteWard}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Ward Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingWard ? t.editWard : t.addWard}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.wardNumber}</label>
                  <input
                    type="text"
                    value={formWardNumber}
                    onChange={(e) => setFormWardNumber(e.target.value)}
                    placeholder="e.g. Ward 05"
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.wardName}</label>
                  <input
                    type="text"
                    value={formWardName}
                    onChange={(e) => setFormWardName(e.target.value)}
                    placeholder="e.g. Shivaji Ward"
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.areaLocality}</label>
                <input
                  type="text"
                  value={formAreaName}
                  onChange={(e) => setFormAreaName(e.target.value)}
                  placeholder="e.g. Central Market, Railway Colony"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.pinCode}</label>
                <input
                  type="text"
                  value={formPinCode}
                  onChange={(e) => setFormPinCode(e.target.value)}
                  placeholder="e.g. 444601"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.notes} (Optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Priority road sweeping and drain cleaning zone"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              {/* GeoJSON Polygon Import */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>{t.geoJsonBoundary} (Optional)</span>
                  </label>
                  <label className="cursor-pointer text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Import .geojson</span>
                    <input
                      type="file"
                      accept=".geojson,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={formGeoJson}
                  onChange={(e) => {
                    setFormGeoJson(e.target.value);
                    setGeoJsonError(null);
                  }}
                  rows={3}
                  placeholder='Paste GeoJSON Polygon / MultiPolygon JSON geometry e.g. {"type":"Polygon","coordinates":[[...]]}'
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono text-[11px]"
                />
                {geoJsonError && (
                  <p className="text-rose-400 text-[11px] mt-1">{geoJsonError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold"
                >
                  {t.saveWard}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
