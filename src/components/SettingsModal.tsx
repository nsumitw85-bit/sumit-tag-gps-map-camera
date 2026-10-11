import React from 'react';
import {
  Settings,
  Globe,
  Sliders,
  Shield,
  Layers,
  Database,
  Info,
  Check,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { AppSettings, Language, UserRole, Ward, WorkCategory, WatermarkStyle } from '../types';
import { translations } from '../i18n/translations';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  wards: Ward[];
  categories: WorkCategory[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  wards,
  categories,
}) => {
  const t = translations[settings.language];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          <span>{t.settingsTitle}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure language, GPS satellite accuracy thresholds, watermark typography, and dual storage behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language & Role Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>{t.language} & {t.userRole}</span>
          </h2>

          <div className="space-y-3 text-xs">
            {/* Language Selector */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">{t.language}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['en', 'mr', 'hi'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => onUpdateSettings({ ...settings, language: lang })}
                    className={`py-2 px-3 rounded-xl font-bold transition-all border ${
                      settings.language === lang
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-700/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'mr' ? 'मराठी' : 'हिन्दी'}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">{t.userRole}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['worker', 'supervisor', 'admin'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => onUpdateSettings({ ...settings, currentRole: role })}
                    className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border ${
                      settings.currentRole === role
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-700/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {role === 'worker' ? t.roleWorker : role === 'supervisor' ? t.roleSupervisor : t.roleAdmin}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GPS Satellite Accuracy Threshold */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>GPS Satellite Accuracy Threshold</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 font-medium">{t.gpsThresholdLabel}</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  {settings.gpsAccuracyThreshold} meters
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={settings.gpsAccuracyThreshold}
                onChange={(e) => onUpdateSettings({ ...settings, gpsAccuracyThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Warns in outdoor viewfinder if GPS accuracy exceeds {settings.gpsAccuracyThreshold}m. Typical phone GPS achieves 3m–15m outdoors in open sky.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[10, 25, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => onUpdateSettings({ ...settings, gpsAccuracyThreshold: val })}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                    settings.gpsAccuracyThreshold === val
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {val} m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Watermark Styling & Position */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{t.watermarkConfig}</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Default Watermark Style</label>
              <div className="grid grid-cols-2 gap-2">
                {(['detailed', 'compact', 'map', 'custom'] as WatermarkStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => onUpdateSettings({ ...settings, watermarkStyle: style })}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold capitalize border ${
                      settings.watermarkStyle === style
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {style === 'map' ? 'Map Radar Stamp' : `${style} Stamp`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">{t.watermarkFontSize}</label>
                <select
                  value={settings.watermarkFontSize}
                  onChange={(e) => onUpdateSettings({ ...settings, watermarkFontSize: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 outline-none"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="large">Large (High Contrast)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Stamp Position</label>
                <select
                  value={settings.watermarkPosition}
                  onChange={(e) => onUpdateSettings({ ...settings, watermarkPosition: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 outline-none"
                >
                  <option value="bottom">Bottom (Recommended)</option>
                  <option value="top">Top</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{t.watermarkOpacity}</span>
                <span className="font-mono text-white">{Math.round(settings.watermarkOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={settings.watermarkOpacity}
                onChange={(e) => onUpdateSettings({ ...settings, watermarkOpacity: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Dual Storage Options */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>{t.storageOptions}</span>
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveOriginalPhoto}
                onChange={(e) => onUpdateSettings({ ...settings, saveOriginalPhoto: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
              />
              <div>
                <span className="font-bold text-white block">{t.saveOriginalToggle}</span>
                <span className="text-slate-400 text-[11px]">
                  Stores raw camera frame alongside the stamped version for legal audit compliance.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saveStampedPhoto}
                onChange={(e) => onUpdateSettings({ ...settings, saveStampedPhoto: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
              />
              <div>
                <span className="font-bold text-white block">{t.saveStampedToggle}</span>
                <span className="text-slate-400 text-[11px]">
                  Generates tamper-resistant visual stamp containing coordinates, address, date, and ward.
                </span>
              </div>
            </label>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <Info className="w-3.5 h-3.5" />
                <span>Storage Organization</span>
              </div>
              <p>{t.storageDirectoryInfo}</p>
              <p className="text-slate-500 pt-1">
                IndexedDB offline database is mirrored to Android Scoped Storage (`Pictures/Sumit Tag/`).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span className="font-bold text-white">Sumit Tag – GPS Map Camera</span> · Version 1.0.0
          <span className="block text-[11px] text-slate-500">
            Package: <code className="text-slate-400">com.sumittag.gpsmapcamera</code>
          </span>
        </div>
        <div className="text-emerald-400 flex items-center gap-1.5 font-medium text-[11px]">
          <CheckCircle2 className="w-4 h-4" />
          <span>Offline Ready · No Data Fabrication Policy</span>
        </div>
      </div>
    </div>
  );
};
