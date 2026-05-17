// ============================================================
// COMPONENT: Shared — Book Card
// Used by: student catalog, student recommendations, student dashboard
// Purpose: Displays a book with cover, rating, availability
// ============================================================
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, BookOpen, Tablet } from 'lucide-react';
import Link from 'next/link';

export function BookCard({ book, href = `/student/books/${book.id}` }) {
  const isAvailable = book.availability > 0;
  const isEbook = book.bookType === 'ebook';

  return (
    <Card className="group border border-slate-100 bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
      {/* Cover */}
      <Link href={href} className="block relative overflow-hidden bg-slate-100" style={{ aspectRatio: '3/4' }}>
        <img
          src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=300&h=400&fit=crop'}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=300&h=400&fit=crop';
          }}
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <span className="text-white text-xs font-semibold px-2 py-1 rounded-full bg-slate-800/80">
              Unavailable
            </span>
          </div>
        )}
        {/* Top-left: book type badge */}
        <div className="absolute top-2 left-2">
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isEbook ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            {isEbook ? <Tablet size={9} /> : <BookOpen size={9} />}
            {isEbook ? 'eBook' : 'Physical'}
          </span>
        </div>        {/* Top-right: availability pill */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isAvailable ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
          }`}>
            {isAvailable ? `${book.availability} left` : 'Out'}
          </span>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={href}>
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="text-xs text-slate-400 mt-1 mb-3">{book.author}</p>

        <div className="mt-auto flex items-center justify-between">
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={11}
                className={i < Math.floor(book.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}
              />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">{(book.rating ?? 0).toFixed(1)}</span>
          </div>
          {/* Category */}
          <Badge className="text-[10px] bg-slate-100 text-slate-500 border-0 font-medium px-2 py-0.5">
            {book.category}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
