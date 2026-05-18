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

// Grouped schedule: weekdays share one time block, weekend shares another
const DEFAULT_HOURS = {
  weekdays: { isOpen: true,  openTime: '08:00', closeTime: '20:00' },
  weekend:  { isOpen: false, openTime: '10:00', closeTime: '17:00' },
};

export default function AdminSettingsPage() {
  const [hours, setHours]           = useState(DEFAULT_HOURS);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursStatus, setHoursStatus] = useState(null);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [dailyFine, setDailyFine]   = useState('0.50');
  const [fineSaving, setFineSaving] = useState(false);
  const [fineStatus, setFineStatus] = useState(null);

  // Load saved hours from Supabase on mount
  useEffect(() => {
    async function fetchSettings() {
      setHoursLoading(true);
      const { data: hoursData } = await supabase
        .from('library_settings')
        .select('value')
        .eq('key', 'library_hours')
        .single();

      if (hoursData?.value) {
        const saved = hoursData.value;
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

      const { data: fineData } = await supabase
        .from('library_settings')
        .select('value')
        .eq('key', 'daily_fine')
        .single();

      if (fineData?.value !== undefined && fineData?.value !== null) {
        setDailyFine(String(fineData.value));
      }

      setHoursLoading(false);
    }
    fetchSettings();
  }, []);

  const updateGroup = (group, field, value) => {
    setHours((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
    setHoursStatus(null);
  };

  const saveFine = async () => {
    setFineSaving(true);
    setFineStatus(null);
    try {
      const { error } = await supabase
        .from('library_settings')
        .upsert({ key: 'daily_fine', value: parseFloat(dailyFine) || 0 }, { onConflict: 'key' });
      if (error) throw error;
      setFineStatus('success');
    } catch {
      setFineStatus('error');
    } finally {
      setFineSaving(false);
      setTimeout(() => setFineStatus(null), 3000);
    }
  };

  const saveHours = async () => {
    setHoursSaving(true);
    setHoursStatus(null);
    try {
      const { error } = await supabase
        .from('library_settings')
        .upsert({ key: 'library_hours', value: hours }, { onConflict: 'key' });

      if (error) {
        console.error('Save hours error:', error);
        throw error;
      }
      setHoursStatus('success');
    } catch (err) {
      console.error('Failed to save hours:', err);
      setHoursStatus('error');
    } finally {
      setHoursSaving(false);
      setTimeout(() => setHoursStatus(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0FF]">
      {/* Container matches User/Catalog padding and spans full width */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Header - Consistent text-3xl size */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-600 font-medium text-sm mt-1">
            Configure library rules and system behavior
          </p>
        </div>

        <div className="grid gap-6">
          {/* General Configuration - 3 columns to fill the horizontal gap */}
          <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="text-[#cbb0f8]" size={24} />
              <h2 className="text-xl font-bold text-slate-900">General Configuration</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Library Name</label>
                <Input 
                  defaultValue="AI Library Management System" 
                  className="border-slate-200 focus:ring-[#cbb0f8]" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Support Email</label>
                <Input 
                  defaultValue="admin@library.com" 
                  className="border-slate-200 focus:ring-[#cbb0f8]" 
                />
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="text-sm font-bold text-slate-700">System Timezone</label>
                <select className="w-full h-10 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#cbb0f8]">
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>EST (Eastern Standard Time)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Borrowing Rules - 4 columns to fill the horizontal gap */}
          <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="text-[#a8c1f7]" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Borrowing Rules</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Max Books/User</label>
                <Input type="number" defaultValue="1" className="border-slate-200 focus:ring-[#cbb0f8]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Loan Period (Days)</label>
                <Input type="number" defaultValue="14" className="border-slate-200 focus:ring-[#cbb0f8]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Renewal Limit</label>
                <Input type="number" defaultValue="2" className="border-slate-200 focus:ring-[#cbb0f8]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Daily Fine (₱)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={dailyFine}
                    onChange={(e) => { setDailyFine(e.target.value); setFineStatus(null); }}
                    className="border-slate-200 focus:ring-[#cbb0f8]"
                  />
                  <Button
                    onClick={saveFine}
                    disabled={fineSaving}
                    className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold px-3 rounded-xl shrink-0"
                  >
                    {fineSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </Button>
                </div>
                {fineStatus === 'success' && <p className="text-xs text-emerald-600 font-semibold">Saved ✓</p>}
                {fineStatus === 'error'   && <p className="text-xs text-red-500 font-semibold">Failed to save</p>}
                <p className="text-xs text-slate-400">Applied per day overdue on physical books</p>
              </div>
            </div>
          </Card>

          {/* Library Hours */}
          <Card className="p-6 border-slate-200 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="text-[#f7c8a8]" size={24} />
                <h2 className="text-xl font-bold text-slate-900">Library Hours</h2>
              </div>
              <div className="flex items-center gap-3">
                {hoursStatus === 'success' && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle size={16} /> Saved
                  </span>
                )}
                {hoursStatus === 'error' && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                    <AlertCircle size={16} /> Failed to save
                  </span>
                )}
                <Button
                  onClick={saveHours}
                  disabled={hoursSaving || hoursLoading}
                  className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold px-5 py-2 rounded-xl shadow-sm shadow-purple-100 transition-all active:scale-95 disabled:opacity-60"
                >
                  {hoursSaving ? (
                    <><Loader2 className="mr-2 animate-spin" size={16} /> Saving…</>
                  ) : (
                    <><Save className="mr-2" size={16} /> Save Hours</>
                  )}
                </Button>
              </div>
            </div>

            {hoursLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium">Loading hours…</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Column headers */}
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
                    <div
                      key={key}
                      className={`grid grid-cols-1 sm:grid-cols-[160px_80px_1fr] gap-3 sm:gap-4 items-center p-4 rounded-xl transition-colors ${
                        entry.isOpen ? 'bg-slate-50' : 'bg-slate-50/40 opacity-60'
                      }`}
                    >
                      {/* Day range label */}
                      <span className="text-sm font-bold text-slate-800">{label}</span>

                      {/* Open / Closed toggle */}
                      <button
                        type="button"
                        onClick={() => updateGroup(key, 'isOpen', !entry.isOpen)}
                        className={`inline-flex items-center justify-center w-20 h-7 rounded-full text-xs font-bold transition-colors ${
                          entry.isOpen
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {entry.isOpen ? 'Open' : 'Closed'}
                      </button>

                      {/* Time inputs */}
                      {entry.isOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={entry.openTime}
                            onChange={(e) => updateGroup(key, 'openTime', e.target.value)}
                            className="h-9 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white outline-none focus:ring-2 focus:ring-[#cbb0f8] transition"
                          />
                          <span className="text-slate-400 text-sm font-medium">to</span>
                          <input
                            type="time"
                            value={entry.closeTime}
                            onChange={(e) => updateGroup(key, 'closeTime', e.target.value)}
                            className="h-9 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white outline-none focus:ring-2 focus:ring-[#cbb0f8] transition"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Save Button at the bottom */}
          <div className="flex justify-end pt-2">
            <Button className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold px-10 py-6 rounded-2xl shadow-lg shadow-purple-100 transition-all active:scale-95">
              <Save className="mr-2" size={20} />
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}