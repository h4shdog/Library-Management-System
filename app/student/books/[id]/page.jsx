// ============================================================
// ROLE: Student | PAGE: Book Detail (borrow/reserve/ebook)
// Route: /student/books/[id]
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowLeft, BookOpen, Calendar, Building2, Tablet, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function BookDetailsPage() {
  const params = useParams();
  const bookId = params.id;
  const { user, allBooks } = useAuth();
  const book = allBooks.find((b) => b.id === bookId);
  const [action, setAction]                   = useState(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [userHasRequest, setUserHasRequest]   = useState(false);
  const [userApprovedEbook, setUserApprovedEbook] = useState(false);
  const [ebookDueDate, setEbookDueDate]       = useState(null);
  const [blockReason, setBlockReason]         = useState(null);
  const [unpaidFine, setUnpaidFine]           = useState(0);
  const [maxBooks, setMaxBooks]               = useState(1);

  // Load borrowing rules
  useEffect(() => {
    const supabase = createClient();
    supabase.from('library_settings').select('value').eq('key', 'borrowing_rules').single()
      .then(({ data }) => { if (data?.value?.maxBooks != null) setMaxBooks(Number(data.value.maxBooks)); });
  }, []);

  useEffect(() => {
    if (!user || !bookId) return;
    const supabase = createClient();

    const checkEligibility = async () => {
      // 1. Check for this specific book request
      const { data: existing } = await supabase
        .from('requests')
        .select('id, status, type, due_date')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .in('status', ['pending', 'approved'])
        .limit(1);

      if (existing && existing.length > 0) {
        const ebookReq = existing[0];
        if (ebookReq.type === 'ebook_access' && ebookReq.status === 'approved') {
          const due = ebookReq.due_date ? new Date(ebookReq.due_date) : null;
          const isExpired = due && due < new Date();
          if (isExpired) {
            // Access expired — don't block a new request
            setUserHasRequest(false);
          } else {
            setUserHasRequest(true);
            setUserApprovedEbook(true);
            setEbookDueDate(due);
          }
        } else {
          setUserHasRequest(true);
        }
      }

      // 2. Check for unpaid fines
      const { data: fineRows } = await supabase
        .from('requests')
        .select('fine_amount')
        .eq('user_id', user.id)
        .eq('fine_paid', false)
        .gt('fine_amount', 0);

      const totalFine = (fineRows || []).reduce((sum, r) => sum + (r.fine_amount || 0), 0);
      setUnpaidFine(totalFine);
      if (totalFine > 0) { setBlockReason('fine'); return; }

      // 3. Check borrowing limit from settings
      const { data: activeReqs } = await supabase
        .from('requests')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .neq('type', 'ebook_access');

      if ((activeReqs || []).length >= maxBooks && book?.bookType !== 'ebook') {
        setBlockReason('limit');
      }
    };

    checkEligibility();
  }, [user?.id, bookId, book?.bookType, maxBooks]);

  if (!book) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center p-4">
        <Card className="border-[#E8E3DD] bg-white p-8 max-w-md text-center space-y-4">
          <p className="text-lg text-[#4A4A4A] font-semibold">Book not found</p>
          <p className="text-[#9B9B9B]">The book you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/student/catalog">
            <Button className="bg-[#6B8DBA] hover:bg-[#5A7BA8] text-white w-full">Back to Catalog</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleAction = async (actionType) => {
    if (!user) return;
    if (blockReason === 'fine') return;
    if (blockReason === 'limit' && actionType !== 'ebook_access') return;

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('requests').insert({
      user_id:      user.id,
      book_id:      book.id,
      type:         actionType,
      status:       'pending',
      request_date: new Date().toISOString().split('T')[0],
    });
    if (!error) {
      setAction(actionType);
      setUserHasRequest(true);
    } else {
      console.error('Request insert error:', error);
      alert(`Failed to submit request: ${error.message}`);
    }
    setIsLoading(false);
  };

  const relatedBooks = allBooks
    .filter((b) => b.category === book.category && b.id !== book.id && !b.archived)
    .slice(0, 2);

  const isBlocked = blockReason !== null;

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="p-4 sm:p-6 lg:p-8">
        <Link href="/student/catalog" className="inline-block mb-6">
          <Button variant="ghost" className="text-[#6B8DBA] hover:bg-[#F0EEEC]">
            <ArrowLeft size={18} className="mr-2" /> Back to Catalog
          </Button>
        </Link>

        {/* Fine warning banner */}
        {blockReason === 'fine' && (
          <Card className="border-red-200 bg-red-50 p-4 mb-6 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Unpaid Fine — Borrowing Blocked</p>
              <p className="text-sm text-red-600 mt-0.5">
                You have an outstanding fine of <strong>₱{unpaidFine.toFixed(2)}</strong>. Please settle your payment at the library counter before borrowing or requesting books.
              </p>
            </div>
          </Card>
        )}

        {/* Limit warning banner */}
        {blockReason === 'limit' && (
          <Card className="border-amber-200 bg-amber-50 p-4 mb-6 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-700">Borrowing Limit Reached</p>
              <p className="text-sm text-amber-600 mt-0.5">
                You already have an active borrow or reservation. Please return or complete your current book before requesting another.
              </p>
            </div>
          </Card>
        )}

        {/* Success Message */}
        {action && (
          <Card className="border-[#A8D5BA] bg-[#F0FFF4] p-4 mb-6 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#A8D5BA] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">✓</div>
            <div>
              <p className="font-semibold text-[#4A6D55]">Request Submitted</p>
              <p className="text-sm text-[#7BA99D]">
                {action === 'ebook_access'
                  ? `Your access request for "${book.title}" has been submitted. You'll be notified once approved.`
                  : `Your ${action} request for "${book.title}" has been submitted. Check your notifications for updates.`}
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="border-[#E8E3DD] bg-white overflow-hidden sticky top-24">
              <div className="aspect-video bg-[#F0EEEC]">
                <img
                  src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=300&h=400&fit=crop'}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=300&h=400&fit=crop'; }}
                />
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className={i < Math.floor(book.rating) ? 'fill-[#F4E4A6] text-[#F4E4A6]' : 'text-[#E8E3DD]'} />
                    ))}
                    <span className="text-sm font-semibold text-[#4A4A4A]">{book.rating?.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-[#9B9B9B]">({book.totalCopies} copies in library)</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#4A4A4A]">Availability</p>
                  <Badge className={`w-full text-center justify-center py-2 ${book.availability > 0 ? 'bg-[#A8D5BA] text-white border-[#A8D5BA]' : 'bg-[#E8A8A8] text-white border-[#E8A8A8]'}`}>
                    {book.availability > 0 ? `${book.availability} Available` : 'Not Available'}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t border-[#E8E3DD]">
                  {book.bookType === 'ebook' ? (
                    <>
                      {/* Only show request button if user doesn't have an active/approved request */}
                      {!userHasRequest && (
                        <Button
                          onClick={() => handleAction('ebook_access')}
                          disabled={isLoading || blockReason === 'fine'}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                          {isLoading ? 'Processing...' : 'Request Access'}
                        </Button>
                      )}
                      {userApprovedEbook && book.ebookUrl && (
                        <>
                          <a href={book.ebookUrl} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                              <Tablet size={15} /> Open eBook
                            </Button>
                          </a>
                          {ebookDueDate && (
                            <p className="text-xs text-slate-500 text-center">
                              Access expires: {ebookDueDate.toLocaleDateString()}
                            </p>
                          )}
                        </>
                      )}
                      {userApprovedEbook && !book.ebookUrl && (
                        <p className="text-xs text-slate-400 text-center pt-2">eBook link not available yet</p>
                      )}
                      {userHasRequest && !userApprovedEbook && (
                        <p className="text-xs text-[#9B9B9B] text-center pt-2">Waiting for staff approval</p>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleAction('borrow')}
                        disabled={book.availability === 0 || userHasRequest || isLoading || isBlocked}
                        className="w-full bg-[#6B8DBA] hover:bg-[#5A7BA8] text-white disabled:opacity-50"
                      >
                        {isLoading ? 'Processing...' : book.availability === 0 ? 'Not Available' : 'Borrow Book'}
                      </Button>
                      <Button
                        onClick={() => handleAction('reserve')}
                        disabled={book.availability > 0 || userHasRequest || isLoading || isBlocked}
                        variant="outline"
                        className="w-full border-[#E8E3DD] text-[#4A4A4A] hover:bg-[#F0EEEC] disabled:opacity-50"
                      >
                        {isLoading ? 'Processing...' : 'Reserve Book'}
                      </Button>
                      {book.availability > 0 && (
                        <p className="text-xs text-slate-400 text-center">Reserve is for when no copies are available</p>
                      )}
                      {userHasRequest && !isBlocked && (
                        <p className="text-xs text-[#9B9B9B] text-center pt-2">You already have a request for this book</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-[#E8E3DD] bg-white p-6 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-[#4A4A4A] mb-2">{book.title}</h1>
                <p className="text-lg text-[#9B9B9B]">by {book.author}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-[#F0EEEC] text-[#4A4A4A]">{book.category}</Badge>
                <Badge className={book.bookType === 'ebook' ? 'bg-blue-100 text-blue-700 border-0 flex items-center gap-1' : 'bg-amber-100 text-amber-700 border-0 flex items-center gap-1'}>
                  {book.bookType === 'ebook' ? <><Tablet size={12} /> eBook</> : <><BookOpen size={12} /> Physical Book</>}
                </Badge>
                {(book.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline" className="border-[#E8E3DD] text-[#9B9B9B]">{tag}</Badge>
                ))}
              </div>
            </Card>

            <Card className="border-[#E8E3DD] bg-white p-6 space-y-4">
              <h2 className="text-xl font-semibold text-[#4A4A4A]">Description</h2>
              <p className="text-[#4A4A4A] leading-relaxed">{book.description}</p>
            </Card>

            <Card className="border-[#E8E3DD] bg-white p-6 space-y-4">
              <h2 className="text-xl font-semibold text-[#4A4A4A]">Publication Details</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-[#6B8DBA] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#4A4A4A]">Published</p>
                    <p className="text-sm text-[#9B9B9B]">{book.publicationDate ? new Date(book.publicationDate).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 size={18} className="text-[#7BA99D] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#4A4A4A]">Publisher</p>
                    <p className="text-sm text-[#9B9B9B]">{book.publisher}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen size={18} className="text-[#E8C4A8] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#4A4A4A]">ISBN</p>
                    <p className="text-sm text-[#9B9B9B]">{book.isbn}</p>
                  </div>
                </div>
              </div>
            </Card>

            {relatedBooks.length > 0 && (
              <Card className="border-[#E8E3DD] bg-white p-6 space-y-4">
                <h2 className="text-xl font-semibold text-[#4A4A4A]">More from this category</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedBooks.map((relatedBook) => (
                    <Link key={relatedBook.id} href={`/student/books/${relatedBook.id}`} className="flex gap-3 p-3 bg-[#F8F7F5] rounded-lg hover:bg-[#F0EEEC] transition-colors">
                      <img
                        src={relatedBook.cover}
                        alt={relatedBook.title}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=48&h=64&fit=crop'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#4A4A4A] line-clamp-2">{relatedBook.title}</p>
                        <p className="text-xs text-[#9B9B9B]">{relatedBook.author}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
