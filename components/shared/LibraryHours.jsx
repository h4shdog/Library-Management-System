// ============================================================
// SHARED COMPONENT: LibraryHours
// Displays the current library opening hours fetched from
// the library_settings table. Used on student + staff dashboards.
// Data shape: { weekdays: { isOpen, openTime, closeTime },
//               weekend:  { isOpen, openTime, closeTime } }
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';

const supabase = createClient();

const DEFAULT_HOURS = {
  weekdays: { isOpen: true,  openTime: '08:00', closeTime: '20:00' },
  weekend:  { isOpen: false, openTime: '10:00', closeTime: '17:00' },
};

/** Format "08:00" → "8:00 AM", "20:00" → "8:00 PM" */
function fmt(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Returns 'weekdays' or 'weekend' for today */
function todayGroup() {
  const day = new Date().getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6 ? 'weekend' : 'weekdays';
}

export function LibraryHours({ accentColor = 'text-violet-500', headerBg = 'bg-violet-50' }) {
  const [hours, setHours]     = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('library_settings')
        .select('value')
        .eq('key', 'library_hours')
        .single();
      if (!error && data?.value) {
        const saved = data.value;
        // Migrate old array format → new grouped format
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
      setLoading(false);
    }

    // Fetch immediately, then re-fetch every 30 seconds to pick up admin changes
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const activeGroup = todayGroup();

  const rows = [
    { key: 'weekdays', label: 'Mon – Fri' },
    { key: 'weekend',  label: 'Sat – Sun' },
  ];

  return (
    <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className={`flex items-center gap-2 px-5 py-4 border-b border-slate-100 ${headerBg}`}>
        <Clock size={16} className={accentColor} />
        <h2 className="text-sm font-semibold text-slate-900">Library Hours</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs font-medium">Loading…</span>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50 px-1 py-1">
          {rows.map(({ key, label }) => {
            const entry   = hours[key];
            const isToday = key === activeGroup;

            return (
              <li
                key={key}
                className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                  isToday ? 'bg-slate-50 my-0.5' : ''
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                  {label}
                  {isToday && (
                    <span className={`ml-1.5 text-[10px] font-semibold uppercase tracking-wide ${accentColor}`}>
                      Today
                    </span>
                  )}
                </span>

                {entry?.isOpen ? (
                  <span className={`text-xs ${isToday ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                    {fmt(entry.openTime)} – {fmt(entry.closeTime)}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-red-400">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
