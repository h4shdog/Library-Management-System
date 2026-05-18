// ============================================================
// ROLE: Admin | PAGE: System Settings
// Route: /admin/settings
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Shield, Globe, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

const DEFAULT_HOURS = {
  weekdays: { isOpen: true,  openTime: '08:00', closeTime: '20:00' },
  weekend:  { isOpen: false, openTime: '10:00', closeTime: '17:00' },
};

const DEFAULT_RULES = {
  maxBooks:    1,
  loanDays:    14,
  renewalLimit: 2,
  dailyFine:   5,
};

export default function AdminSettingsPage() {
  const [hours, setHours]             = useState(DEFAULT_HOURS);
  const [rules, setRules]             = useState(DEFAULT_RULES);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSaving, setIsSaving]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState(null); // 'success' | 'error'

  // ── Load all settings on mount ───────────────────────────────
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      const { data } = await supabase
        .from('library_settings')
        .select('key, value');

      if (data) {
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));

        // Library hours
        if (map.library_hours) {
          const saved = map.library_hours;
          if (Array.isArray(saved)) {
            const weekday = saved.find((d) => d.day === 'Monday') || {};
            const weekend = saved.find((d) => d.day === 'Saturday') || {};
            setHours({
              weekdays: { isOpen: weekday.isOpen ?? true,  openTime: weekday.openTime ?? '08:00', closeTime: weekday.closeTime ?? '20:00' },
              weekend:  { isOpen: weekend.isOpen ?? false, openTime: weekend.openTime ?? '10:00', closeTime: weekend.closeTime ?? '17:00' },
            });
          } else {
            setHours(saved);
          }
        }

        // Borrowing rules
        if (map.borrowing_rules) {
          setRules({ ...DEFAULT_RULES, ...map.borrowing_rules });
        } else {
          // Migrate old separate daily_fine key
          if (map.daily_fine != null) {
            setRules((prev) => ({ ...prev, dailyFine: Number(map.daily_fine) }));
          }
        }
      }
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

  const updateHours = (group, field, value) => {
    setHours((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
    setSaveStatus(null);
  };

  const updateRule = (field, value) => {
    setRules((prev) => ({ ...prev, [field]: value }));
    setSaveStatus(null);
  };

  // ── Save ALL settings at once ────────────────────────────────
  const saveAll = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const { error } = await supabase
        .from('library_settings')
        .upsert([
          { key: 'library_hours',   value: hours },
          { key: 'borrowing_rules', value: rules },
          { key: 'daily_fine',      value: rules.dailyFine }, // keep for backward compat
        ], { onConflict: 'key' });

      if (error) throw error;
      setSaveStatus('success');
    } catch (err) {
      console.error('Save settings error:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0FF]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-600 font-medium text-sm mt-1">Configure library rules and system behavior</p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle size={16} /> All settings saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                <AlertCircle size={16} /> Failed to save
              </span>
            )}
            <Button
              onClick={saveAll}
              disabled={isSaving || isLoading}
              className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold px-6 py-2 rounded-xl shadow-sm shadow-purple-100 transition-all active:scale-95 disabled:opacity-60"
            >
              {isSaving
                ? <><Loader2 className="mr-2 animate-spin" size={16} /> Saving…</>
                : <><Save className="mr-2" size={16} /> Save All Settings</>
              }
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">Loading settings…</span>
          </div>
        ) : (
          <div className="grid gap-6">

            {/* General Configuration */}
            <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="text-[#cbb0f8]" size={24} />
                <h2 className="text-xl font-bold text-slate-900">General Configuration</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Library Name</label>
                  <Input defaultValue="AI Library Management System" className="border-slate-200 focus:ring-[#cbb0f8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Support Email</label>
                  <Input defaultValue="admin@library.com" className="border-slate-200 focus:ring-[#cbb0f8]" />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <label className="text-sm font-bold text-slate-700">System Timezone</label>
                  <select className="w-full h-10 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#cbb0f8]">
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>Asia/Manila (Philippine Standard Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Borrowing Rules — fully controlled + saved */}
            <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="text-[#a8c1f7]" size={24} />
                <h2 className="text-xl font-bold text-slate-900">Borrowing Rules</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Max Books / User</label>
                  <Input
                    type="number" min="1"
                    value={rules.maxBooks}
                    onChange={(e) => updateRule('maxBooks', parseInt(e.target.value) || 1)}
                    className="border-slate-200 focus:ring-[#cbb0f8]"
                  />
                  <p className="text-xs text-slate-400">Active borrows allowed at once</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Loan Period (Days)</label>
                  <Input
                    type="number" min="1"
                    value={rules.loanDays}
                    onChange={(e) => updateRule('loanDays', parseInt(e.target.value) || 14)}
                    className="border-slate-200 focus:ring-[#cbb0f8]"
                  />
                  <p className="text-xs text-slate-400">Days before book is due</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Renewal Limit</label>
                  <Input
                    type="number" min="0"
                    value={rules.renewalLimit}
                    onChange={(e) => updateRule('renewalLimit', parseInt(e.target.value) || 0)}
                    className="border-slate-200 focus:ring-[#cbb0f8]"
                  />
                  <p className="text-xs text-slate-400">Max renewals per borrow</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Daily Fine (₱)</label>
                  <Input
                    type="number" min="0" step="0.50"
                    value={rules.dailyFine}
                    onChange={(e) => updateRule('dailyFine', parseFloat(e.target.value) || 0)}
                    className="border-slate-200 focus:ring-[#cbb0f8]"
                  />
                  <p className="text-xs text-slate-400">₱ charged per day overdue</p>
                </div>
              </div>
            </Card>

            {/* Library Hours */}
            <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="text-[#f7c8a8]" size={24} />
                <h2 className="text-xl font-bold text-slate-900">Library Hours</h2>
              </div>
              <div className="space-y-3">
                <div className="hidden sm:grid sm:grid-cols-[160px_80px_1fr] gap-4 px-1 pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Days</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hours</span>
                </div>
                {[
                  { key: 'weekdays', label: 'Mon – Fri' },
                  { key: 'weekend',  label: 'Sat – Sun' },
                ].map(({ key, label }) => {
                  const entry = hours[key];
                  return (
                    <div key={key} className={`grid grid-cols-1 sm:grid-cols-[160px_80px_1fr] gap-3 sm:gap-4 items-center p-4 rounded-xl transition-colors ${entry.isOpen ? 'bg-slate-50' : 'bg-slate-50/40 opacity-60'}`}>
                      <span className="text-sm font-bold text-slate-800">{label}</span>
                      <button
                        type="button"
                        onClick={() => updateHours(key, 'isOpen', !entry.isOpen)}
                        className={`inline-flex items-center justify-center w-20 h-7 rounded-full text-xs font-bold transition-colors ${entry.isOpen ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                      >
                        {entry.isOpen ? 'Open' : 'Closed'}
                      </button>
                      {entry.isOpen ? (
                        <div className="flex items-center gap-2">
                          <input type="time" value={entry.openTime}
                            onChange={(e) => updateHours(key, 'openTime', e.target.value)}
                            className="h-9 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white outline-none focus:ring-2 focus:ring-[#cbb0f8] transition" />
                          <span className="text-slate-400 text-sm font-medium">to</span>
                          <input type="time" value={entry.closeTime}
                            onChange={(e) => updateHours(key, 'closeTime', e.target.value)}
                            className="h-9 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white outline-none focus:ring-2 focus:ring-[#cbb0f8] transition" />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
