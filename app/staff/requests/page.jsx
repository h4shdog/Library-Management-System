// ============================================================
// ROLE: Staff | PAGE: Request Management (approve/reject)
// Route: /staff/requests
// ============================================================
'use client';

import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, PhilippinePeso, RotateCcw } from 'lucide-react';

const FINE_PER_DAY = 5; // ₱5 per day overdue — overridden by library_settings

function calcFine(dueDate, fineRate = FINE_PER_DAY) {
  if (!dueDate) return 0;
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  return days > 0 ? days * fineRate : 0;
}

export default function StaffRequestsPage() {
  const { allBooks, loadAllBooks } = useAuth();
  const [requests, setRequests]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [fineRate, setFineRate]   = useState(FINE_PER_DAY);
  const [loanDays, setLoanDays]   = useState(14);
  const channelRef = useRef(null);

  const getBook = (bookId) => allBooks.find((b) => b.id === bookId);

  // ── Fetch + real-time ────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // Load borrowing rules from settings
    supabase.from('library_settings').select('key, value')
      .in('key', ['borrowing_rules', 'daily_fine'])
      .then(({ data }) => {
        if (data) {
          const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
          if (map.borrowing_rules?.dailyFine != null) setFineRate(Number(map.borrowing_rules.dailyFine));
          else if (map.daily_fine != null) setFineRate(Number(map.daily_fine));
          if (map.borrowing_rules?.loanDays != null) setLoanDays(Number(map.borrowing_rules.loanDays));
        }
      });

    const fetchRequests = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('requests')
        .select('*, profiles(name, email)')
        .order('created_at', { ascending: false });
      if (data) setRequests(data);
      setIsLoading(false);
    };

    fetchRequests();

    channelRef.current = supabase
      .channel('staff-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase
            .from('requests')
            .select('*, profiles(name, email)')
            .eq('id', payload.new.id)
            .single();
          if (data) setRequests((prev) => [data, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setRequests((prev) =>
            prev.map((r) => r.id === payload.new.id ? { ...r, ...payload.new } : r)
          );
        } else if (payload.eventType === 'DELETE') {
          setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  // ── Approve ──────────────────────────────────────────────────
  const approve = async (id) => {
    const supabase = createClient();
    const req     = requests.find((r) => r.id === id);
    const book    = getBook(req?.book_id);
    const isEbook = req?.type === 'ebook_access';
    // Both physical books and ebooks get a due date based on loanDays
    const dueDate = new Date(Date.now() + loanDays * 86400000).toISOString().split('T')[0];
    const today   = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('requests')
      .update({ status: 'approved', due_date: dueDate })
      .eq('id', id);
    if (error) return;

    if (!isEbook && book && book.availability > 0) {
      await supabase.from('books').update({ availability: book.availability - 1 }).eq('id', book.id);
      await loadAllBooks();
    }
    if (req?.user_id) {
      const message = isEbook
        ? `Your eBook access request for "${book?.title || 'a book'}" has been approved. You can read it until ${new Date(dueDate).toLocaleDateString()}.`
        : `Your ${req.type} request for "${book?.title || 'a book'}" has been approved. Please pick it up by ${new Date(dueDate).toLocaleDateString()}.`;
      await supabase.from('notifications').insert({ user_id: req.user_id, title: 'Request Approved', message, type: 'success', read: false });
    }

    if (req?.user_id && book) {
      const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', req.user_id).single();
      await supabase.from('borrowing_records').insert({
        request_id: id, user_id: req.user_id, book_id: book.id,
        book_title: book.title, book_author: book.author, book_isbn: book.isbn || null,
        book_category: book.category || null,
        user_name: profile?.name || req.profiles?.name || 'Unknown',
        user_email: profile?.email || '',
        borrow_type: req.type, request_date: req.request_date || today,
        approved_date: today, due_date: dueDate, status: 'approved',
      });
    }

    setRequests((r) => r.map((x) => x.id === id ? { ...x, status: 'approved', due_date: dueDate } : x));
  };

  // ── Reject ───────────────────────────────────────────────────
  const reject = async (id) => {
    const supabase = createClient();
    const req  = requests.find((r) => r.id === id);
    const book = getBook(req?.book_id);

    const { error } = await supabase.from('requests').update({ status: 'rejected' }).eq('id', id);
    if (error) return;

    if (req?.user_id) {
      await supabase.from('notifications').insert({
        user_id: req.user_id, title: 'Request Rejected',
        message: `Your ${req.type} request for "${book?.title || 'a book'}" has been rejected.`,
        type: 'error', read: false,
      });
    }

    setRequests((r) => r.map((x) => x.id === id ? { ...x, status: 'rejected' } : x));
  };

  // ── Mark Returned (physical + ebook) ─────────────────────────
  const markReturned = async (id) => {
    const supabase  = createClient();
    const req       = requests.find((r) => r.id === id);
    const book      = getBook(req?.book_id);
    const returnDate = new Date().toISOString().split('T')[0];
    const isEbook   = req?.type === 'ebook_access';

    // Calculate fine for overdue physical books
    const fine = isEbook ? 0 : calcFine(req?.due_date, fineRate);

    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed', return_date: returnDate, fine_amount: fine })
      .eq('id', id);
    if (error) return;

    // Increment availability back for physical books (cap at totalCopies)
    if (!isEbook && book) {
      const newAvailability = Math.min(book.availability + 1, book.totalCopies ?? book.availability + 1);
      await supabase.from('books').update({ availability: newAvailability }).eq('id', book.id);
      await loadAllBooks();
    }

    // Notify student
    if (req?.user_id) {
      const message = fine > 0
        ? `"${book?.title || 'Your book'}" has been marked as returned. You have an outstanding fine of ₱${fine.toFixed(2)}. Please settle at the library counter.`
        : `"${book?.title || 'Your book'}" has been marked as returned. Thank you!`;
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title:   fine > 0 ? 'Book Returned — Fine Issued' : 'Book Returned',
        message,
        type:    fine > 0 ? 'warning' : 'info',
        read:    false,
      });
    }

    await supabase.from('borrowing_records')
      .update({ status: 'completed', return_date: returnDate })
      .eq('request_id', id);

    setRequests((r) =>
      r.map((x) => x.id === id ? { ...x, status: 'completed', return_date: returnDate, fine_amount: fine } : x)
    );
  };

  // ── Mark fine as paid ────────────────────────────────────────
  const markFinePaid = async (id) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('requests')
      .update({ fine_paid: true, fine_paid_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return;

    const req  = requests.find((r) => r.id === id);
    const book = getBook(req?.book_id);

    if (req?.user_id) {
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title:   'Fine Cleared',
        message: `Your fine of ₱${(req.fine_amount || 0).toFixed(2)} for "${book?.title || 'a book'}" has been marked as paid. You can now borrow books again.`,
        type:    'success',
        read:    false,
      });
    }

    setRequests((r) => r.map((x) => x.id === id ? { ...x, fine_paid: true } : x));
  };

  const pending         = requests.filter((r) => r.status === 'pending');
  const approved        = requests.filter((r) => r.status === 'approved');
  const returnRequested = requests.filter((r) => r.status === 'return_requested');
  const rejected        = requests.filter((r) => r.status === 'rejected');
  // Fines: completed requests with a recorded fine_amount
  const withFines       = requests.filter((r) => r.fine_amount > 0);
  const unpaidFines     = withFines.filter((r) => !r.fine_paid);
  // Overdue active requests (approved, not yet returned, past due date)
  const overdueActive   = requests.filter((r) =>
    (r.status === 'approved' || r.status === 'return_requested') &&
    r.type !== 'ebook_access' &&
    r.due_date && new Date(r.due_date) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Request Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve borrowing requests</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'requests' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Requests
          {(pending.length + returnRequested.length) > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'requests' ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'}`}>
              {pending.length + returnRequested.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('fines')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'fines' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Fines
          {unpaidFines.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'fines' ? 'bg-white text-red-500' : 'bg-red-500 text-white'}`}>
              {unpaidFines.length}
            </span>
          )}
        </button>
      </div>

      {/* ── REQUESTS TAB ── */}
      {activeTab === 'requests' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Pending',         value: pending.length,         color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
              { label: 'Approved',        value: approved.length,        color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
              { label: 'Return Requests', value: returnRequested.length, color: 'text-blue-600',    bg: 'bg-blue-50',    icon: RotateCcw },
              { label: 'Rejected',        value: rejected.length,        color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i} className={`border border-slate-100 ${s.bg} p-5 rounded-2xl`}>
                  <Icon size={18} className={`${s.color} mb-3`} />
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </Card>
              );
            })}
          </div>

          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending ({pending.length})</p>
              {pending.map((req) => {
                const book = getBook(req.book_id);
                return (
                  <Card key={req.id} className="border border-amber-100 bg-amber-50 p-5 rounded-2xl">
                    <div className="flex items-start gap-4">
                      {book && (
                        <img src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'} alt={book.title}
                          className="w-12 h-16 object-cover rounded-xl shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{book?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">by {book?.author}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by: <span className="font-semibold">{req.profiles?.name || 'Unknown'}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="capitalize">{req.type === 'ebook_access' ? 'eBook Access' : req.type}</span>
                          <span>·</span>
                          <span>{new Date(req.request_date || req.created_at).toLocaleDateString()}</span>
                          <span>·</span>
                          <Badge className={`text-[10px] border-0 ${book?.availability > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {book ? `${book.availability} available` : 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button onClick={() => approve(req.id)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 gap-1.5 text-xs">
                          <CheckCircle size={13} /> Approve
                        </Button>
                        <Button onClick={() => reject(req.id)} size="sm" variant="outline" className="border-red-200 text-red-500 hover:bg-red-50 rounded-xl h-8 gap-1.5 text-xs">
                          <XCircle size={13} /> Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Return Requests */}
          {returnRequested.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw size={14} className="text-blue-500" />
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Return Requests ({returnRequested.length})</p>
              </div>
              {returnRequested.map((req) => {
                const book     = getBook(req.book_id);
                const isOverdue = req.due_date && new Date(req.due_date) < new Date();
                const fine     = calcFine(req.due_date, fineRate);
                return (
                  <Card key={req.id} className="border border-blue-200 bg-blue-50 p-5 rounded-2xl">
                    <div className="flex items-start gap-4">
                      {book && (
                        <img src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'} alt={book.title}
                          className="w-12 h-16 object-cover rounded-xl shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{book?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">by {book?.author}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Returning by: <span className="font-semibold">{req.profiles?.name || 'Unknown'}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                            Due: {req.due_date ? new Date(req.due_date).toLocaleDateString() : 'N/A'}
                            {isOverdue && ` — OVERDUE`}
                          </span>
                          {fine > 0 && (
                            <span className="text-red-600 font-semibold">Fine: ₱{fine.toFixed(2)}</span>
                          )}
                        </div>
                        <p className="text-xs text-blue-600 mt-1.5 font-medium">
                          Student has requested to return this book. Verify receipt and confirm.
                        </p>
                      </div>
                      <Button
                        onClick={() => markReturned(req.id)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 gap-1.5 text-xs shrink-0"
                      >
                        <CheckCircle size={13} /> Mark Returned
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved / Active ({approved.length})</p>
              {approved.map((req) => {
                const book     = getBook(req.book_id);
                const isOverdue = req.due_date && new Date(req.due_date) < new Date();
                const isEbook  = req.type === 'ebook_access';
                const fine     = isEbook ? 0 : calcFine(req.due_date, fineRate);
                return (
                  <Card key={req.id} className={`border p-5 rounded-2xl ${isOverdue ? 'border-red-200 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
                    <div className="flex items-start gap-4">
                      {book && (
                        <img src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'} alt={book.title}
                          className="w-12 h-16 object-cover rounded-xl shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{book?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">by {book?.author}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isEbook ? 'eBook access by: ' : 'Borrowed by: '}
                          <span className="font-semibold">{req.profiles?.name || 'Unknown'}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {isEbook ? (
                            <span className={isOverdue ? 'text-red-600 font-bold' : 'text-blue-600'}>
                              <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 mr-1">eBook Access</Badge>
                              {req.due_date
                                ? isOverdue
                                  ? `Expired ${new Date(req.due_date).toLocaleDateString()}`
                                  : `Access until ${new Date(req.due_date).toLocaleDateString()}`
                                : 'No expiry set'}
                            </span>
                          ) : (
                            <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                              Due: {req.due_date ? new Date(req.due_date).toLocaleDateString() : 'N/A'}
                              {isOverdue && ` — OVERDUE (₱${fine.toFixed(2)} fine)`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => markReturned(req.id)}
                        size="sm"
                        variant="outline"
                        className={`rounded-xl h-8 text-xs shrink-0 ${isOverdue ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        Mark Returned
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pending.length === 0 && !isLoading && (
            <Card className="border border-slate-100 bg-white p-8 rounded-2xl text-center">
              <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No pending requests</p>
              <p className="text-xs text-slate-400 mt-1">All requests have been processed</p>
            </Card>
          )}

          {/* All requests table */}
          <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <p className="text-sm font-semibold text-slate-900">All Requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Book', 'Requested By', 'Type', 'Status', 'Date', 'Due Date', 'Fine'].map((h) => (
                      <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 text-sm font-medium text-slate-800">{getBook(req.book_id)?.title || 'Unknown'}</td>
                      <td className="py-3 px-5 text-xs text-slate-500">{req.profiles?.name || '—'}</td>
                      <td className="py-3 px-5 text-xs capitalize text-slate-500">{req.type === 'ebook_access' ? 'eBook' : req.type}</td>
                      <td className="py-3 px-5"><StatusBadge status={req.status} /></td>
                      <td className="py-3 px-5 text-xs text-slate-400">{new Date(req.request_date || req.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-5 text-xs text-slate-400">{req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}</td>
                      <td className="py-3 px-5 text-xs">
                        {req.fine_amount > 0 ? (
                          <span className={req.fine_paid ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            ₱{req.fine_amount.toFixed(2)} {req.fine_paid ? '(paid)' : '(unpaid)'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── FINES TAB ── */}
      {activeTab === 'fines' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="border border-red-100 bg-red-50 p-5 rounded-2xl">
              <AlertTriangle size={18} className="text-red-500 mb-3" />
              <p className="text-2xl font-bold text-red-600">{unpaidFines.length + overdueActive.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Unpaid Fines</p>
            </Card>
            <Card className="border border-amber-100 bg-amber-50 p-5 rounded-2xl">
              <AlertTriangle size={18} className="text-amber-500 mb-3" />
              <p className="text-2xl font-bold text-amber-600">{overdueActive.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Currently Overdue</p>
            </Card>
            <Card className="border border-slate-100 bg-slate-50 p-5 rounded-2xl">
              <PhilippinePeso size={18} className="text-slate-500 mb-3" />
              <p className="text-2xl font-bold text-slate-700">
                ₱{(
                  unpaidFines.reduce((s, r) => s + (r.fine_amount || 0), 0) +
                  overdueActive.reduce((s, r) => s + calcFine(r.due_date, fineRate), 0)
                ).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Total Outstanding</p>
            </Card>
          </div>

          {/* Currently overdue — not yet returned */}
          {overdueActive.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={13} /> Currently Overdue ({overdueActive.length})
              </p>
              <Card className="border border-amber-100 bg-white rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50 border-b border-amber-100">
                      <tr>
                        {['Student', 'Book', 'Due Date', 'Days Overdue', 'Accruing Fine', 'Action'].map((h) => (
                          <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overdueActive.map((req) => {
                        const book      = getBook(req.book_id);
                        const fine      = calcFine(req.due_date, fineRate);
                        const daysOver  = Math.floor((new Date() - new Date(req.due_date)) / 86400000);
                        return (
                          <tr key={req.id} className="hover:bg-amber-50 transition-colors">
                            <td className="py-3 px-5">
                              <p className="text-sm font-semibold text-slate-800">{req.profiles?.name || '—'}</p>
                              <p className="text-xs text-slate-400">{req.profiles?.email || ''}</p>
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-700">{book?.title || 'Unknown'}</td>
                            <td className="py-3 px-5 text-xs text-red-600 font-semibold">
                              {new Date(req.due_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-5">
                              <Badge className="bg-red-100 text-red-700 border-0 text-xs font-bold">
                                {daysOver} day{daysOver !== 1 ? 's' : ''}
                              </Badge>
                            </td>
                            <td className="py-3 px-5">
                              <span className="text-sm font-bold text-red-600">₱{fine.toFixed(2)}</span>
                            </td>
                            <td className="py-3 px-5">
                              <Button
                                onClick={() => markReturned(req.id)}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-7 text-xs"
                              >
                                Mark Returned
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Completed fines */}
          {withFines.length === 0 && overdueActive.length === 0 ? (
            <Card className="border border-slate-100 bg-white p-8 rounded-2xl text-center">
              <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No fines recorded</p>
              <p className="text-xs text-slate-400 mt-1">All books are returned on time</p>
            </Card>
          ) : withFines.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Returned with Fines</p>
              <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Student', 'Book', 'Due Date', 'Return Date', 'Fine', 'Status', 'Action'].map((h) => (
                          <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {withFines.map((req) => {
                        const book = getBook(req.book_id);
                        return (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-5">
                              <p className="text-sm font-semibold text-slate-800">{req.profiles?.name || '—'}</p>
                              <p className="text-xs text-slate-400">{req.profiles?.email || ''}</p>
                            </td>
                            <td className="py-3 px-5 text-sm text-slate-700">{book?.title || 'Unknown'}</td>
                            <td className="py-3 px-5 text-xs text-slate-500">
                              {req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-5 text-xs text-slate-500">
                              {req.return_date ? new Date(req.return_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-5">
                              <span className="text-sm font-bold text-red-600">₱{(req.fine_amount || 0).toFixed(2)}</span>
                            </td>
                            <td className="py-3 px-5">
                              {req.fine_paid ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Paid</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-600 border-0 text-xs">Unpaid</Badge>
                              )}
                            </td>
                            <td className="py-3 px-5">
                              {!req.fine_paid && (
                                <Button
                                  onClick={() => markFinePaid(req.id)}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-7 text-xs"
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
