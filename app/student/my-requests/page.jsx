// ============================================================
// ROLE: Student | PAGE: My Requests (view + cancel)
// Route: /student/my-requests
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Calendar, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusStyle = {
  pending:   { card: 'border-amber-100 bg-amber-50',   dot: 'bg-amber-400' },
  approved:  { card: 'border-emerald-100 bg-emerald-50', dot: 'bg-emerald-500' },
  completed: { card: 'border-slate-100 bg-slate-50',   dot: 'bg-slate-400' },
  rejected:  { card: 'border-red-100 bg-red-50',       dot: 'bg-red-400' },
};

export default function MyRequestsPage() {
  const { user, allBooks } = useAuth();
  const [requests, setRequests] = useState([]);
  const [confirm, setConfirm] = useState({ isOpen: false, id: null, title: '' });

  const getBook = (bookId) => allBooks.find((b) => b.id === bookId);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setRequests(data);
    };
    fetchRequests();
  }, [user?.id]);

  const cancelRequest = async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (!error) setRequests((r) => r.filter((x) => x.id !== id));
    setConfirm({ isOpen: false, id: null, title: '' });
  };

  const groups = {
    pending:   requests.filter((r) => r.status === 'pending'),
    approved:  requests.filter((r) => r.status === 'approved'),
    completed: requests.filter((r) => r.status === 'completed'),
    rejected:  requests.filter((r) => r.status === 'rejected'),
  };

  const stats = [
    { label: 'Pending',   count: groups.pending.length,   color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Approved',  count: groups.approved.length,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Completed', count: groups.completed.length, color: 'text-slate-600',   bg: 'bg-slate-50' },
    { label: 'Rejected',  count: groups.rejected.length,  color: 'text-red-600',     bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your borrowing and reservation requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className={`border border-slate-100 ${s.bg} p-4 rounded-2xl text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Request groups */}
      {Object.entries(groups).map(([status, items]) => {
        if (items.length === 0) return null;
        const style = statusStyle[status] || statusStyle.completed;
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider capitalize">
                {status} ({items.length})
              </p>
            </div>
            <div className="space-y-2">
              {items.map((req) => {
                const book = getBook(req.book_id);
                const daysLeft = req.due_date ? Math.ceil((new Date(req.due_date) - Date.now()) / 86400000) : null;
                return (
                  <Card key={req.id} className={`border ${style.card} p-4 rounded-2xl`}>
                    <div className="flex items-start gap-3">
                      {book && (
                        <img
                          src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=40&h=56&fit=crop'}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=40&h=56&fit=crop'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{book?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-slate-400">{book?.author}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar size={11} />
                            {new Date(req.request_date || req.created_at).toLocaleDateString()}
                          </div>
                          {daysLeft !== null && (
                            <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-red-500' : 'text-slate-500'}`}>
                              {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}
                            </span>
                          )}
                          <Badge className="text-[10px] capitalize bg-white border border-slate-200 text-slate-500 px-1.5 py-0">{req.type}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={req.status} />
                        {status === 'pending' && (
                          <button
                          onClick={() => setConfirm({ isOpen: true, id: req.id, title: book?.title || 'this book' })}
                            className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {requests.length === 0 && (
        <Card className="border border-slate-100 bg-white p-12 rounded-2xl text-center">
          <p className="text-sm font-semibold text-slate-700">No requests yet</p>
          <p className="text-xs text-slate-400 mt-1">Browse the catalog to borrow or reserve books</p>
        </Card>
      )}

      <AlertDialog open={confirm.isOpen} onOpenChange={(o) => !o && setConfirm({ isOpen: false, id: null, title: '' })}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your request for "{confirm.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl">Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { cancelRequest(confirm.id); }}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600"
            >
              Cancel Request
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
