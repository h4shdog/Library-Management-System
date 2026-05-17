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
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function StaffRequestsPage() {
  const { allBooks, loadAllBooks } = useAuth();
  const [requests, setRequests]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef(null);

  const getBook = (bookId) => allBooks.find((b) => b.id === bookId);

  // ── Fetch + real-time subscription ──────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const fetchRequests = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('requests')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });
      if (data) setRequests(data);
      setIsLoading(false);
    };

    fetchRequests();

    // Real-time: new requests appear instantly
    channelRef.current = supabase
      .channel('staff-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch with profile join for the new row
          const { data } = await supabase
            .from('requests')
            .select('*, profiles(name)')
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

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ── Approve ──────────────────────────────────────────────────
  const approve = async (id) => {
    const supabase = createClient();
    const req  = requests.find((r) => r.id === id);
    const book = getBook(req?.book_id);
    const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // 1. Update request status
    const { error } = await supabase
      .from('requests')
      .update({ status: 'approved', due_date: dueDate })
      .eq('id', id);

    if (error) return;

    // 2. Decrement book availability
    if (book && book.availability > 0) {
      await supabase
        .from('books')
        .update({ availability: book.availability - 1 })
        .eq('id', book.id);
      await loadAllBooks(); // refresh allBooks in context
    }

    // 3. Send notification to student
    if (req?.user_id) {
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title:   'Request Approved',
        message: `Your ${req.type} request for "${book?.title || 'a book'}" has been approved. Please pick it up by ${new Date(dueDate).toLocaleDateString()}.`,
        type:    'success',
        read:    false,
      });
    }

    // 4. Write borrowing record
    if (req?.user_id && book) {
      // Fetch full profile for email (requests only joins name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', req.user_id)
        .single();

      await supabase.from('borrowing_records').insert({
        request_id:    id,
        user_id:       req.user_id,
        book_id:       book.id,
        book_title:    book.title,
        book_author:   book.author,
        book_isbn:     book.isbn || null,
        book_category: book.category || null,
        user_name:     profile?.name  || req.profiles?.name || 'Unknown',
        user_email:    profile?.email || '',
        borrow_type:   req.type,
        request_date:  req.request_date || today,
        approved_date: today,
        due_date:      dueDate,
        status:        'approved',
      });
    }

    // Update local state
    setRequests((r) =>
      r.map((x) => x.id === id ? { ...x, status: 'approved', due_date: dueDate } : x)
    );
  };

  // ── Reject ───────────────────────────────────────────────────
  const reject = async (id) => {
    const supabase = createClient();
    const req  = requests.find((r) => r.id === id);
    const book = getBook(req?.book_id);

    // 1. Update request status
    const { error } = await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) return;

    // 2. Send notification to student
    if (req?.user_id) {
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title:   'Request Rejected',
        message: `Your ${req.type} request for "${book?.title || 'a book'}" has been rejected. Please contact the library for more information.`,
        type:    'error',
        read:    false,
      });
    }

    setRequests((r) =>
      r.map((x) => x.id === id ? { ...x, status: 'rejected' } : x)
    );
  };

  // ── Mark as returned (completed) ─────────────────────────────
  const markReturned = async (id) => {
    const supabase = createClient();
    const req  = requests.find((r) => r.id === id);
    const book = getBook(req?.book_id);
    const returnDate = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed', return_date: returnDate })
      .eq('id', id);

    if (error) return;

    // Increment availability back
    if (book) {
      await supabase
        .from('books')
        .update({ availability: book.availability + 1 })
        .eq('id', book.id);
      await loadAllBooks();
    }

    // Notify student
    if (req?.user_id) {
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title:   'Book Returned',
        message: `"${book?.title || 'Your book'}" has been marked as returned. Thank you!`,
        type:    'info',
        read:    false,
      });
    }

    // Update borrowing record to completed + set return_date
    await supabase
      .from('borrowing_records')
      .update({ status: 'completed', return_date: returnDate })
      .eq('request_id', id);

    setRequests((r) =>
      r.map((x) => x.id === id ? { ...x, status: 'completed', return_date: returnDate } : x)
    );
  };

  const pending  = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const rejected = requests.filter((r) => r.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Request Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve borrowing requests</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  value: pending.length,  color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
          { label: 'Approved', value: approved.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
          { label: 'Rejected', value: rejected.length, color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
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

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pending ({pending.length})
          </p>
          {pending.map((req) => {
            const book = getBook(req.book_id);
            return (
              <Card key={req.id} className="border border-amber-100 bg-amber-50 p-5 rounded-2xl">
                <div className="flex items-start gap-4">
                  {book && (
                    <img
                      src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded-xl shrink-0"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{book?.title || 'Unknown Book'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">by {book?.author}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested by: <span className="font-semibold">{req.profiles?.name || 'Unknown'}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="capitalize">{req.type}</span>
                      <span>·</span>
                      <span>{new Date(req.request_date || req.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <Badge className={`text-[10px] border-0 ${
                        book?.availability > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {book ? `${book.availability} available` : 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={() => approve(req.id)}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 gap-1.5 text-xs"
                    >
                      <CheckCircle size={13} /> Approve
                    </Button>
                    <Button
                      onClick={() => reject(req.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-500 hover:bg-red-50 rounded-xl h-8 gap-1.5 text-xs"
                    >
                      <XCircle size={13} /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approved — show Mark Returned button */}
      {approved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Approved / Active ({approved.length})
          </p>
          {approved.map((req) => {
            const book = getBook(req.book_id);
            const isOverdue = req.due_date && new Date(req.due_date) < new Date();
            return (
              <Card key={req.id} className="border border-emerald-100 bg-emerald-50 p-5 rounded-2xl">
                <div className="flex items-start gap-4">
                  {book && (
                    <img
                      src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded-xl shrink-0"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{book?.title || 'Unknown Book'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">by {book?.author}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Borrowed by: <span className="font-semibold">{req.profiles?.name || 'Unknown'}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                        Due: {req.due_date ? new Date(req.due_date).toLocaleDateString() : 'N/A'}
                        {isOverdue && ' — OVERDUE'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => markReturned(req.id)}
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-xl h-8 text-xs shrink-0"
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
                {['Book', 'Requested By', 'Type', 'Status', 'Date', 'Due Date'].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-5 text-sm font-medium text-slate-800">{getBook(req.book_id)?.title || 'Unknown'}</td>
                  <td className="py-3 px-5 text-xs text-slate-500">{req.profiles?.name || '—'}</td>
                  <td className="py-3 px-5 text-xs capitalize text-slate-500">{req.type}</td>
                  <td className="py-3 px-5"><StatusBadge status={req.status} /></td>
                  <td className="py-3 px-5 text-xs text-slate-400">
                    {new Date(req.request_date || req.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-5 text-xs text-slate-400">
                    {req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
