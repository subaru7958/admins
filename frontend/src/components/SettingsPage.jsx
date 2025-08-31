import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config/config';

const presetThemes = [
  { name: 'Default Blue', primary: '#2563eb', accent: '#10b981' },
  { name: 'Emerald', primary: '#059669', accent: '#22c55e' },
  { name: 'Indigo', primary: '#4f46e5', accent: '#06b6d4' },
  { name: 'Amber', primary: '#d97706', accent: '#84cc16' },
  { name: 'Rose', primary: '#e11d48', accent: '#f97316' },
];

function SettingsPage() {
  const [primary, setPrimary] = useState(localStorage.getItem('theme_primary') || '#2563eb');
  const [accent, setAccent] = useState(localStorage.getItem('theme_accent') || '#10b981');
  const [dark, setDark] = useState(localStorage.getItem('theme_dark') === '1');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sm-primary', primary);
    root.style.setProperty('--sm-accent', accent);
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme_primary', primary);
    localStorage.setItem('theme_accent', accent);
    localStorage.setItem('theme_dark', dark ? '1' : '0');
  }, [primary, accent, dark]);

  const previewStyle = useMemo(() => ({ backgroundColor: primary }), [primary]);

  const applyTheme = () => {
    // Trigger reflow, values already set in effect; this is a no-op apply button
    const root = document.documentElement; // ensures effect applied
    root.style.setProperty('--sm-primary', primary);
    root.style.setProperty('--sm-accent', accent);
  };

  const resetDefaults = () => {
    setPrimary('#2563eb');
    setAccent('#10b981');
    setDark(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Settings</h1>
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Theme</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-16 h-10 p-0 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Accent Color</label>
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-16 h-10 p-0 border rounded" />
              </div>
            </div>
            <div className="mt-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} className="rounded" />
                Enable dark mode
              </label>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Presets</div>
              <div className="flex gap-2 flex-wrap">
                {presetThemes.map(t => {
                  const isActive = primary === t.primary && accent === t.accent;
                  return (
                    <button
                      key={t.name}
                      onClick={() => { setPrimary(t.primary); setAccent(t.accent); }}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                        isActive
                          ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                      title={t.name}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={applyTheme} className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700">Apply</button>
              <button onClick={resetDefaults} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Reset to Default</button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Preview</h2>
            <div className="rounded-lg p-4 text-white" style={previewStyle}>
              <div className="text-lg font-semibold">{localStorage.getItem('teamName') || 'Your Team'}</div>
              <div className="text-sm opacity-90">Primary colored header sample</div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Professional Options</h2>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <label className="flex items-center justify-between">
                <span>High-contrast mode for accessibility</span>
                <input type="checkbox" onChange={(e) => document.documentElement.classList.toggle('hc', e.target.checked)} className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span>Compact tables</span>
                <input type="checkbox" onChange={(e) => document.documentElement.classList.toggle('compact', e.target.checked)} className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span>Reduce motion</span>
                <input type="checkbox" onChange={(e) => document.documentElement.classList.toggle('reduce-motion', e.target.checked)} className="rounded" />
              </label>
            </div>
          </div>

          <TeamSettings />
        </div>
      </div>
    </div>
  );
}

function TeamSettings() {
  const [teamName, setTeamName] = useState(localStorage.getItem('teamName') || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('teamLogo') || '');
  const [logoLabel, setLogoLabel] = useState('No file chosen');

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    setLogoFile(file);
    setLogoLabel(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result || '');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      const form = new FormData();
      if (teamName) form.append('teamName', teamName);
      if (logoFile) form.append('teamLogo', logoFile);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to update profile');
      if (data?.data?.teamName) localStorage.setItem('teamName', data.data.teamName);
      if (data?.data?.logo) localStorage.setItem('teamLogo', data.data.logo);
      // Notify other parts of the app (e.g., dashboard) without refresh
      window.dispatchEvent(new CustomEvent('sm-team-updated', { detail: { teamName: data?.data?.teamName, teamLogo: data?.data?.logo } }));
      alert('Saved. Refresh dashboard to see changes.');
    } catch (e) {
      // Fallback to preview if upload failed
      if (logoPreview) localStorage.setItem('teamLogo', logoPreview);
      window.dispatchEvent(new CustomEvent('sm-team-updated', { detail: { teamName, teamLogo: logoPreview } }));
      alert('Saved locally. Refresh dashboard to see changes.');
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Team</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Team Name</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Logo</label>
          <div className="flex items-center gap-2">
            <label className="inline-block px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
              Choose file
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </label>
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[12rem]">{logoLabel}</span>
          </div>
          {logoPreview && (
            <img src={logoPreview} alt="Logo preview" className="mt-2 h-16 w-16 object-cover rounded border" />
          )}
        </div>
      </div>
      <div className="mt-3">
        <button onClick={save} className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700">Save Team Settings</button>
      </div>
    </div>
  );
}

export default SettingsPage;


