// ============================================================
// COMPONENT: Admin — Export Modal
// Used by: app/admin/users/page.jsx, app/admin/reports/page.jsx
// Purpose: Export borrowing records + profiles as CSV, filtered by date
// ============================================================
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ── Inline toast (no external dep) ──────────────────────────
function InlineMessage({ type, message, onDismiss }) {
  if (!message) return null;
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error:   'bg-red-50   border-red-200   text-red-700',
    info:    'bg-blue-50  border-blue-200  text-blue-700',
  };
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold ${styles[type]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="opacity-50 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

export function ExportModal({ isOpen, onClose }) {
  const [exportType, setExportType]   = useState('borrowing');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [message, setMessage]         = useState(null); // { type, text }

  const clearMessage = () => setMessage(null);

  // ── Fetch data from Supabase ─────────────────────────────────
  const fetchData = async () => {
    const supabase = createClient();

    let borrowing = [];
    let profiles  = [];

    if (exportType === 'borrowing' || exportType === 'both') {
      let q = supabase
        .from('borrowing_records')
        .select('*')
        .order('request_date', { ascending: false });

      // Only apply date filter if dates are set
      if (startDate) q = q.gte('request_date', startDate);
      if (endDate)   q = q.lte('request_date', endDate);

      const { data, error } = await q;
      if (error) throw new Error(`Borrowing records: ${error.message}`);
      borrowing = data || [];
    }

    if (exportType === 'profiles' || exportType === 'both') {
      let q = supabase
        .from('profiles')
        .select('*')
        .order('join_date', { ascending: false });

      if (startDate) q = q.gte('join_date', startDate);
      if (endDate)   q = q.lte('join_date', endDate);

      const { data, error } = await q;
      if (error) throw new Error(`Profiles: ${error.message}`);
      profiles = data || [];
    }

    return { borrowing, profiles };
  };

  // ── Preview ──────────────────────────────────────────────────
  const handlePreview = async () => {
    setIsPreviewing(true);
    clearMessage();
    try {
      const { borrowing, profiles } = await fetchData();
      setPreviewCount({ borrowing: borrowing.length, profiles: profiles.length });
      const total = borrowing.length + profiles.length;
      if (total === 0) {
        setMessage({ type: 'info', text: 'No records found for the selected filters. Try removing the date range.' });
      } else {
        setMessage({ type: 'success', text: `Found ${total} record${total !== 1 ? 's' : ''} ready to export.` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsPreviewing(false);
    }
  };

  // ── Build CSV ────────────────────────────────────────────────
  const buildCSV = (borrowing, profiles) => {
    const fmt     = (v) => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '';
    let csv = '';

    if (borrowing.length > 0) {
      csv += 'BORROWING RECORDS\n';
      csv += [
        'Book Title', 'Author', 'ISBN', 'Category',
        'User Name', 'User Email',
        'Type', 'Status',
        'Request Date', 'Approved Date', 'Due Date', 'Return Date',
      ].map(fmt).join(',') + '\n';

      borrowing.forEach((r) => {
        csv += [
          fmt(r.book_title),
          fmt(r.book_author),
          fmt(r.book_isbn),
          fmt(r.book_category),
          fmt(r.user_name),
          fmt(r.user_email),
          fmt(r.borrow_type),
          fmt(r.status),
          fmt(fmtDate(r.request_date)),
          fmt(fmtDate(r.approved_date)),
          fmt(fmtDate(r.due_date)),
          fmt(fmtDate(r.return_date)),
        ].join(',') + '\n';
      });
      csv += '\n';
    }

    if (profiles.length > 0) {
      csv += 'PROFILES\n';
      csv += [
        'Name', 'Email', 'Role', 'Status',
        'Phone', 'Address', 'Join Date', 'Borrowing Limit',
      ].map(fmt).join(',') + '\n';

      profiles.forEach((p) => {
        csv += [
          fmt(p.name),
          fmt(p.email),
          fmt(p.role),
          fmt(p.status),
          fmt(p.phone),
          fmt(p.address),
          fmt(fmtDate(p.join_date)),
          fmt(p.borrowing_limit),
        ].join(',') + '\n';
      });
    }

    return csv;
  };

  // ── Export ───────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    clearMessage();
    try {
      const { borrowing, profiles } = await fetchData();

      if (borrowing.length === 0 && profiles.length === 0) {
        setMessage({ type: 'info', text: 'No records found. Try removing the date range or click Preview first.' });
        setIsExporting(false);
        return;
      }

      const csv     = buildCSV(borrowing, profiles);
      const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url     = window.URL.createObjectURL(blob);
      const link    = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href     = url;
      link.download = `library-report-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setPreviewCount(null);
    setMessage(null);
    setStartDate('');
    setEndDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Export Report</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Data Type */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Data to Export</label>
            <select
              value={exportType}
              onChange={(e) => { setExportType(e.target.value); setPreviewCount(null); clearMessage(); }}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-[#cbb0f8] outline-none"
            >
              <option value="borrowing">Borrowing Records</option>
              <option value="profiles">Profiles (Users)</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="p-4 bg-[#F3F0FF] rounded-xl border border-[#e5deff] space-y-3">
            <p className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
              Date Range
              <span className="ml-1 font-normal text-slate-400 normal-case">
                {exportType === 'profiles' ? '(by join date)' : '(by request date)'}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPreviewCount(null); clearMessage(); }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-[#cbb0f8]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPreviewCount(null); clearMessage(); }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-[#cbb0f8]"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">Leave blank to export all records</p>
          </div>

          {/* Inline message (replaces alert) */}
          <InlineMessage type={message?.type} message={message?.text} onDismiss={clearMessage} />

          {/* Preview count badge */}
          {previewCount !== null && !message && (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700">
              <span>Records ready:</span>
              <div className="flex gap-2">
                {(exportType === 'borrowing' || exportType === 'both') && (
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-lg">
                    Borrowing: {previewCount.borrowing}
                  </span>
                )}
                {(exportType === 'profiles' || exportType === 'both') && (
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-lg">
                    Profiles: {previewCount.profiles}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-slate-200 text-slate-600 font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePreview}
              disabled={isPreviewing || isExporting}
              variant="outline"
              className="border-[#cbb0f8] text-[#7C3AED] hover:bg-[#f3f0ff] font-bold rounded-xl"
            >
              {isPreviewing ? <Loader2 size={14} className="animate-spin" /> : 'Preview'}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || isPreviewing}
              className="flex-1 bg-[#7C3AED] hover:bg-[#6d28d9] text-white font-bold flex items-center justify-center gap-2 rounded-xl"
            >
              {isExporting
                ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
                : <><Download size={14} /> Export CSV</>
              }
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
