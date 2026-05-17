// ============================================================
// ROLE: Admin | PAGE: Borrowing Records (with manual archive)
// Route: /admin/requests
// ============================================================
'use client';

import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/shared/Toast';

export default function AdminRequestsPage() {
  const [records, setRecords]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving]       = useState(null);
  const [confirm, setConfirm]           = useState({ open: false, record: null });
  const { toast, ToastContainer }       = useToast();

  // ── Fetch ────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    if (showArchived) {
      const { data } = await supabase
        .from('archived_borrowing_records')
        .select('*')
        .order('archived_at', { ascending: false });
      setRecords(data || []);
    } else {
      const { data } = await supabase
        .from('borrowing_records')
        .select('*')
        .order('created_at', { ascending: false });
      setRecords(data || []);
    }

    setIsLoading(false);
  }, [showArchived]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Stats ────────────────────────────────────────────────────
  const stats = showArchived
    ? [
        { label: 'Total Archived', value: records.length },
        { label: 'Completed',      value: records.filter((r) => r.status === 'completed').length },
        { label: 'Returned',       value: records.filter((r) => r.status === 'returned').length },
        { label: 'Auto-archived',  value: records.filter((r) => r.archive_reason === 'auto_30_days').length },
      ]
    : [
        { label: 'Total Records', value: records.length },
        { label: 'Pending',       value: records.filter((r) => r.status === 'pending').length },
        { label: 'Approved',      value: records.filter((r) => r.status === 'approved').length },
        { label: 'Completed',     value: records.filter((r) => r.status === 'completed').length },
      ];

  // ── Manual archive ───────────────────────────────────────────
  const handleArchive = async (record) => {
    setArchiving(record.id);
    const supabase = createClient();

    // 1. Insert into archived_borrowing_records
    const { error: insertError } = await supabase.from('archived_borrowing_records').insert({
      id:             record.id,
      request_id:     record.request_id,
      user_id:        record.user_id,
      book_id:        record.book_id,
      book_title:     record.book_title,
      book_author:    record.book_author,
      book_isbn:      record.book_isbn,
      book_category:  record.book_category,
      user_name:      record.user_name,
      user_email:     record.user_email,
      borrow_type:    record.borrow_type,
      request_date:   record.request_date,
      approved_date:  record.approved_date,
      due_date:       record.due_date,
      return_date:    record.return_date,
      approved_by:    record.approved_by,
      status:         record.status,
      notes:          record.notes,
      created_at:     record.created_at,
      updated_at:     record.updated_at,
      archived_at:    new Date().toISOString(),
      archive_reason: 'manual_admin',
    });

    if (insertError) {
      console.error('Archive insert error:', insertError);
      toast.error(`Archive failed: ${insertError.message}`);
      setArchiving(null);
      setConfirm({ open: false, record: null });
      return;
    }

    // 2. Delete from borrowing_records
    const { error: deleteError } = await supabase
      .from('borrowing_records')
      .delete()
      .eq('id', record.id);

    if (deleteError) {
      console.error('Archive delete error:', deleteError);
      toast.error(`Archived but failed to remove original: ${deleteError.message}`);
    } else {
      toast.success(`"${record.book_title}" archived successfully`);
    }

    // 3. Remove from local state regardless
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setArchiving(null);
    setConfirm({ open: false, record: null });
  };

  const canArchive = (record) =>
    record.status === 'completed' || record.status === 'returned';

  return (
    <>
    <div className="min-h-screen bg-[#F3F0FF]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {showArchived ? 'Archived Records' : 'Borrowing Records'}
            </h1>
            <p className="text-slate-600 font-medium text-sm mt-1">
              {showArchived
                ? 'Records archived manually or automatically after 30 days'
                : 'All active borrowing records'}
            </p>
          </div>

          {/* Toggle */}
          <Button
            onClick={() => setShowArchived((v) => !v)}
            variant="outline"
            className="flex items-center gap-2 border-[#7C3AED] text-[#7C3AED] hover:bg-[#f3f0ff] font-bold"
          >
            {showArchived ? (
              <><ArchiveRestore size={16} /> Show Active</>
            ) : (
              <><Archive size={16} /> Show Archived</>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm font-bold text-slate-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading records…</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Archive size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-semibold">
                {showArchived ? 'No archived records yet' : 'No borrowing records yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8f6ff] border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-bold text-slate-900">Book</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-900">User</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-900">Type</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-900">Status</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-900">Request Date</th>
                    {showArchived && (
                      <th className="text-left py-4 px-6 font-bold text-slate-900">Archived At</th>
                    )}
                    {!showArchived && (
                      <th className="text-left py-4 px-6 font-bold text-slate-900">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-[#fcfaff] transition-colors">
                      <td className="py-4 px-6 text-slate-800 font-bold">
                        {record.book_title || 'Unknown'}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {record.user_name || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <Badge className="text-[10px] bg-slate-100 text-slate-500 border-0 capitalize font-bold">
                          {record.borrow_type}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-bold">
                        {record.request_date
                          ? new Date(record.request_date).toLocaleDateString()
                          : new Date(record.created_at).toLocaleDateString()}
                      </td>

                      {/* Archived At column */}
                      {showArchived && (
                        <td className="py-4 px-6 text-slate-500 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span>{new Date(record.archived_at).toLocaleDateString()}</span>
                            <Badge className={`text-[10px] border-0 w-fit ${
                              record.archive_reason === 'auto_30_days'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-purple-100 text-purple-600'
                            }`}>
                              {record.archive_reason === 'auto_30_days' ? 'Auto (30d)' : 'Manual'}
                            </Badge>
                          </div>
                        </td>
                      )}

                      {/* Archive action column */}
                      {!showArchived && (
                        <td className="py-4 px-6">
                          {canArchive(record) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={archiving === record.id}
                              onClick={() => setConfirm({ open: true, record })}
                              className="flex items-center gap-1.5 border-slate-200 text-slate-500 hover:border-[#7C3AED] hover:text-[#7C3AED] hover:bg-[#f3f0ff] rounded-xl h-8 text-xs font-bold"
                            >
                              {archiving === record.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Archive size={12} />}
                              Archive
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Confirm dialog */}
      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && setConfirm({ open: false, record: null })}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this record?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{confirm.record?.book_title}"</strong> borrowed by{' '}
              <strong>{confirm.record?.user_name}</strong> will be moved to the archive.
              This is for transparency and record-keeping — it cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchive(confirm.record)}
              className="flex-1 rounded-xl bg-[#7C3AED] hover:bg-[#6d28d9] text-white"
            >
              Archive
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <ToastContainer />
    </>
  );
}
