// ============================================================
// ROLE: Student | PAGE: Book Catalog (browse + search)
// Route: /student/catalog
// ============================================================
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BookCard } from '@/components/shared/BookCard';
import { BookCardSkeleton } from '@/components/shared/Skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, X, SlidersHorizontal, BookOpen, Tablet } from 'lucide-react';

const CATEGORIES = ['All', 'Fiction', 'Non-fiction', 'Sci-Fi', 'Mystery', 'Romance', 'Academic'];
const SORT_OPTIONS = [
  { value: 'title',  label: 'Title A–Z' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

export default function StudentCatalog() {
  const { allBooks } = useAuth();
  const books = allBooks.filter((b) => !b.archived);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('title');

  const filteredBooks = useMemo(() => {
    let list = [...books];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.tags || []).some((t) => t.toLowerCase().includes(q)));
    }
    if (selectedCategory !== 'All') list = list.filter((b) => b.category === selectedCategory);
    if (selectedType !== 'all') list = list.filter((b) => (b.bookType || 'physical') === selectedType);
    if (sortBy === 'title')  list.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
    return list;
  }, [searchQuery, selectedCategory, selectedType, sortBy, books]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Book Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">{books.length} books available in the library</p>
      </div>

      {/* Filters */}
      <Card className="border border-slate-100 bg-white p-5 rounded-2xl space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by title, author, or tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-slate-200 rounded-xl text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-200"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Book type filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Format:</span>
          {[
            { value: 'all',      label: 'All',      icon: null },
            { value: 'physical', label: 'Physical', icon: BookOpen },
            { value: 'ebook',    label: 'eBook',    icon: Tablet },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setSelectedType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedType === t.value
                    ? t.value === 'ebook' ? 'bg-blue-600 text-white' : t.value === 'physical' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {Icon && <Icon size={11} />}
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredBooks.length}</span> of <span className="font-semibold text-slate-700">{books.length}</span> books
        </p>
        {(searchQuery || selectedCategory !== 'All' || selectedType !== 'all') && (
          <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedType('all'); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} href={`/student/books/${book.id}`} />
          ))}
        </div>
      ) : books.length === 0 ? (
        // Still loading — show skeletons
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      ) : (
        <Card className="border border-slate-100 bg-white p-12 rounded-2xl text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm font-semibold text-slate-700">No books found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          <Button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedType('all'); }} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 rounded-lg">
            Clear Filters
          </Button>
        </Card>
      )}
    </div>
  );
}
