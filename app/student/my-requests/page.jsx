// ============================================================
// ROLE: Student | PAGE: My Requests (view + cancel)
// Route: /student/my-requests
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Calendar, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDueNotifications } from '@/hooks/useDueNotifications';

// Fetches a short-lived signed URL from the secure API route and opens the PDF
function OpenEbookButton({ bookId }) {
  const [loading, setLoading] = useState(false);
  const handleOpen = async () => {
    setLoading(true);
    try {
      // Get the current session token to send with the request
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res  = await fetch(`/api/ebook/${bookId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        alert(data.error || 'Could not open eBook. Please try again.');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handleOpen}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors w-fit"
    >
      {loading ? 'Opening...' : '📖 Open eBook'}
    </button>
  );
}
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FINE_PER_DAY = 5; // fallback — overridden by library_settings

const statusStyle = {
  pending:          { card: 'border-amber-100 bg-amber-50',     dot: 'bg-amber-400' },
  approved:         { card: 'border-emerald-100 bg-emerald-50', dot: 'bg-emerald-500' },
  return_requested: { card: 'border-blue-100 bg-blue-50',       dot: 'bg-blue-400' },
  completed:        { card: 'border-slate-100 bg-slate-50',     dot: 'bg-slate-400' },
  rejected:         { card: 'border-red-100 bg-red-50',         dot: 'bg-red-400' },
};

export default function MyRequestsPage() {
  const { user, allBooks } = useAuth();
  useDueNotifications(user?.id);
  const [requests, setRequests] = useState([]);
  const [confirm, setConfirm]         = useState({ isOpen: false, id: null, title: '' });
  const [returnConfirm, setReturnConfirm] = useState({ isOpen: false, id: null, title: '' });
  const [fineRate, setFineRate] = useState(FINE_PER_DAY);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('library_settings').select('value').eq('key', 'borrowing_rules').single()
      .then(({ data }) => {
        if (data?.value?.dailyFine != null) setFineRate(Number(data.value.dailyFine));
        else {
          // fallback to old daily_fine key
          supabase.from('library_settings').select('value').eq('key', 'daily_fine').single()
            .then(({ data: d }) => { if (d?.value != null) setFineRate(Number(d.value)); });
        }
      });
  }, []);

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

  // Student requests to return a physical book
  const requestReturn = async (id) => {
    const supabase = createClient();
    const req  = requests.find((r) => r.id === id);
    const book = getBook(req?.book_id);

    const { error } = await supabase
      .from('requests')
      .update({ status: 'return_requested' })
      .eq('id', id);

    if (error) {
      console.error('Return request error:', error);
      setReturnConfirm({ isOpen: false, id: null, title: '' });
      return;
    }

    // Notify all staff — fetch staff profiles
    const { data: staffProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'staff');

    if (staffProfiles?.length) {
      const notifications = staffProfiles.map((s) => ({
        user_id: s.id,
        title:   'Book Return Request',
        message: `${user?.name || 'A student'} has requested to return "${book?.title || 'a book'}". Please verify and mark it as returned.`,
        type:    'info',
        read:    false,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    setRequests((r) => r.map((x) => x.id === id ? { ...x, status: 'return_requested' } : x));
    setReturnConfirm({ isOpen: false, id: null, title: '' });
  };

  // Compute fine for a request
  const computeFine = (req) => {
    if (!req.due_date || req.type === 'ebook_access') return 0;
    if (req.fine_paid) return 0;
    const due  = new Date(req.due_date);
    const now  = new Date();
    const days = Math.floor((now - due) / 86400000);
    return days > 0 ? days * fineRate : 0;
  };

  const totalUnpaidFine = requests.reduce((sum, r) => {
    if (r.fine_paid) return sum;
    return sum + (r.fine_amount || computeFine(r));
  }, 0);

  const groups = {
    pending:          requests.filter((r) => r.status === 'pending'),
    approved:         requests.filter((r) => r.status === 'approved'),
    return_requested: requests.filter((r) => r.status === 'return_requested'),
    completed:        requests.filter((r) => r.status === 'completed'),
    rejected:         requests.filter((r) => r.status === 'rejected'),
  };

  const stats = [
    { label: 'Pending',   count: groups.pending.length,   color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Approved',  count: groups.approved.length + groups.return_requested.length,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
        const groupLabel = status === 'return_requested' ? 'Return Requested' : status;
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider capitalize">
                {groupLabel} ({items.length})
              </p>
            </div>
            <div className="space-y-2">
              {items.map((req) => {
                const book     = getBook(req.book_id);
                const fine      = req.fine_amount > 0 ? req.fine_amount : (req.status === 'approved' && req.type !== 'ebook_access' ? computeFine(req) : 0);
                const isOverdue = req.due_date && new Date(req.due_date) < new Date() && req.status === 'approved';
                const daysLeft  = req.due_date && req.status === 'approved'
                  ? Math.ceil((new Date(req.due_date) - Date.now()) / 86400000)
                  : null;
                // Show return button only for approved physical borrow/reserve requests
                const canReturn = req.status === 'approved'
                  && req.type !== 'ebook_access'
                  && req.type !== 'reserve';

                return (
                  <Card key={req.id} className={`border ${isOverdue ? 'border-red-200 bg-red-50' : style.card} p-4 rounded-2xl`}>
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

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar size={11} />
                            {new Date(req.request_date || req.created_at).toLocaleDateString()}
                          </div>

                          {/* Due date countdown — physical and ebook */}
                          {daysLeft !== null && daysLeft > 0 && (
                            <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {req.type === 'ebook_access' ? `Access expires in ${daysLeft}d` : `Due in ${daysLeft}d`}
                            </span>
                          )}

                          {/* Overdue / expired */}
                          {isOverdue && (
                            <span className="text-xs font-bold text-red-600">
                              {req.type === 'ebook_access' ? 'EXPIRED' : 'OVERDUE'}
                            </span>
                          )}

                          <Badge className="text-[10px] capitalize bg-white border border-slate-200 text-slate-500 px-1.5 py-0">
                            {req.type === 'ebook_access' ? 'eBook' : req.type}
                          </Badge>
                        </div>

                        {/* Fine display */}
                        {fine > 0 && !req.fine_paid && (
                          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-100 border border-red-200 rounded-lg w-fit">
                            <AlertTriangle size={11} className="text-red-500" />
                            <span className="text-xs font-bold text-red-700">Fine: ₱{fine.toFixed(2)}</span>
                            <span className="text-[10px] text-red-500">— settle at library counter</span>
                          </div>
                        )}
                        {fine > 0 && req.fine_paid && (
                          <div className="mt-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg w-fit">
                            <span className="text-xs font-semibold text-emerald-700">Fine paid ✓</span>
                          </div>
                        )}

                        {/* Return requested notice */}
                        {req.status === 'return_requested' && (
                          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg w-fit">
                            <RotateCcw size={11} className="text-blue-500" />
                            <span className="text-xs text-blue-700 font-medium">Return request sent — waiting for staff confirmation</span>
                          </div>
                        )}

                        {/* Open eBook button — calls secure API route */}
                        {req.type === 'ebook_access' && req.status === 'approved' && (() => {
                          const due = req.due_date ? new Date(req.due_date) : null;
                          const isExpired = due && due < new Date();
                          if (isExpired) {
                            return (
                              <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg w-fit">
                                <AlertTriangle size={11} className="text-slate-400" />
                                <span className="text-xs text-slate-500">eBook access expired ({due.toLocaleDateString()})</span>
                              </div>
                            );
                          }
                          if (book?.ebookPath || book?.ebookUrl) {
                            return (
                              <div className="mt-2 flex flex-col gap-1">
                                <OpenEbookButton bookId={req.book_id} />
                                {due && (
                                  <span className="text-[10px] text-slate-400">
                                    Access until {due.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return <p className="text-xs text-slate-400 mt-1">eBook link not available yet</p>;
                        })()}

                        {/* Return Book button */}
                        {canReturn && (
                          <button
                            onClick={() => setReturnConfirm({ isOpen: true, id: req.id, title: book?.title || 'this book' })}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <RotateCcw size={11} /> Return Book
                          </button>
                        )}
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
              onClick={() => cancelRequest(confirm.id)}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600"
            >
              Cancel Request
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Book confirm dialog */}
      <AlertDialog open={returnConfirm.isOpen} onOpenChange={(o) => !o && setReturnConfirm({ isOpen: false, id: null, title: '' })}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Return "{returnConfirm.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will notify the library staff that you are returning this book. Please bring the book to the library counter. Staff will confirm the return once they receive it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl">Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestReturn(returnConfirm.id)}
              className="flex-1 rounded-xl bg-slate-700 hover:bg-slate-800"
            >
              Yes, Return Book
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
