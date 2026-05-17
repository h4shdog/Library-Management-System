// ============================================================
// ROLE: Student | PAGE: Borrowing History (real-time + ratings)
// Route: /student/history
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, Clock, Loader, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function StarRating({ bookId, requestId, userId, existingRating, onRated }) {
  const [rating, setRating]   = useState(existingRating || 0);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(!!existingRating);

  const handleRate = async (value) => {
    if (saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('book_ratings').upsert({
      user_id:    userId,
      book_id:    bookId,
      request_id: requestId,
      rating:     value,
    }, { onConflict: 'user_id,book_id' });

    if (!error) {
      setRating(value);
      setSaved(true);
      if (onRated) onRated(); // trigger book reload in parent
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <span className="text-[10px] text-slate-400 mr-1">
        {saved ? 'Your rating:' : 'Rate this book:'}
      </span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          disabled={saving}
          className="transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            size={14}
            className={`transition-colors ${
              star <= (hovered || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-200 fill-slate-200'
            }`}
          />
        </button>
      ))}
      {saved && rating > 0 && (
        <span className="text-[10px] text-amber-500 font-semibold ml-1">{rating}/5</span>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { user, allBooks, loadAllBooks } = useAuth();
  const [completed, setCompleted]   = useState([]);
  const [userRatings, setUserRatings] = useState({});
  const [isLoading, setIsLoading]   = useState(true);
  const channelRef = useRef(null);

  const getBook = (bookId) => allBooks.find((b) => b.id === bookId);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const fetchHistory = async () => {
      setIsLoading(true);
      const [reqRes, ratingsRes] = await Promise.all([
        supabase
          .from('requests')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['completed', 'returned'])
          .order('created_at', { ascending: false }),
        supabase
          .from('book_ratings')
          .select('book_id, rating')
          .eq('user_id', user.id),
      ]);
      if (reqRes.data) setCompleted(reqRes.data);
      if (ratingsRes.data) {
        const map = {};
        ratingsRes.data.forEach((r) => { map[r.book_id] = r.rating; });
        setUserRatings(map);
      }
      setIsLoading(false);
    };

    fetchHistory();

    // Real-time subscription
    channelRef.current = supabase
      .channel(`history:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'requests',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const isHistoryStatus = ['completed', 'returned'].includes(payload.new?.status || '');
        if (payload.eventType === 'INSERT' && isHistoryStatus) {
          setCompleted((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          if (isHistoryStatus) {
            setCompleted((prev) => {
              const exists = prev.find((r) => r.id === payload.new.id);
              if (exists) return prev.map((r) => r.id === payload.new.id ? payload.new : r);
              return [payload.new, ...prev];
            });
          } else {
            setCompleted((prev) => prev.filter((r) => r.id !== payload.new.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setCompleted((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Borrowing History</h1>
          <p className="text-sm text-slate-500 mt-1">All your past borrowing transactions</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Summary stats */}
      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Books Borrowed', value: completed.length,      color: 'text-blue-600',    bg: 'bg-blue-50',    icon: BookOpen },
            { label: 'Total Days',     value: completed.length * 14, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Clock },
            { label: 'Books Rated',    value: Object.keys(userRatings).length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Star },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="border border-slate-100 bg-white p-4 rounded-2xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
                  <Icon size={16} className={s.color} />
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      {completed.length > 0 ? (
        <div className="space-y-3">
          {completed.map((req) => {
            const book   = getBook(req.book_id);
            const isLate = req.due_date && req.return_date &&
              new Date(req.return_date) > new Date(req.due_date);

            return (
              <Card key={req.id} className="border border-slate-100 bg-white p-5 rounded-2xl">
                <div className="flex items-start gap-4">
                  <img
                    src={book?.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'}
                    alt={book?.title || 'Book'}
                    className="w-12 h-16 object-cover rounded-lg shrink-0"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{book?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">by {book?.author || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isLate && <Badge className="bg-red-100 text-red-600 border-0 text-xs">Late</Badge>}
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Returned</Badge>
                      </div>
                    </div>

                    {/* Date grid */}
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-50">
                      {[
                        { label: 'Borrowed', value: new Date(req.request_date || req.created_at).toLocaleDateString(), icon: Calendar },
                        { label: 'Due',      value: req.due_date ? new Date(req.due_date).toLocaleDateString() : 'N/A', icon: Clock },
                        { label: 'Returned', value: req.return_date ? new Date(req.return_date).toLocaleDateString() : 'N/A', icon: BookOpen },
                      ].map((d, i) => {
                        const Icon = d.icon;
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <Icon size={12} className="text-slate-300 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">{d.label}</p>
                              <p className="text-xs font-medium text-slate-700">{d.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Book type + star rating */}
                    <div className="flex items-center justify-between mt-2">
                      {book && (
                        <Badge className={`text-[10px] border-0 ${
                          book.bookType === 'ebook' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {book.bookType === 'ebook' ? 'eBook' : 'Physical'}
                        </Badge>
                      )}
                      {book && user && (
                        <StarRating
                          bookId={book.id}
                          requestId={req.id}
                          userId={user.id}
                          existingRating={userRatings[book.id]}
                          onRated={loadAllBooks}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-slate-100 bg-white p-12 rounded-2xl text-center">
          <BookOpen size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-700">No borrowing history yet</p>
          <p className="text-xs text-slate-400 mt-1">Books you return will appear here automatically</p>
        </Card>
      )}
    </div>
  );
}
