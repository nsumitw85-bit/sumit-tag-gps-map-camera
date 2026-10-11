import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Briefcase,
  MapPin,
  X,
  Check
} from 'lucide-react';
import { AppSettings, Ward, Worker, WorkCategory } from '../types';
import { translations } from '../i18n/translations';

interface WorkerManagementProps {
  workers: Worker[];
  wards: Ward[];
  categories: WorkCategory[];
  settings: AppSettings;
  onSaveWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onSetActiveWorker: (workerId: string) => void;
}

export const WorkerManagement: React.FC<WorkerManagementProps> = ({
  workers,
  wards,
  categories,
  settings,
  onSaveWorker,
  onDeleteWorker,
  onSetActiveWorker,
}) => {
  const t = translations[settings.language];

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form Fields
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formDesignation, setFormDesignation] = useState('Sanitation Worker');
  const [formWardId, setFormWardId] = useState(wards[0]?.id || '');
  const [formCategory, setFormCategory] = useState(categories[0]?.nameEn || 'Drain Cleaning');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const openAddModal = () => {
    setEditingWorker(null);
    setFormWorkerId(`ST-WRK-${100 + workers.length + 1}`);
    setFormFullName('');
    setFormMobile('');
    setFormDesignation('Sanitation Worker');
    setFormWardId(wards[0]?.id || '');
    setFormCategory(categories[0]?.nameEn || 'Drain Cleaning');
    setFormStatus('active');
    setShowModal(true);
  };

  const openEditModal = (w: Worker) => {
    setEditingWorker(w);
    setFormWorkerId(w.workerId);
    setFormFullName(w.fullName);
    setFormMobile(w.mobile || '');
    setFormDesignation(w.designation);
    setFormWardId(w.wardId || (wards[0]?.id || ''));
    setFormCategory(w.workCategory);
    setFormStatus(w.status);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      alert('Please enter worker full name');
      return;
    }

    const assignedWard = wards.find((w) => w.id === formWardId);

    const workerRecord: Worker = {
      id: editingWorker ? editingWorker.id : `wrk_${Date.now()}`,
      workerId: formWorkerId.trim() || `ST-WRK-${Date.now().toString().slice(-4)}`,
      fullName: formFullName.trim(),
      mobile: formMobile.trim() || undefined,
      designation: formDesignation,
      wardId: formWardId,
      wardNumber: assignedWard?.wardNumber,
      workCategory: formCategory,
      status: formStatus,
      createdAt: editingWorker ? editingWorker.createdAt : new Date().toISOString(),
    };

    onSaveWorker(workerRecord);
    setShowModal(false);
  };

  const toggleWorkerStatus = (worker: Worker) => {
    const updated: Worker = {
      ...worker,
      status: worker.status === 'active' ? 'inactive' : 'active',
    };
    onSaveWorker(updated);
  };

  const filteredWorkers = workers.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.fullName.toLowerCase().includes(q) ||
      w.workerId.toLowerCase().includes(q) ||
      (w.mobile && w.mobile.includes(q)) ||
      w.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            <span>{t.workersTitle}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage sanitation personnel, Mukadams, drivers, and ward duties.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-700/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.addWorker}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by worker name, ID, or mobile number..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
        />
      </div>

      {/* Workers Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkers.map((worker) => {
          const isActiveOnCamera = settings.activeWorkerId === worker.id;
          const assignedWard = wards.find((w) => w.id === worker.wardId);

          return (
            <div
              key={worker.id}
              className={`bg-slate-900 border rounded-2xl p-4 transition-all relative flex flex-col justify-between ${
                isActiveOnCamera
                  ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-lg shadow-blue-900/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                      {worker.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{worker.fullName}</h3>
                      <span className="text-[11px] font-mono text-blue-400">{worker.workerId}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      worker.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {worker.status.toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{worker.designation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>
                      {assignedWard ? `${assignedWard.wardNumber} (${assignedWard.wardName})` : 'Unassigned'}
                    </span>
                  </div>
                  {worker.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-mono">{worker.mobile}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                <button
                  onClick={() => onSetActiveWorker(worker.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    isActiveOnCamera
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isActiveOnCamera ? 'Active on Camera' : 'Set as Active'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(worker)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title={t.editWorker}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleWorkerStatus(worker)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title={worker.status === 'active' ? t.deactivate : t.activate}
                  >
                    {worker.status === 'active' ? (
                      <XCircle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingWorker ? t.editWorker : t.addWorker}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.workerId}</label>
                <input
                  type="text"
                  value={formWorkerId}
                  onChange={(e) => setFormWorkerId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.fullName}</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. Ramesh Jadhav"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.mobileNumber} (Optional)</label>
                <input
                  type="tel"
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  placeholder="e.g. 9822012345"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.designation}</label>
                <select
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="Sanitation Worker">Sanitation Worker</option>
                  <option value="Mukadam / Supervisor">Mukadam / Field Supervisor</option>
                  <option value="Sanitation Inspector">Sanitation Inspector</option>
                  <option value="Waste Tipper Driver">Waste Tipper Driver</option>
                  <option value="Municipal Field Engineer">Municipal Field Engineer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.assignedWard}</label>
                <select
                  value={formWardId}
                  onChange={(e) => setFormWardId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.wardNumber} - {w.wardName} ({w.areaName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.defaultCategory}</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.status}</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
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
                  {t.saveWorker}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
