// ============================================================
// ROLE: Student | PAGE: Book Detail (borrow/reserve)
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
import { Star, ArrowLeft, BookOpen, Calendar, Building2, Tablet } from 'lucide-react';
import Link from 'next/link';

export default function BookDetailsPage() {
  const params = useParams();
  const bookId = params.id;
  const { user, allBooks } = useAuth();
  const book = allBooks.find((b) => b.id === bookId);
  const [action, setAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userHasRequest, setUserHasRequest] = useState(false);
  const [userApprovedEbook, setUserApprovedEbook] = useState(false);

  useEffect(() => {
    if (!user || !bookId) return;
    const supabase = createClient();
    const checkRequest = async () => {
      const { data } = await supabase
        .from('requests')
        .select('id, status, type')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .in('status', ['pending', 'approved'])
        .limit(1);
      if (data && data.length > 0) {
        setUserHasRequest(true);
        if (data[0].type === 'ebook_access' && data[0].status === 'approved') {
          setUserApprovedEbook(true);
        }
      }
    };
    checkRequest();
  }, [user?.id, bookId]);

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
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('requests').insert({
      user_id: user.id,
      book_id: book.id,
      type: actionType,
      status: 'pending',
      request_date: new Date().toISOString().split('T')[0],
    });
    if (!error) {
      setAction(actionType);
      setUserHasRequest(true);
    }
    setIsLoading(false);
  };

  const relatedBooks = allBooks
    .filter((b) => b.category === book.category && b.id !== book.id && !b.archived)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Back Button */}
        <Link href="/student/catalog" className="inline-block mb-6">
          <Button variant="ghost" className="text-[#6B8DBA] hover:bg-[#F0EEEC]">
            <ArrowLeft size={18} className="mr-2" />
            Back to Catalog
          </Button>
        </Link>

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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Cover and Details */}
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
                {/* Rating */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className={i < Math.floor(book.rating) ? 'fill-[#F4E4A6] text-[#F4E4A6]' : 'text-[#E8E3DD]'} />
                    ))}
                    <span className="text-sm font-semibold text-[#4A4A4A]">{book.rating?.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-[#9B9B9B]">({book.totalCopies} copies in library)</p>
                </div>

                {/* Availability */}
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
                      <Button
                        onClick={() => handleAction('ebook_access')}
                        disabled={userHasRequest || isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? 'Processing...' : userHasRequest ? 'Access Requested' : 'Request Access'}
                      </Button>
                      {/* Show Open eBook button if approved */}
                      {userApprovedEbook && book.ebookUrl && (
                        <a href={book.ebookUrl} target="_blank" rel="noopener noreferrer">
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            <Tablet size={15} /> Open eBook
                          </Button>
                        </a>
                      )}
                      {userHasRequest && !userApprovedEbook && (
                        <p className="text-xs text-[#9B9B9B] text-center pt-2">Waiting for staff approval</p>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleAction('borrow')}
                        disabled={book.availability === 0 || userHasRequest || isLoading}
                        className="w-full bg-[#6B8DBA] hover:bg-[#5A7BA8] text-white"
                      >
                        {isLoading ? 'Processing...' : 'Borrow Book'}
                      </Button>
                      <Button
                        onClick={() => handleAction('reserve')}
                        disabled={userHasRequest || isLoading}
                        variant="outline"
                        className="w-full border-[#E8E3DD] text-[#4A4A4A] hover:bg-[#F0EEEC]"
                      >
                        {isLoading ? 'Processing...' : 'Reserve Book'}
                      </Button>
                      {userHasRequest && (
                        <p className="text-xs text-[#9B9B9B] text-center pt-2">You already have a request for this book</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Book Information */}
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
