import React from 'react';
import { Camera, Image as ImageIcon, LayoutDashboard, Users, MapPin, FileText, Settings, Smartphone, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppSettings, GpsData, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';

interface HeaderNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  gps: GpsData | null;
  gpsError: string | null;
  onRefreshGps: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  setActiveTab,
  gps,
  gpsError,
  onRefreshGps,
  settings,
  onUpdateSettings,
}) => {
  const t = translations[settings.language];

  const handleLanguageChange = (lang: Language) => {
    onUpdateSettings({ ...settings, language: lang });
  };

  const handleRoleChange = (role: UserRole) => {
    onUpdateSettings({ ...settings, currentRole: role });
  };

  const getGpsStatusColor = () => {
    if (gpsError || !gps) return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (gps.accuracy > settings.gpsAccuracyThreshold) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 border border-blue-400/50 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <span className="text-white font-black text-sm tracking-wider">ST</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-base tracking-tight leading-none">{t.appName}</span>
              <span className="text-xs bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded font-mono font-medium border border-blue-500/30">GPS</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight hidden xs:block">{t.appSubtitle}</p>
          </div>
        </div>

        {/* GPS Live Status Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${getGpsStatusColor()}`}
            title={gps ? `Lat: ${gps.latitude.toFixed(5)}, Long: ${gps.longitude.toFixed(5)}` : gpsError || 'Waiting for GPS fix'}
          >
            {gps ? (
              <>
                {gps.accuracy <= settings.gpsAccuracyThreshold ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>±{gps.accuracy}m</span>
                {gps.isStale && <span className="text-[10px] text-amber-400 font-sans hidden sm:inline">(Stale)</span>}
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[11px] font-sans">No GPS</span>
              </>
            )}
            <button
              onClick={onRefreshGps}
              aria-label="Refresh GPS"
              className="p-0.5 hover:text-white transition-colors"
              title="Refresh GPS Satellite Fix"
            >
              <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>

          {/* Language Switcher */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${settings.language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageChange('mr')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${settings.language === 'mr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              मराठी
            </button>
            <button
              onClick={() => handleLanguageChange('hi')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${settings.language === 'hi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              हिन्दी
            </button>
          </div>

          {/* Role Indicator Dropdown */}
          <select
            value={settings.currentRole}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer hidden md:block"
          >
            <option value="worker">{t.roleWorker}</option>
            <option value="supervisor">{t.roleSupervisor}</option>
            <option value="admin">{t.roleAdmin}</option>
          </select>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-800/60 py-1">
        <NavButton
          active={activeTab === 'camera'}
          onClick={() => setActiveTab('camera')}
          icon={<Camera className="w-4 h-4" />}
          label={t.navCamera}
          highlight
        />
        <NavButton
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard className="w-4 h-4" />}
          label={t.navDashboard}
        />
        <NavButton
          active={activeTab === 'gallery'}
          onClick={() => setActiveTab('gallery')}
          icon={<ImageIcon className="w-4 h-4" />}
          label={t.navGallery}
        />
        {(settings.currentRole === 'supervisor' || settings.currentRole === 'admin') && (
          <>
            <NavButton
              active={activeTab === 'workers'}
              onClick={() => setActiveTab('workers')}
              icon={<Users className="w-4 h-4" />}
              label={t.navWorkers}
            />
            <NavButton
              active={activeTab === 'wards'}
              onClick={() => setActiveTab('wards')}
              icon={<MapPin className="w-4 h-4" />}
              label={t.navWards}
            />
            <NavButton
              active={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
              icon={<FileText className="w-4 h-4" />}
              label={t.navReports}
            />
          </>
        )}
        <NavButton
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon={<Settings className="w-4 h-4" />}
          label={t.navSettings}
        />
        <NavButton
          active={activeTab === 'android'}
          onClick={() => setActiveTab('android')}
          icon={<Smartphone className="w-4 h-4" />}
          label={t.navAndroidCode}
          badge="APK"
        />
      </nav>
    </header>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  badge?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, highlight, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
      active
        ? highlight
          ? 'bg-blue-600 text-white shadow-md shadow-blue-700/30'
          : 'bg-slate-800 text-blue-400 border border-slate-700'
        : highlight
        ? 'text-blue-400 hover:bg-slate-800/80'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge && (
      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono border border-emerald-500/30">
        {badge}
      </span>
    )}
  </button>
);
